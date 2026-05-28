# Agent Instructions

## Project Shape

KKTerm is a Windows-first, local-first Tauri v2 desktop app: Rust backend,
React/TypeScript frontend, SQLite for non-secret durable data, and OS keychain
for secrets.

Use these docs as the source of truth instead of copying their rules here:

- `CONTEXT.md` — product vocabulary and domain boundaries.
- `docs/ARCHITECTURE.md` — architecture, source map, command boundaries,
  native-window rules, Settings rules, overlays, i18n, and UI placement.
- `docs/PRD.md` / `docs/ROADMAP.md` — product scope and direction.
- `docs/ADR/` — accepted architectural decisions.
- `docs/manual/INDEX.md` — shipped operation manual and chapter index.

Before changing behavior, terminology, or source placement, read the relevant
source-of-truth docs and preserve their boundaries.

## Constitution

These rules apply to every task unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding

State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First

Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes

Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.
`cargo fmt` is optional in this repo. If formatting is useful, run it only on the
smallest practical Rust scope you intentionally touched, such as a single file
or single Rust source file. Do not run broad `cargo fmt` over the whole
workspace unless the user explicitly asks for global formatting; it can rewrite
unrelated Rust sources and create noisy file-format churn.

## Rule 4 — Goal-Driven Execution

Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Working Rules

- Domain language lives in `CONTEXT.md`. Use **Connection** for durable openable
  resources, **Session** for live runtime state, and **Tab** for the frontend
  workspace container. Do not say "profile" for a stored Connection.
- Capital-M **Module** means a top-level Activity Rail destination. Current
  product Modules are **Workspace**, **Dashboard**, and **Installer Helper**;
  **Settings** is the bottom rail destination. The App Launcher is a Dashboard
  widget, not a Module.
- Source placement lives in `docs/ARCHITECTURE.md` → "Frontend Source Map".
  Prefer existing source areas and typed wrappers in `src/lib/tauri.ts`.
- The operation manual ships with the app. Any UI behavior change in a manual
  chapter's scope must update the relevant chapter in `docs/manual/`; reference
  i18n keys, not English labels.
- Tutorial-capable UI needs a stable `data-tutorial-id`, a navigation entry in
  `src/app/tutorialNavigationModel.ts`, matching `tutorial_highlight` metadata
  in `src-tauri/src/ai.rs`, and manual grep hints. `npm run check` validates
  these mappings.
- All user-visible strings go through i18n. Add English keys first in
  `src/i18n/locales/en.json`; whenever new UI strings are created or changed,
  follow `docs/localization_todo/README.md` exactly. If translations are not
  completed in the same change, add one pending file per key under
  `docs/localization_todo/` using that README's flow and template. See
  `docs/manual/16-localization.md` and `docs/ARCHITECTURE.md`.
- App-owned popup dialogs use a single concise title by default. Do not add a
  subtitle or explanatory header copy unless the flow truly needs it; put
  supporting text in the dialog body near the relevant controls instead.
- Dialog footers follow Windows button order: the primary/confirm action comes
  immediately before Cancel, and the action group anchors to the bottom right
  unless an existing platform pattern in the same dialog family differs.
- App-owned popup dialogs must anchor their close button to the dialog's top
  right corner, independent of header text flow; pad header/content so titles
  and actions cannot overlap the close control.
- Built-in MCP tool changes must update `docs/MCP.md`; if Settings AI
  behavior/safety text changes, also update `docs/manual/15-settings.md`.

## High-Risk Invariants

- Do not add frontend close hooks or close-confirmation flows. The only allowed
  close-path diversion is the native Rust minimize-to-tray handler documented in
  `docs/ARCHITECTURE.md`.
- Automatic database backups must not run from app-window close; use startup or
  explicit Settings backup flows.
- Do not put live Session state into the durable Connection model.
- `withLiveConnectionStatuses` is display-only. Do not pass its fresh
  Connection objects to workspace components that own Session lifecycles.
- User-facing transient status belongs in the bottom Status Bar via
  `showStatusBarNotice`; do not add one-off toast/status implementations.
- Do not use `window.alert`, `window.confirm`, or `window.prompt`; use
  translated app-owned dialogs/popovers.
- RDP ActiveX overlay parking is RDP-only. Do not extend that workaround to
  WebView2, terminal, SFTP/FTP, or VNC surfaces without documenting and proving
  a separate runtime failure.
- Simple command menus in Workspace use Tauri native context menus through
  `src/lib/nativeContextMenu.ts`; do not replace them with DOM menus unless the
  menu needs forms or custom interactive content.
- Validate local Windows terminal focus/input, WebView2, RDP/VNC, keychain,
  native menus, title-bar close, and OS integration in the real Tauri desktop
  runtime, not standalone Vite/browser preview.

## Checks

The full check suite is optional. Run it before handing work back only after a
significant code change, defined as more than 500 changed lines of code. Do not
run the full suite for cosmetic UI changes or documentation-only updates.

```bash
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

If a required check cannot be run, explain why in the final response.
