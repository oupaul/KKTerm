# AI Coding Usage Widget MVP Design

## Summary

Add a built-in Dashboard Widget Instance named **AI Coding Usage** that lets a user connect one OpenAI Codex account and one Claude Code account, then monitor provider-shaped usage windows from the Dashboard. The MVP is intentionally single-account-per-provider: one Codex account plus one Claude Code account. Multi-account rotation, billing-grade cost accounting, and organization-wide reporting are deferred.

The widget should feel like App Launcher: direct, compact, and immediately useful. Users add the widget from the Dashboard catalog, then choose whether to connect Codex, Claude Code, or both from inside the widget. KKTerm initiates the provider sign-in journey and delegates OAuth credential ownership to the provider CLI or local provider service where possible.

## Goals

- Let users add Codex and/or Claude Code monitoring from a Dashboard widget.
- Start provider sign-in from KKTerm, rather than requiring the user to pre-authenticate manually.
- Show a 5-hour usage bar and a weekly/7-day usage bar for each connected provider when the provider exposes those stats.
- Refresh automatically every 5 minutes while the widget is present on the active Dashboard View.
- Provide a manual Refresh now action.
- Keep OAuth tokens out of Dashboard widget JSON and SQLite.
- Preserve the last good snapshot when refresh fails.

## Non-Goals

- No multi-account support in MVP.
- No account cycling or automatic provider switching.
- No spend/billing reconciliation across providers.
- No team/admin usage dashboard.
- No scraping web cookies, browser profiles, or private web app storage.
- No background polling when no AI Coding Usage widget exists on the active Dashboard View.
- No AI Created script widget implementation for this feature.

## User Experience

The Dashboard catalog includes a new built-in widget entry:

- Title key: `dashboard.aiCodingUsageTitle`
- Summary key: `dashboard.aiCodingUsageSummary`
- Default preset: `panel`
- Default accent: `teal`
- Default icon: `Gauge`
- Default size: `6x4`

The widget body has two provider slots:

- Codex
- Claude Code

Each provider slot supports these states:

- `disconnected`: provider name, short status, and a Connect button.
- `connecting`: disabled controls and a progress status while OAuth is in flight.
- `connected`: account label, usage bars, reset metadata, and last refreshed time.
- `stale`: last good usage snapshot remains visible with a compact warning.
- `error`: no usable snapshot exists; show a compact recoverable error and Connect or Refresh action.

The connected state shows two quota rows per provider:

- `5h`: percent used, progress bar, and reset time when available.
- `Weekly` or `7d`: percent used, progress bar, and reset time when available.

The widget has one icon-only Refresh now button. For MVP, this refreshes every connected provider in the widget. A small provider action menu can offer Disconnect, but destructive or credential-affecting actions should use app-owned confirmation surfaces if they become more than a simple provider logout.

## Visual Direction

The UI should be polished but dense: a compact operational widget, not a marketing card. It should use KKTerm Dashboard chrome and app CSS variables. Provider slots should be visually separated without nesting full cards inside cards; use rows, subtle section dividers, compact meter bands, and clear icon buttons.

Usage bars use semantic states:

- Normal: neutral/accent fill.
- Warning: amber when usage is near the configured threshold.
- Exhausted or nearly exhausted: red.
- Unknown: muted skeleton/empty meter with text that explains the missing provider value.

Visible copy must be short and translated. Avoid long setup instructions inside the widget; errors should be actionable but compact.

## Architecture

Implement this as a built-in Dashboard widget, not an AI Created widget.

Frontend ownership:

- `src/dashboard/widgets/AiCodingUsageBody.tsx`: widget body.
- `src/dashboard/registry/builtInRegistry.ts`: register the built-in entry.
- `src/ai-coding-usage/`: provider-specific UI helpers, state hooks, and types.
- `src/lib/tauri.ts`: typed wrappers for new Tauri commands.

Backend ownership:

- `src-tauri/src/ai_coding_usage.rs`: provider command execution, snapshots, and validation.
- Storage additions live in the existing SQLite schema management path in `src-tauri/src/storage.rs`.
- Secrets use the OS keychain only if KKTerm must hold a token or secret reference itself.

Do not put live refresh state in the durable Dashboard Widget Instance model. The Dashboard instance stores only normal widget presentation/customization values. Provider account metadata and usage snapshots belong to feature-specific storage.

## Data Model

SQLite stores non-secret provider state:

```text
ai_coding_usage_accounts
- provider: codex | claudeCode
- account_label: nullable string
- account_email: nullable string
- auth_state: disconnected | connected | expired | error
- last_refresh_at: nullable timestamp
- last_error: nullable string
- created_at
- updated_at
```

```text
ai_coding_usage_snapshots
- provider: codex | claudeCode
- five_hour_used_percent: nullable number
- five_hour_resets_at: nullable timestamp
- weekly_used_percent: nullable number
- weekly_resets_at: nullable timestamp
- raw_provider_json: nullable bounded JSON string
- captured_at
```

Only one account row per provider is accepted in MVP. A future multi-account version can add an account id and lift the unique provider constraint.

## Provider Integration

### Codex

KKTerm starts or connects to `codex app-server` and uses its JSON-RPC account surface.

Flow:

1. Start app-server for the user account context KKTerm manages.
2. Initialize the JSON-RPC connection with KKTerm client metadata.
3. Call `account/read` to detect existing state.
4. For Connect, call `account/login/start` with ChatGPT browser OAuth.
5. Open the returned `authUrl` using the OS/browser opener.
6. Wait for `account/login/completed` and `account/updated`.
7. Call `account/read` and `account/rateLimits/read`.
8. Normalize the provider response into the widget snapshot.

Codex app-server is the preferred source because it exposes auth state, ChatGPT OAuth login, account metadata, and rate-limit updates in one local interface.

### Claude Code

KKTerm starts the official Claude Code authentication flow and lets Claude Code own OAuth credentials.

Flow:

1. Verify the `claude` executable is available.
2. For Connect, run the official `claude auth login` flow in a controlled helper process or Tauri-managed terminal flow.
3. Use `claude auth status` to read account/auth state as JSON.
4. Read rate limit data through Claude Code's documented `rate_limits` shape.
5. Normalize `rate_limits.five_hour.used_percentage`, `rate_limits.five_hour.resets_at`, `rate_limits.seven_day.used_percentage`, and `rate_limits.seven_day.resets_at`.

The implementation plan must include a short probe to choose the cleanest on-demand rate-limit read path. Claude Code documents these fields for status-line input after the first API response, but KKTerm should avoid creating hidden billable prompts just to obtain usage. Acceptable MVP outcomes are:

- connected with real rate-limit values when Claude exposes them locally;
- connected with account status but unknown meters until a Claude Code session has produced rate-limit fields;
- recoverable provider error when the installed Claude Code version does not expose usable rate-limit data.

KKTerm must not parse `.credentials.json` for OAuth tokens or call undocumented OAuth usage endpoints as the primary MVP path.

## Refresh Behavior

The widget refreshes on three triggers:

- initial mount when at least one provider is connected;
- manual Refresh now;
- 5-minute interval while the widget exists on the active Dashboard View.

Refresh is provider-isolated. If Codex succeeds and Claude fails, Codex updates and Claude keeps its last good snapshot with a stale/error marker.

The backend should enforce a minimum refresh interval or coalesce overlapping refreshes so repeated clicks cannot hammer provider CLIs. Manual refresh may bypass the 5-minute schedule, but not provider-level in-flight protection.

## Error Handling

Common errors:

- provider executable not found;
- login cancelled;
- OAuth expired or revoked;
- provider CLI too old;
- provider rate-limit fields unavailable;
- provider command timeout;
- network or provider service failure.

Errors are structured in Rust and surfaced as translated compact messages in the widget. The widget keeps the last successful snapshot visible whenever possible. Provider command output must be scrubbed before storage or UI display so secrets and raw tokens are not shown.

## i18n And Manual

All visible strings use translation keys. New English keys go in `src/i18n/locales/en.json`; untranslated keys get one file per key in `docs/localization_todo/`.

Because this changes Dashboard UI behavior and introduces a new user-facing widget, implementation must update the Dashboard manual chapter under `docs/manual/` and its AI grep hints. Manual text should reference i18n keys, not English labels.

## Testing And Verification

Implementation checks should include:

- TypeScript tests for provider snapshot normalization.
- Rust tests for snapshot validation and storage constraints.
- Command tests or guarded integration tests for provider executable missing and timeout paths.
- Dashboard built-in registry test update.
- Manual smoke test in the real Tauri runtime, not standalone Vite, because OAuth flow, process launching, keychain behavior, and native browser opening are desktop-runtime behavior.

Before handoff, run the repo checks required by AGENTS.md when practical:

- `npm run check`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## Open Risks

- Claude Code may not expose rate-limit data on demand without an active session or a recent API response. The MVP should handle unknown meters gracefully rather than inventing estimates.
- Provider CLIs may change command output or login behavior. Keep parsing narrow and version-aware.
- Codex app-server support is strong for the local API path, but KKTerm must manage process lifetime carefully to avoid orphaned helper processes.
- Windows OAuth callback/browser behavior needs real Tauri validation.

## Acceptance Criteria

- User can add AI Coding Usage from the Dashboard catalog.
- User can connect Codex from the widget through a KKTerm-started provider OAuth flow.
- User can connect Claude Code from the widget through a KKTerm-started provider OAuth flow.
- Widget can show Codex 5-hour and weekly usage bars when Codex returns rate-limit data.
- Widget can show Claude Code 5-hour and 7-day usage bars when Claude Code returns rate-limit data.
- Widget refreshes automatically every 5 minutes while active.
- Refresh now updates connected providers without restarting the app.
- Last good usage snapshot remains visible after a refresh failure.
- OAuth tokens are not stored in Dashboard widget JSON or SQLite.
- Dashboard manual and i18n backlog are updated with the implementation.
