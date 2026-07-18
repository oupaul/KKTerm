# Portable Mode Plan

Status: **Proposed** (planning document — no implementation yet).

This document plans a portable distribution of KKTerm: a ZIP the user unpacks
anywhere (USB stick, network share, a plain folder) that runs without an
installer, keeps *all* of its state next to the executable, leaves no trace in
`%APPDATA%` / the registry, and can coexist with a normally installed KKTerm on
the same machine.

Windows is the primary target (portable apps are chiefly a Windows
expectation; the NSIS installer is the current Windows channel). macOS and
Linux notes are at the end — Linux AppImage is already "portable-ish" and can
adopt the same marker convention later.

---

## 1. Current state (what the plan has to change)

Where installed KKTerm keeps state today:

| State | Location today | Portable-relevant code |
| --- | --- | --- |
| SQLite DB (`kkterm.sqlite3`), incl. encrypted secret store | `app_data_dir()` = `%APPDATA%\com.kkterm.app` | `lib.rs` setup (`db_path`) |
| Backgrounds, fonts, assistant-skills, copilot workdir, MCP bridge info | `app_data_dir()` | `ai.rs`, `assistant_skills.rs`, `mcp_bridge.rs`, `media.rs`, `ssh.rs`, `sessions.rs`, `diagnostics.rs`, `webview.rs` |
| Update downloads | `app_cache_dir()/updates` | `app_updates.rs` |
| WebView2 profile (localStorage: language, UI state, update-check timestamp; overlay browser partitions) | Tauri default (`%LOCALAPPDATA%\com.kkterm.app\EBWebView`); overlay webviews use per-proxy `data_directory` under `app_data_dir()` | `webview.rs:825` |
| Secrets | OS keychain (`com.kkterm.app` service) **or** the already-shipped encrypted SQLite secret store ("file" store, master password) | `secrets.rs`, `secrets/sqlite_store.rs` |
| Auto-start | HKCU `Run` registry key | `auto_start.rs` |
| Installer detection cache | HKCU `Software\Ryan Tsai\KKTerm\InstallerDetectionCache` | `installer/` |
| Install Helper managed apps | `%LOCALAPPDATA%\KKTerm\installer\apps` | `installer/managed_app.rs` |
| CLI → app bridge discovery | Hardcoded `%APPDATA%\com.kkterm.app\mcp-bridge.json` | `bin/kkterm-cli.rs` |
| App updates (Windows) | Downloads `kkterm-{v}-windows-{arch}-setup.exe` + `.sha256` from GitHub / Cloudflare mirror, verifies, PowerShell handoff runs NSIS after exit | `app_updates.rs` |

Two existing features do a lot of the heavy lifting and should be reused, not
reinvented:

- The **encrypted SQLite secret store** (master password, lives inside
  `kkterm.sqlite3`) is already a fully portable credential backend.
- The **selective export/import `.kkbackup` bundles** (ADR 0010) are already
  the right migration vehicle between installed and portable instances.

---

## 2. Distribution format and on-disk layout

New Windows release asset per arch, alongside the setup exe:

```
kkterm-{version}-windows-x64-portable.zip        (+ .sha256)
kkterm-{version}-windows-arm64-portable.zip      (+ .sha256)
```

ZIP contents / resulting folder layout:

```
KKTerm/
  KKTerm.exe                 same signed binary as the installed build
  kkterm-cli.exe             CLI sidecar
  kkterm-portable.marker     empty file; THE portable-mode switch
  resources/                 bundled Tauri resources (manual/, assistant-skills/, …)
  data/                      created on first run — everything lives here
    kkterm.sqlite3
    backgrounds/  fonts/  assistant-skills/  copilot/
    cache/                   update downloads, favicon cache
    logs/
    webview/                 WebView2 user data folder (localStorage, overlay partitions)
    backups/                 startup/manual .kkbackup ZIPs
```

Design rules:

- **One binary, two modes.** No separate portable build; mode is decided at
  runtime (section 3). This keeps CI, signing, and the update matrix sane.
- **`data/` is the only mutable location.** The app directory itself is only
  touched by updates. This makes "back up the stick" = "copy the folder", and
  lets updates replace binaries without touching user state.
- The marker ships inside the ZIP, so extraction alone activates portable
  mode — no flags, no first-run choice dialog.

---

## 3. Launch-time detection (backend)

### Detection order

1. `KKTERM_PORTABLE=0|1` environment variable — explicit override for dev and
   troubleshooting.
2. `kkterm-portable.marker` file in the executable's directory → portable.
3. Otherwise → installed mode (today's behavior, byte-for-byte unchanged).

The NSIS installer must never ship the marker, so an installed copy can never
accidentally flip modes.

### Writability guard

Portable mode requires `exe_dir/data` to be creatable/writable. On failure
(Program Files, read-only media, locked-down share): show a native error
dialog explaining the problem and exit — do **not** silently fall back to
`%APPDATA%`, which would split the user's data across two roots. The dialog
copy suggests moving the folder somewhere writable.

### `AppPaths` abstraction — the core refactor

Introduce one backend module (e.g. `src-tauri/src/app_paths.rs`) resolved once
in `main()` before the Tauri builder runs:

```rust
pub struct AppPaths {
    pub mode: AppMode,          // Installed | Portable
    pub data_dir: PathBuf,      // installed: app_data_dir(); portable: exe_dir/data
    pub cache_dir: PathBuf,     // installed: app_cache_dir(); portable: data/cache
    pub logs_dir: PathBuf,
    pub webview_data_dir: PathBuf,
}
```

Then sweep every `app.path().app_data_dir()` / `app_cache_dir()` call site
(`lib.rs`, `ai.rs`, `mcp_bridge.rs`, `media.rs`, `ssh.rs`, `sessions.rs`,
`assistant_skills.rs`, `diagnostics.rs`, `webview.rs`, `app_updates.rs`,
`ai/cli_backend.rs`, `ai/openai_provider.rs`) to go through managed
`AppPaths` state instead. This sweep is the bulk of Phase 1 and is valuable
on its own (single choke point for all durable paths).

Specific integration points:

- **WebView2 profile**: set the user data folder to `AppPaths.webview_data_dir`
  before any webview is created (`WEBVIEW2_USER_DATA_FOLDER` env var set in
  `main()` is the reliable Tauri v2 route). This makes localStorage — active
  locale, durable UI state, last-update-check — travel with the stick with
  zero frontend changes. Overlay URL-Connection webviews already derive their
  per-proxy `data_directory` from the app data dir, so they follow the sweep
  automatically.
- **Asset protocol scope**: `tauri.conf.json` scopes `$APPDATA/backgrounds`
  and `$APPDATA/fonts`, which won't match the portable root. At setup, when
  portable, extend the asset scope at runtime to allow
  `data/backgrounds/**` and `data/fonts/**` (Tauri v2 runtime scope API).
- **Single instance**: the plugin keys on the app identifier, so an installed
  copy and a portable copy (or two different sticks) would block each other.
  Scope the single-instance key by a short hash of the canonical data root so
  each *root* is single-instanced independently.
- **MCP bridge / CLI**: pipe names are already per-run random tokens, so no
  collision. What must change is discovery: the bridge info file moves into
  `AppPaths.data_dir`, and `kkterm-cli` gains a lookup order of
  (1) `../data/mcp-bridge.json` relative to its own exe (portable layout),
  (2) the current `%APPDATA%` path. Each CLI thereby finds *its own* app when
  both instances run simultaneously.
- **SQLite on removable media**: keep the existing journal mode but ensure a
  clean WAL checkpoint + close on exit so yanking the stick after quit is
  safe. (Already largely true; verify during Phase 1 testing.)

### Registry and machine-state gating

In portable mode:

- **Auto-start** (HKCU Run): command becomes a no-op returning a typed
  "unsupported in portable mode" error; the Settings toggle is hidden
  (section 6). A registry Run entry pointing at a removable drive is exactly
  the trace portable mode promises not to leave.
- **Installer detection cache** (HKCU): skip the registry cache; fall back to
  an in-memory (per-run) cache. Detection gets marginally slower, correctness
  unchanged.
- **Install Helper managed apps** (`%LOCALAPPDATA%\KKTerm\installer\apps`):
  *stays machine-local by design.* The Install Helper installs machine tools
  (Node, Docker, n8n, …) — those are host state, not user data, and cannot
  meaningfully live on a stick. The Install Helper UI in portable mode gets a
  small caption noting installs apply to the current machine.
- **File associations / protocol handlers / shortcuts**: none are registered
  at runtime today (installer-only) — keep it that way; nothing to do.
- **WebView2 runtime**: the ZIP has no `downloadBootstrapper`. On startup, if
  the Evergreen runtime is missing, show a native dialog linking to
  Microsoft's WebView2 download instead of Tauri's raw failure. (Shipping a
  fixed-version runtime ≈ +150 MB — rejected for v1.)

---

## 4. Updates in portable mode

The installed-Windows flow (download NSIS exe → verify sha256 → PowerShell
handoff after exit) is the template; portable branches inside the same
`app_updates.rs` machinery:

1. **Asset selection**: portable mode requests
   `kkterm-{v}-windows-{arch}-portable.zip` (+ `.sha256`) from the same two
   trusted sources (GitHub Releases, `kkterm.ryantsai.com` mirror) with the
   same URL validation and fallback order. `validate_update_request` becomes
   mode-aware — a portable instance must *never* accept/spawn a `-setup.exe`
   (which would silently create an installed copy), and vice versa.
2. **Download + verify** into `data/cache/updates/` exactly as today
   (progress events, cancellation, checksum).
3. **Extract** to `data/cache/updates/staged-{v}/` and sanity-check the staged
   tree (contains `KKTerm.exe`, version resource matches).
4. **Swap via handoff**: a running exe can't overwrite itself on Windows, so
   reuse the existing PowerShell handoff pattern: wait for app exit → copy
   staged binaries + `resources/` over the app dir (**never touching `data/`
   or the marker**) → relaunch `KKTerm.exe` → clean the staging dir. Keep the
   previous exe as `KKTerm.exe.bak` for one generation as a manual rollback.
5. **Failure modes**: locked files (second instance from the same folder) →
   handoff retries briefly then leaves the staged dir in place; next launch
   detects a completed download and offers "retry update".

Update *checks* (frontend, `lastUpdateCheck` in localStorage) are unchanged —
the WebView2 profile now lives in `data/`, so the cadence travels too.

Fallback for v1 if the swap handoff slips: portable update = download +
verify + open the folder with a "close KKTerm and extract over the old
folder" instruction. Acceptable, but the handoff is strongly preferred and
is mostly code reuse.

---

## 5. Credentials and secrets

The OS keychain is machine- and user-bound — secrets stored there do not
travel and would silently "disappear" when the stick moves to another PC.
KKTerm already has the right portable backend: the **encrypted SQLite secret
store** inside `kkterm.sqlite3` (master password, presence checks without
unlock, lock/unlock lifecycle — all shipped).

Plan:

- **Portable default**: first run in portable mode defaults
  `credential_settings.secret_store` to `"file"` and runs a small onboarding
  step (section 6) to create the master password, reusing the existing
  configure/unlock dialogs.
- **Explicit opt-out**: the user may still pick the OS keychain in portable
  mode, but the Settings copy warns that those secrets stay on the current
  machine. (Owner IDs are per-DB UUIDs, so sharing the `com.kkterm.app`
  keychain service with an installed instance cannot collide.)
- **No password material near the stick**: documentation and UI must never
  suggest putting `KKTERM_SECRET_STORE_PASSWORD` in a launcher script beside
  the exe — that defeats the encryption. The existing Settings warning copy
  already covers this; the manual chapter repeats it for portable.
- **Threat model honesty**: on a lost stick, secrets are covered by the
  encrypted store; *non-secret* data (hostnames, usernames, notes, IT Ops
  inventory) is plaintext SQLite. Document this clearly. Full-database
  encryption (SQLCipher-style) is explicitly out of scope for v1 and tracked
  as a possible follow-up.
- **Migration installed ⇄ portable**: no new mechanism. The `.kkbackup`
  selective export/import (ADR 0010) already carries segments plus the
  encrypted secrets blob where applicable. Add one UX affordance: portable
  first-run offers "Import from a KKTerm backup" so the
  installed → portable move is one export + one import.

---

## 6. Frontend UI/UX

All new strings go through i18n per the repo rules (`en.json` first, one
pending file per key under `docs/localization_todo/`).

- **Mode surface**: a new `get_app_mode` command exposes
  `{ mode, dataDir }`. Settings → About shows a "Portable" badge, the data
  folder path, and an "Open data folder" button. The title bar and the rest
  of the chrome stay identical — portable is not a different product.
- **First-run portable onboarding** (one dialog, not a wizard):
  1. "KKTerm is running in portable mode — everything stays in this folder."
  2. Master-password creation for the encrypted secret store (reuses the
     existing encrypted-store configure dialog), with "use this computer's
     keychain instead" as the escape hatch (plus the non-portability warning).
  3. Optional "Import from backup (.kkbackup)" shortcut.
- **Settings deltas in portable mode**:
  - General → auto-start toggle hidden.
  - Credentials → "file" store shown as recommended; OS store carries the
    machine-bound warning.
  - About/Update → update panel says "Portable ZIP update", shows staged
    version + "Restart to update", and the rollback hint after an update.
  - Install Helper → caption that installs are machine-local.
- **Update flow UX**: reuse the existing download-progress UI; only the copy
  and the final action ("Restart to update" instead of "Install") differ.
- **Manual**: extend `docs/manual/17-data-backup-secrets.md` (data location
  table gains the portable column) and `docs/manual/15-settings.md`
  (mode badge, hidden auto-start); reference i18n keys, not English labels.

---

## 7. Coexistence: installed + portable on the same machine

Guaranteed by construction, verified by tests:

| Concern | Resolution |
| --- | --- |
| Data mixing | Impossible — disjoint roots (`%APPDATA%` vs `exe_dir/data`); no fallback path ever crosses over (see writability guard). |
| Both running at once | Supported: single-instance key is scoped per data root. Two copies of the *same* portable folder remain single-instanced. |
| CLI targets the wrong app | CLI resolves its sibling app first (relative `data/mcp-bridge.json`), so each CLI drives its own instance. Pipe names are already per-run tokens. |
| Updates cross-contaminate | Mode-aware asset validation: portable only accepts `-portable.zip`, installed only `-setup.exe`. |
| Keychain overlap | Same service name is fine — owner IDs are per-DB UUIDs; portable default is the file store anyway. |
| WebView2 profiles | Disjoint (`data/webview` vs `%LOCALAPPDATA%\com.kkterm.app\EBWebView`). |
| Managed apps / Install Helper | Shared machine state by design; both instances see the same installed tools — that is the correct model. |
| Uninstalling the installed copy | NSIS uninstall never touches the portable folder; deleting the portable folder removes 100% of portable state (that's the point). |

---

## 8. Packaging and release pipeline

- **`scripts/package-portable.ps1`** (+ arm64 variant or a `-Arch` switch):
  runs after the normal `tauri build`, assembles the ZIP from the already
  signed `KKTerm.exe`, `kkterm-cli.exe`, the bundled `resources/` tree, and a
  freshly created `kkterm-portable.marker`; emits the `.sha256`.
- **Release scripts** (`release-github*.ps1`) upload the portable assets;
  `sync-cloudflare-release.mjs` mirrors them; `generate-release-notes.mjs`
  lists them.
- **`scripts/smoke-portable.ps1`**: extract to a temp dir, launch, assert
  (a) `data/` appears next to the exe with the DB inside, (b) nothing new
  under `%APPDATA%\com.kkterm.app` / `%LOCALAPPDATA%\com.kkterm.app`,
  (c) no HKCU auto-start or detection-cache keys created, (d) second launch
  from the same folder focuses the first (single instance), (e) app exits
  cleanly (WAL checkpointed).
- **Docs**: README download table, `docs/SITE.md`/site release worker if it
  lists assets, `docs/ANTIVIRUS.md` (portable ZIPs are more often flagged
  than signed installers — same signed exe inside mitigates; document how to
  report false positives).

---

## 9. Phasing

Each phase is shippable and independently testable.

1. **Path core** — `AppPaths` module + detection + writability guard; sweep
   all `app_data_dir`/`app_cache_dir` call sites; WebView2 profile
   redirection; asset-scope extension; single-instance scoping; CLI bridge
   discovery; registry gating (auto-start, detection cache). Gated behind
   `KKTERM_PORTABLE=1` for dev; no packaging yet. Regression risk lives
   here, so it lands first and alone.
2. **Secrets + UX** — portable default to the file store, first-run
   onboarding, Settings badge/deltas, `get_app_mode`, i18n keys + pending
   localization files, manual updates.
3. **Packaging** — portable ZIP scripts, release/mirror/notes integration,
   smoke script. First public portable release can ship after this phase
   with manual updates only.
4. **Portable updater** — ZIP download/verify/stage/swap-handoff/rollback,
   mode-aware validation, update-panel copy.
5. **Later / out of scope for v1** — Linux (mark AppImage layouts the same
   way), macOS portable-style bundle, optional full-DB encryption, optional
   machine-local WebView2 profile redirect for very slow USB media.

---

## 10. Risks and open questions

- **Slow/flaky removable media**: SQLite + WebView2 profile on a slow USB 2
  stick will feel it. Mitigation options (later phase): allow redirecting
  `data/webview` to machine-local temp via a `portable.toml` next to the
  marker.
- **Cloud-synced folders** (OneDrive/Dropbox): two machines syncing one
  portable folder can corrupt the DB via concurrent WAL sync. Document as
  unsupported; the single-instance scope only protects one machine.
- **FAT32/exFAT sticks**: fine for SQLite; no named-pipe or permission
  issues (pipes are kernel objects, not files). Long-path support should be
  verified in the smoke test (deeply nested extraction paths).
- **Antivirus heuristics**: self-replacing exe during portable update is a
  classic false-positive trigger; the handoff pattern is already shipped for
  NSIS, but the ZIP swap should be watched in early releases.
- **Open question — marker vs. `data/` presence**: this plan uses an explicit
  marker only (predictable, greppable, can't be spoofed by a stray folder).
  Confirm before Phase 1.
- **Open question — portable first-run language**: localStorage starts empty
  in a fresh `data/`, so the locale defaults to system detection, same as a
  fresh install. Probably fine; noting it so it isn't reported as a bug.
