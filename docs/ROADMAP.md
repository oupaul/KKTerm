# KKTerm Roadmap

## Current Status

Quick snapshot as of June 2, 2026:

All core connection types, terminal features, SFTP/FTP, RDP/VNC, AI Assistant tool calling, Dashboard Module redesign, Installer Helper, and UI customization are implemented and shipping. The app metadata is currently at v0.1.54 and releasing continuously.

Release validation gates are documented in `AGENTS.md` and `docs/RELEASE.md`; run the full suite before significant code changes or release publication. Previous packaging validation passed for `npm run package:installer` and `npm run smoke:installer`.

For operational measurement records see `docs/PERFORMANCE.md`. For packaging and release artifacts see `docs/RELEASE.md`.

## What's Implemented

### Infrastructure & Foundation

- [x] Confirm working product name: KKTerm.
- [x] Initialize repository structure with MIT license.
- [x] Rust/Tauri v2/React 19/Vite scaffold with Tailwind design tokens.
- [x] App shell with light chrome and dark terminal surface.
- [x] Local logging foundation.
- [x] CI skeleton for Windows builds.
- [x] Typed Tauri command wrapper.
- [x] SQLite schema initialization and repository layer.
- [x] OS keychain abstraction.

### Connections & Workspace

- [x] Connection tree with root Connections, optional nested folders, search/filter, drag/drop reorder, rename/delete/duplicate, quick connect, and live status badges.
- [x] Named Workspaces with Activity Rail switching, a permanent Default Workspace, per-Workspace Connection trees, copy-import during Workspace creation, and Workspace-scoped open Tab visibility that keeps other Workspace Sessions alive in the background.
- [x] Tab workspace with split panes inside terminal tabs.
- [x] Runtime-only per-Tab rename for multiple Tabs opened from the same Connection.
- [x] Child Connection Tabs in the Connection Tree for saved per-Connection Tab instances, lazy reopen, tmux/session-directory resume hints, and multi-child split layouts.
- [x] Left activity rail with Workspace, Dashboard, Installer Helper, and Settings entries.
- [x] MobaXterm/RDCMan import.

### Terminal

- [x] Local terminal session lifecycle.
- [x] Windows local terminal creation options for PowerShell, Command Prompt, and WSL.
- [x] xterm.js renderer with opportunistic WebGL glyph rendering.
- [x] Terminal font, line height, cursor, scrollback, copy-on-select, multiline paste confirmation, and default shell controls.
- [x] Terminal bracketed paste, mouse support, and alternate screen behavior.
- [x] Renderer-level terminal scrollback search with pane controls.
- [x] Fixed xterm fit/pixel geometry for maximized Windows terminal panes.
- [x] Terminal renderer interface defined in code so xterm can be swapped for a future renderer.

### SSH

- [x] In-process SSH connection lifecycle via `russh`. See `docs/ADR/0004-ssh-transport-library.md`.
- [x] Host key verification, password auth, key-file auth by path, and SSH agent support.
- [x] Terminal channel allocation and resize events.
- [x] Keep native SSH terminal Sessions connected while idle and unfocused by avoiding app-side inactivity timeouts.
- [x] Optional system SSH fallback/debug path.
- [x] SSH defaults persistence for new Connections.
- [x] Optional tmux session resume per Pane with remote session list, rename, and close actions.
- [x] Bounded silent reattach for tmux-backed channels after unexpected transport closure.
- [x] SSH config import command with unsupported directive reporting.

### SFTP & FTP

- [x] SFTP session reuse from SSH connection credentials.
- [x] SFTP launched from SSH terminal tabs (no standalone SFTP Connection required).
- [x] Dual-pane local/remote file manager with create folder, rename, delete, and refresh.
- [x] Upload and download for files and folders; multi-select drag/drop between panes.
- [x] Context menu with transfer, inline rename, delete, and properties.
- [x] Remote file properties with chmod and chown editing.
- [x] Transfer queue with progress, cancellation, and clearable finished history.
- [x] Overwrite behavior setting; conflict prompts with overwrite-all.
- [x] "Open terminal here" action.
- [x] FTP/FTPS Connection type.

### Remote Desktop

- [x] Durable RDP connection type via Windows ActiveX COM hosting.
- [x] Geometry-scoped RDP ActiveX snapshot/parking for app-owned DOM overlays so dialogs, screenshot menus, Region selection, and menus that intersect the RDP host are not covered by the native child HWND.
- [x] Configurable RDP session options (display quality/performance tuning, clipboard mapping, redirect/security controls).
- [x] Durable VNC connection type via `vnc-rs` framebuffer rendering and pointer/key input.

### AI Assistant

- [x] AI Assistant panel with streaming chat and OpenAI-compatible runtime.
- [x] Provider registry: OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA, and generic endpoints.
- [x] API keys stored in OS keychain; provider-specific model selector with custom model ID field.
- [x] Command proposal flow with explicit approval before execution.
- [x] Screenshot capture to clipboard and transient AI context (full surface, partial area, and region).
- [x] AI Assistant tool calling: local tools (rg, curl, filesystem search), web fetch/search, Dashboard, Connections, live Sessions, network admin, and watchdogs.
- [x] AI Assistant tool permission mode: Prompt (default, blocks mutating tools) and Allow All (explicit automatic execution). Stop cancels the in-flight run end to end, including local CLI (ACP) backends, before any further provider call or tool execution.
- [x] Risk-aware approvals: command-bearing tool calls flagged by a keyword heuristic show their risk reasons on the approval card and re-prompt even under "Allow for session".
- [x] Model-driven work plans: the assistant publishes a live step plan (`update_plan`) shown in the work panel and saved with the chat.
- [x] Persistent assistant memory: short durable notes scoped per Connection or global, recalled automatically when that Connection is active; secrets are never stored.
- [x] `mcp_list_tools` so widget authoring can ground `KK.callMcpTool` code in the real cached tool schemas of configured MCP servers.
- [x] Saved Connection tools: list/create/open/update/delete.
- [x] Live Session tools: terminal buffer reads, terminal input, RDP/VNC screenshots and input, SFTP/FTP browser list/create-folder/rename/delete actions.
- [x] Review-only extension draft mode.
- [x] MCP (Model Context Protocol) server support for external agent integration.
- [x] Language output setting: follow UI language or a specific language.
- [x] Claude Code CLI and Codex CLI path configuration (constrained to suggest-only/ask-before-execute where possible).
- [x] Command planning safety tests.

### Dashboard & Widgets

- [x] Dashboard Module: SQLite-backed views/instances/AI Created Widgets, three visual presets (`panel`, `ambient`, `hero`), per-widget accent/icon/title customization, drag-and-drop layout via `react-grid-layout`, dynamic backgrounds.
- [x] Two-kind widget model: `builtIn` and `script` with `iframe srcdoc` script hosting.
- [x] Built-in widgets: App Launcher (local app/shortcut/script/file entries), Connection (embedded SSH/RDP/VNC/SFTP surfaces), Notes (sticky note), and AI Coding Usage (Codex / Claude Code quota).
- [x] AI Created script widgets.

### Installer Helper

- [x] Installer Helper Module with a bundled curated Windows developer-tool catalog.
- [x] Local detection, latest-version checks, install, update, uninstall, pin, and "Update all" flows.
- [x] Structured provider recipes for winget, npm, uv pip, downloaded installers, GitHub releases, Windows features, WSL distros, and bundled tools.
- [x] Managed app support for app-local tools, launch actions, workspace add actions, service helpers, and streaming command logs.

### UI, Settings & i18n

- [x] Color Scheme settings for app chrome and workspace surfaces.
- [x] Language (i18n) settings with i18next; 14 locales: en, zh-TW, zh-CN, ja, ko, fr, de, es, es-MX, it, pt-BR, th, id, vi.
- [x] Settings sections: General, Appearance, Credentials, AI, SSH, Terminal, URL, RDP, VNC, Dashboard, Installer Helper, and About.
- [x] Custom UI fonts; minimize-to-tray; Don't Sleep (prevents Windows sleep/suspend/hibernate/shutdown).
- [x] Backup/import via settings ZIPs; startup and manual backups in the same importable format.
- [x] URL (WebView2) Connections with navigation toolbar, favicon capture, and credential metadata.
- [x] Extension platform architecture decided. See `docs/ADR/0005-extension-platform-architecture.md`.

### Performance & Quality

- [x] Local-only performance instrumentation for frontend ready time, terminal Session start time, and Windows process working set.
- [x] Budget-aware Status Bar for cold launch, local terminal readiness, SSH terminal readiness, and idle memory.
- [x] Backend tests for local-only performance snapshots.
- [x] Manual compatibility checklist: vim, tmux, htop/btop, git, npm, cargo, and pane scrollback search.

### Distribution & Packaging

- [x] Windows NSIS installer (current-user mode, creates Start Menu entries, bootstraps WebView2).
- [x] Installer smoke test (checksum verify, silent install/uninstall into temp directory).
- [x] GitHub Release script: version bump across npm/Tauri/Cargo, build, smoke test, commit, tag, push, and create release.
- [x] macOS DMG release helper: build on macOS, upload DMG/checksum to an existing GitHub Release, and patch release notes.
- [x] No-telemetry posture: no analytics, no crash upload, diagnostics are local files.

## Planned

### AI & Automation Expansion

- [ ] AI Assistant composer context attachments for files/photos, screenshots, and terminal buffer snippets from the `+` menu.
- [ ] Expanded AI orchestration: import Connection entries from multiple formats, monitor Connections, rename/reorganize layouts, optionally relay interactions through Telegram/WhatsApp/LINE integrations.
- [ ] AI reference to previous session text buffers via RAG/agentic search.
- [ ] Voice input for AI Assistant with local model support.

### Dashboard & Modules

- [ ] Redesign legacy widget bodies (hash, subnet, quick tools, maintenance report) to take full advantage of the new preset chrome.
- [ ] Native data widgets: Clock, Weather, CPU, Memory, Recent Hosts, Session Activity, Today's Brief.
- [ ] Built-in Connections widget and URL widget with configurable auto-reload intervals.

### Extension Platform

- [ ] General user-installable extension support (permissions, install/update lifecycle, and trust boundaries defined in ADR-0005).

### Workflow Simplification

- [ ] Evaluate whether broader durable Tab persistence is still needed beyond the implemented Child Connection Tab model, including per-Tab order, close semantics, and Pane/tmux metadata that must stay separate from durable Connection records.
- [ ] If broader durable Tab persistence is pursued, keep it in Workspace-owned Tab state rather than Connection-owned presets so Connection data remains separate from workspace containers.
- [ ] Simplify common workflows and reduce unnecessary visual or interaction complexity.
- [ ] Editable keybindings.

### Cross-Platform & Distribution

- [ ] Linux packaging (AppImage/deb/rpm).
- [ ] Windows Authenticode signing for installer.
- [ ] Tauri updater artifact signing and `latest.json` generation.
- [ ] Update checks enabled by default with clear local-first wording; install remains user-mediated.
- [ ] Optional crash reporting after explicit opt-in design.
- [ ] WGPU terminal renderer replacement (deferred; xterm WebGL is current fast path).

### Session Logging & Universal Search

- [ ] Autosave all terminal/SSH/Telnet/Serial text buffers to plain-text logs organized by Connection name and serial.
- [ ] Session log browser per Connection.
- [ ] Universal search across all session logs and Connection items.

### SFTP Enhancements

- [ ] SFTP folder sync/diff/resume.
- [ ] Beyond Compare-like diff/merge tool for side-by-side local and remote (SFTP) comparison with sync and merge actions.

### Recording

- [ ] RDP/VNC screen recording using ffmpeg

### Additional Protocols

- [ ] Apple Remote Desktop support (low priority).
- [ ] Hyper-V client support (low priority).
- [ ] VMware vSphere support (low priority).

### IT Ops Center

- [ ] Batch command broadcast to multiple Connections with per-host output panes and consolidated result view.
- [ ] Simple workflow engine for IT operations against selected Connections with explicit per-run approval.
- [ ] Automated server-update playbooks (apt, dnf, yum, Windows Update via WinRM) with dry-run preview and rollback-aware sequencing.
- [ ] AI-enabled triggers watching terminal output, SFTP changes, or scheduled probes.
- [ ] Reusable workflow library with durable run history (local-first, no telemetry).

### Future Scope Evaluations

- [ ] Team sharing/sync (major product-scope decision before implementation).
- [ ] Mobile apps (major platform-scope decision after desktop architecture proves itself).
- [ ] Git Browser(like STFTP browser)
