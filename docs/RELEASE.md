# KKTerm Release Notes and Gates

This document captures KKTerm release posture, packaging procedures, and current known limitations.

## No-Telemetry Posture

KKTerm is local-first by default.

- The app does not include analytics, automatic crash upload, or background telemetry.
- The app-wide Status Bar shows Workspace host usage metrics and universal transient notices only. It does not upload telemetry and no longer presents debug timing budgets.
- Terminal contents are not logged by default.
- Durable Connection metadata is stored in local SQLite.
- Secrets such as passwords, passphrases, and AI API keys are stored in the OS keychain.
- Update checks are enabled by default and contact GitHub Releases metadata only. This is separate from telemetry: KKTerm does not send analytics, crash reports, terminal contents, Connection data, or secrets as part of update checking. When a newer non-draft, non-prerelease release is available, KKTerm prompts the user; it does not install anything without an explicit click.

## Diagnostics Bundle Flow

Diagnostics bundle creation is implemented as a local app command, but the current simplified Settings surface does not expose the diagnostics action. The user-facing diagnostics entry point should be reintroduced only after the Settings UX is redesigned.

The current bundle is a local folder under the app data directory. It includes:

- `README.txt` with sharing guidance.
- `manifest.json` with app version, target OS/architecture, local performance snapshot, last native SSH terminal readiness when measured, and included-file list.
- `kkterm.log` when the local startup log is available.

Debug builds may also create `aiassistant.debug.log`, `mcp.debug.log`, `installer.helper.debug.log`, `url.connection.debug.log`, `rdp.debug.log`, and `kkterm-heartbeat.debug.log` beside `kkterm.log`. Release builds create full AI Assistant, MCP, Installer Helper, URL Connection, RDP, and heartbeat debug logs only when the user enables **Settings → General → Debug → Advanced Debugging**. Enabling that setting writes an `advanced_debugging.enabled` marker to the JSONL debug logs so the active release logging path is visible immediately; `kkterm-heartbeat.debug.log` starts writing heartbeat lines while the setting remains enabled. These files are not ordinary release telemetry; they are raw local troubleshooting logs for AI Assistant interactions, MCP traffic, Installer Helper operations, URL WebView2 overlay geometry, RDP startup/display diagnostics, and frontend/native liveness timing, including provider payloads, stream chunks, tool calls/results, permission blocks, live Session bridge traffic, MCP arguments/results, Dashboard widget creation checkpoints, Installer Helper command output, URL hostnames/bounds, RDP hostnames/usernames/options, local paths, and window/tray timing state. RDP debug logging defensively redacts password-like, secret-like, token-like, and credential-like fields. These files may contain prompts, attached context, terminal buffer text returned through tools, generated widget source, and other user-provided content. Review them carefully before sharing.

The bundle intentionally excludes by default:

- terminal output
- connection passwords and passphrases
- AI API keys
- the SQLite connection database
- known-host material

Users should review the generated files before sharing them. Future diagnostics work may add opt-in selected terminal output or redacted database summaries, but those must remain explicit user actions.

## Bundled Operation Manual

The user-facing operation manual under `docs/manual/` ships with every installer build. Tauri copies each chapter declared in `src-tauri/tauri.conf.json` → `bundle.resources` (mapped to `manual/<filename>.md` in the resource directory). The built-in AI Assistant uses these files as its help/search reference. When a chapter is added or removed, update three places in the same PR: the new/removed `docs/manual/*.md` file, the `bundle.resources` map in `src-tauri/tauri.conf.json`, and the `CHAPTERS` list in `src-tauri/src/manual.rs`. `npm run build` + `cargo check` is sufficient to catch mismatched entries.

## Windows Installer

Create the Windows installer with:

```bash
npm run package:installer
```

The script runs the Tauri NSIS bundle target, copies the generated setup executable to a stable release filename, and writes:

- `artifacts/kkterm-<version>-windows-x64-setup.exe`
- `artifacts/kkterm-<version>-windows-x64-setup.exe.sha256`

The installer uses a current-user install mode by default, creates KKTerm Start Menu entries, and downloads the WebView2 bootstrapper only if the target machine needs WebView2 during install.

Startup and manual update checks use GitHub Releases. If the release includes the matching Windows installer asset and its `.sha256` checksum, the update dialog offers `settings.updateDownloadAndInstall` ("Download and Install"). That action downloads the installer to KKTerm's app cache, verifies the SHA-256 checksum published with the release, starts a detached handoff helper, and exits KKTerm before the NSIS installer launches so the installed files can be replaced. The fallback `settings.updateOpenDownloadPage` action remains available for manual downloads.

TODO: Restore Windows Authenticode signing and the Tauri updater signing flow before treating self-update as fully signed. The current `settings.updateDownloadAndInstall` flow verifies the release checksum over HTTPS/GitHub Releases but does not yet validate a Tauri updater signature or Windows publisher identity. The Tauri updater signature validates self-update artifacts and is distinct from Windows Authenticode signing, which validates publisher identity to Windows.

Smoke test the installer artifact with:

```bash
npm run smoke:installer
```

The smoke test verifies the release artifact checksum, silently installs into a temporary directory, confirms `kkterm.exe` is present and non-empty, then silently uninstalls and removes only the temporary smoke-test directory it created.

## GitHub Release

Publish the next build release with:

```bash
npm run release:github
```

The script generates release notes, increments the `<major>.<minor>.<build>` version across npm, Tauri, and Cargo metadata, builds the NSIS installer artifact, smoke tests the installer, runs frontend and Rust checks, commits the version bump plus release notes, tags it as `v<version>`, pushes to `origin/main`, and creates a GitHub release with the installer, checksum, and generated notes. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-github.ps1 -DryRun` to preview the next version, add `-Draft` for a draft release, or add `-SkipBuild` to publish from existing artifacts.

Release notes are generated before the version-bump commit so the summary covers changes since the previous `v*` tag and not the release commit itself. The generator writes:

- `artifacts/release-notes-v<version>.md` for `gh release create --notes-file`
- `docs/releases/v<version>.md` as the per-version release note
- `CHANGELOG.md` with the newest version prepended

Generated release notes start with a `Direct Downloads` section that links to
the exact GitHub release assets for the generated tag:

- `kkterm-<version>-windows-x64-setup.exe`
- `kkterm-<version>-windows-arm64-setup.exe`

When `OPENAI_API_KEY` is available, `scripts/generate-release-notes.mjs` asks OpenAI to summarize the GitHub-generated notes and commit context using `gpt-5.4-nano` by default. AI-generated notes are written in English first, followed by a Traditional Chinese (Taiwan) version with the same facts, light humor, and tone. If the key is missing or the API call fails, the script falls back to deterministic notes from GitHub generated notes and commit subjects. Local runs may set secrets in the process environment or in an uncommitted `.env.local` file:

```powershell
$env:OPENAI_API_KEY = "sk-..."
npm run release:github
```

GitHub Actions uses the same scripts through the manual **Release** workflow. The workflow invokes `scripts/release-github-both-arch.ps1` so a CI/CD release always builds and publishes the x64 **and** ARM64 installers together, matching the local `npm run release:github:both-arch` path (and the `Direct Downloads` section, which links both architecture assets). Store the API key as the repository secret `OPENAI_API_KEY`; the workflow exposes it to the script as the same environment variable. Use the workflow inputs to mark a release as draft/prerelease, skip the installer build or smoke test, disable AI notes, or run a dry preview.

## macOS GitHub Release Assets

macOS builds are attached after the Windows release because they must run on a Mac with Apple signing credentials. The Windows release script remains the canonical version/tag creator. Do not bump versions on the Mac side.

After the Windows release exists, run this on macOS:

```bash
npm run release:github:macos
```

The script builds the arm64 DMG and signed Tauri updater bundle with `npm run package:macos`, copies the user-facing DMG to:

- `artifacts/kkterm-<version>-macos-arm64.dmg`
- `artifacts/kkterm-<version>-macos-arm64.dmg.sha256`

It also copies the Tauri updater assets and metadata to:

- `artifacts/kkterm-<version>-macos-arm64.app.tar.gz`
- `artifacts/kkterm-<version>-macos-arm64.app.tar.gz.sig`
- `artifacts/latest.json`

It detects the version from the DMG filename and uses the matching `v<version>` GitHub Release when `--tag` is not supplied. It then notarizes and staples the final renamed DMG, writes the checksum, uploads the macOS files with `gh release upload --clobber`, patches the release notes `Direct Downloads` section with the macOS DMG link, and writes `latest.json` with a `darwin-aarch64` updater entry. The `latest.json` `notes` field is copied from the current GitHub Release body so the Tauri updater dialog can show the real release notes. Use `--tag v<version>` to force a specific release, `--skip-build` to upload the latest already-built Tauri DMG/updater bundle, `--skip-notes-patch` to leave the release body unchanged, and `--dry-run` to print the resolved version, tag, repository, and artifact names without building or uploading.

The macOS build still requires Apple Developer ID signing and notarization environment variables expected by Tauri, such as `APPLE_SIGNING_IDENTITY` plus either App Store Connect API key variables or Apple ID notarization variables. It also requires the Tauri updater private key through `TAURI_SIGNING_PRIVATE_KEY`; `npm run package:macos` reads `TAURI_SIGNING_PRIVATE_KEY_PATH` when the variable is unset, defaults that path to `$HOME/.tauri/kkterm-updater.key`, and base64-wraps a raw Minisign key box if given one (keys generated by `tauri signer generate` are already base64-wrapped and pass through unchanged). A blank-password updater key is supported: the package scripts export `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""` when the variable is unset, so the signer does not prompt in CI or release shells. Keep those values in the local shell environment or an uncommitted `.env.local`; never commit Apple certificates, private keys, app-specific passwords, notarization secrets, or updater private keys. The public updater key is committed in `src-tauri/tauri.macos.conf.json`.

## Linux GitHub Release Assets

Linux builds are attached after the Windows release because the Windows release script remains the canonical version/tag creator. Do not bump versions on the Linux side.

After the Windows release exists, run this on Linux:

```bash
npm run release:github:linux
```

The script builds the x86_64 AppImage with `npm run package:linux`, copies the user-facing AppImage to:

- `artifacts/kkterm-<version>-linux-x86_64.AppImage`
- `artifacts/kkterm-<version>-linux-x86_64.AppImage.sha256`
- `artifacts/kkterm-<version>-linux-x86_64.AppImage.sig`
- `artifacts/latest.json`

It detects the version from the AppImage filename and uses the matching `v<version>` GitHub Release when `--tag` is not supplied. It uploads the Linux files with `gh release upload --clobber`, patches the release notes `Direct Downloads` section with the Linux AppImage link, and writes `latest.json` with a `linux-x86_64` updater entry, merging any existing platform entries so a later Linux or macOS upload does not erase the other platform's updater metadata. The `latest.json` `notes` field is copied from the current GitHub Release body so the Tauri updater dialog can show the real release notes. Use `--tag v<version>` to force a specific release, `--skip-build` to upload the latest already-built AppImage/signature pair, `--skip-notes-patch` to leave the release body unchanged, and `--dry-run` to print the resolved version, tag, repository, and artifact names without building or uploading.

The Linux build requires the Tauri updater private key through `TAURI_SIGNING_PRIVATE_KEY`; `npm run package:linux` reads `TAURI_SIGNING_PRIVATE_KEY_PATH` when the variable is unset, defaults that path to `$HOME/.tauri/kkterm-updater.key`, and base64-wraps a raw Minisign key box if given one. A blank-password updater key is supported through the same `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""` default described above. Keep the private key and password in the local shell environment or an uncommitted `.env.local`; never commit updater private keys. The public updater key is committed in `src-tauri/tauri.linux.conf.json`.

## Known Limitations

- Windows, macOS, and Linux are supported release targets. macOS DMG and Linux AppImage publishing are currently attached as follow-up asset uploads to an existing GitHub Release.
- The Windows installer build and smoke test are repeatable, but the installer is unsigned until release signing is configured.
- SSH readiness performance is instrumented for native post-auth terminal setup and retained in local performance snapshots after a native SSH Session starts. The repeatable `npm run measure:ssh-readiness` helper can validate the `<= 150 ms` budget against a trusted non-`ProxyJump` SSH Connection, but the latest documented run still lacks a measured value because valid SSH auth was not available in the measurement environment.
- Native SSH-launched SFTP does not support `ProxyJump`; SSH terminal sessions with `ProxyJump` use the system `ssh` fallback/debug path where available.
- SSH config import support exists behind the local command boundary, but the current Settings surface does not expose a user-facing import action. The same applies to the diagnostics bundle action.
- SFTP supports recursive file and folder transfer, multi-select drag/drop, overwrite prompts with overwrite-all handling, clearable finished transfer history, remote properties, chmod, and chown, but folder sync, diff/compare, transfer resume, archive/extract, and remote file editing remain deferred.
- Screenshot capture is available from terminal Pane toolbars and non-terminal workspace top toolbars. Region and Entire Window/Panel captures can be copied to the system clipboard or attached transiently to the AI Assistant through explicit user action.
- RDP uses the Windows ActiveX host and VNC uses a canvas-rendered `vnc-rs` framebuffer path; advanced VNC options, richer clipboard handling, sync, and team sharing remain deferred.
- AI command assistance and app tool use are bounded by assistant tool settings. Prompt mode is the default and blocks mutating tools with a permission-required result; Allow All is an explicit setting that lets enabled tools execute automatically. The Assistant can use typed tools for Dashboard changes, saved Connection management, and active Session interaction, but it should not be treated as an unattended autonomous operator.
- Settings exposes General, Appearance, Dashboard, Workspace, Installer Helper, Credentials/MCP, AI Assistant, SSH, Terminal, URL, RDP, VNC, and About sections. SSH config import and editable keybindings are not yet exposed.
- Diagnostics bundles are folders, not compressed archives.
