# 13 — AI Assistant

## AI grep hints

- Keys: `ai.*` (full namespace), `app.aiAssistant`, `settings.mcp*`, `settings.assistantSkills*`, `settings.aiToolsTitle`, `settings.sectionAiAssistant`, `settings.credentialKindAiApiKey`, `settings.aiTools.tutorial.*`, `common.expand`, `common.collapse`, `common.copy`
- Topics: AI panel, chats, new chat, history, SQLite, tool permission modes, tool defaults, collapsible assistant tools, collapsible Assistant Skills, bundled skills, SKILL.md, Tutorial overlay, tutorial navigation, `connections.addConnection`, intents (Watchdog / Create Widget / Extension Draft), MCP servers, attachments (files, screenshots, terminal buffer), provider keys, send-to-terminal, compact page context, UTF-8 widget updates, non-English assistant output, Advanced Debugging, AI Assistant debug logs, MCP debug logs, Installer Helper debug logs, heartbeat debug logs
- Synonyms: "chat", "copilot", "AI bot", "tools", "approval", "MCP", "agent", "skill", "skills", "SKILL.md", "workflow", "ssh-troubleshooter", "dashboard-widget-builder", "terminal-command-planner", "sftp-transfer-helper", "remote-desktop-helper", "network-connectivity-troubleshooter", "dns-dhcp-troubleshooter", "firewall-port-troubleshooter", "tls-certificate-troubleshooter", "network troubleshooting", "DNS", "DHCP", "firewall", "port check", "TLS", "certificate", "watchdog", "highlight this", "show me where", "where are chats stored", "clear chat storage", "expand tools", "collapse skills", "garbled text", "mojibake", "encoding", "UTF8", "UTF-8", "debug log", "AI debug log", "MCP debug log", "Installer Helper debug log", "heartbeat debug log", "aiassistant.debug.log", "mcp.debug.log", "installer.helper.debug.log", "kkterm-heartbeat.debug.log", "context too large"

## Panel

Right-side resizable, collapsible. Title `ai.title`. Refresh `ai.refresh`. Settings shortcut `ai.settings`. New chat `ai.newChat` (`ai.newAiChat`). The custom title-bar `app.aiAssistant` icon toggles the panel; the resize handle uses `app.resizeAiAssistant`. Empty state `ai.noActiveSession` plus `ai.workspace` indicator. The same panel is available on Workspace, Dashboard, and Settings; on Settings it shows `ai.settingsContextLabel` as the context detail and receives the active Settings section plus visible control keys.

## Chat history

Header `ai.chats`. View all `ai.viewAll` → dialog `ai.allChats`. Empty `ai.noChatsYet`. Per-chat:

- Open / close: `ai.close`, `ai.closeChatHistory`.
- Delete: `ai.deleteChat`.
- No-messages state: `ai.noMessages`. Saved indicator `ai.saved`.

Chat history is stored in SQLite table `assistant_chat_threads`, indexed for recent-first history loading. Older WebView2 `localStorage` history under `kkterm.aiAssistant.chatHistory.v1` is migrated into SQLite on startup and then removed. The unsent composer draft is temporary `sessionStorage` under `ai-chat-draft`.

## Composer

Default placeholder `ai.composerPlaceholder`. Send `ai.sendMessage` / `ai.send`. Stop in-flight `ai.stopMessage`. Copy `ai.copy` / `ai.copyMessage`. Highlighted Assistant Panel text can also be copied from the right-click native context menu item `common.copy`. Code label `ai.code`. Show-less / more `ai.showLess` / `ai.more`.

### Attachments

- Add context: `ai.addContext`.
- Add files: `ai.addFiles`. Attached files header `ai.attachedFiles`. Too-large `ai.fileTooLarge`. Remove `ai.removeFileAttachment`.
- Add screenshot: `ai.addScreenshot`. See [14-screenshots.md](14-screenshots.md).
- Add terminal buffer: `ai.addTerminalBuffer`.
- Pasted images: `ai.pastedImages`, `ai.pastedImageSource`, `ai.pastedImageSourceWithNumber`. Remove `ai.removeImageAttachment`. Preview `ai.openImagePreview` / `ai.imagePreviewTitle`.
- Image input unsupported (current provider model): `ai.imageInputNotSupported`.

`ai.clearContext` clears the current chat's pinned context.

## Context sent to providers

Every request includes the user's prompt, recent chat history, the active context label, and any active page context. Page context is intentionally compact:

- Dashboard sends the active Dashboard View, Widget Instance placement, AI Created Widget metadata, health errors, compact visual context, and compact script-library keys/globals. It does not send full widget source, `bodyJson`, `settingsSchemaJson`, or per-instance settings values.
- Settings sends the active Settings section, visible control keys, and tutorial targets.
- Workspace context is sent only for explicit attachments or active Session helpers, such as selected terminal output, terminal buffer, screenshots, files, or live Session tools.

Large or sensitive payloads should enter the conversation only through explicit user actions or narrow tools. For Dashboard editing/checking, the assistant first identifies a widget from metadata, then uses `dashboard_read_widget_source` for that one AI Created Widget.

Dashboard widget source returned through `dashboard_read_widget_source` is UTF-8 JSON. When updating a widget, the assistant should preserve non-English text exactly as Unicode in `patch.body`, `bodyJson`, and `settingsSchemaJson`, rather than converting it to mojibake, percent encoding, base64, HTML entities, or ASCII-only transliteration.

## Intents

The composer carries an "intent" badge that changes which system prompt the assistant runs under. Switch with the intent picker (label `ai.selectedIntent`); clear with `ai.clearIntent`. Built-in intents:

- **Create Widget** (`ai.createWidget`) — asks the assistant to author a Dashboard Custom Widget. Composer placeholder swaps to `ai.createWidgetPlaceholder`. Suggestion seeds at `ai.createWidgetExamples.0`..`2`. Extension-draft variant prompt `ai.extensionDraftPrompt`.
- **Watchdog** (`ai.watchdog`) — long-running observation flow. Placeholder `ai.watchdogPlaceholder`. Suggestion seeds `ai.watchdogExamples.0`..`2`.
- **Extension Draft** (`ai.extensions` / `ai.draftExtension`, `ai.extensionDraft`) — drafts a new extension. Read-only review surface tooltip `ai.extensionReviewTooltip`. Review-only flag label `ai.extensionReviewOnly`.

`ai.dashboardToolsDisabledTitle` / `ai.dashboardToolsDisabledHint` appear if Dashboard tools are turned off in Settings.

## Tool permission modes

Assistant tool calls run under one of two modes (selector label `ai.toolPermissionMode`):

- **Prompt** (`ai.toolPermissionPrompt`) — each tool call requires explicit approval.
- **Allow all** (`ai.toolPermissionAllowAll`) — tool calls run without prompting. Use deliberately.

In Prompt / Default permissions mode, mutating tool calls pause the current assistant response and show an in-chat approval card: `ai.toolApprovalTitle`, `ai.toolApprovalTool`, `ai.toolApprovalBody`, `ai.toolApprovalDetails`, `ai.toolApprovalWaiting`, `ai.toolApprovalSelectAction`, `ai.toolApprovalAllow`, `ai.toolApprovalAllowSession`, `ai.toolApprovalDeny`, `ai.toolApprovalApproved`, `ai.toolApprovalAllowedSession`, and `ai.toolApprovalDenied`. The action selector starts blank. Choosing `ai.toolApprovalAllow` approves the single tool call. Choosing `ai.toolApprovalAllowSession` approves the current tool call and later approval prompts for the same tool in the same chat window. Choosing `ai.toolApprovalDeny` rejects the tool call and stops the visible assistant turn.

### Built-in tools

Built-in AI tools default on except `settings.aiTools.email.label`. The email tool stays off until enabled in Settings because it requires delivery configuration and an email secret.

Names shown during a tool call (`ai.toolCallRunning` → `ai.toolCallComplete`):

| Tool | Key (running) | Key (done) |
|------|---------------|------------|
| Web search | `ai.toolWebSearch` | `ai.toolWebSearchDone` |
| Web fetch | `ai.toolWebFetch` | `ai.toolWebFetchDone` |
| Shell command | `ai.toolShellCommand` | `ai.toolShellCommandDone` |
| File search | `ai.toolFileSearch` | `ai.toolFileSearchDone` |
| File read | `ai.toolFileRead` | `ai.toolFileReadDone` |
| Current time | `ai.toolCurrentTime` | `ai.toolCurrentTimeDone` |
| Performance counters | `ai.toolPerformanceCounters` | `ai.toolPerformanceCountersDone` |
| Email | `ai.toolEmail` | `ai.toolEmailDone` |
| Secret request | `ai.toolSecretRequest` | `ai.toolSecretRequestDone` |
| Dashboard | `ai.toolDashboard` | `ai.toolDashboardDone` |
| Connections | `ai.toolConnections` | `ai.toolConnectionsDone` |
| Sessions | `ai.toolSessions` | `ai.toolSessionsDone` |
| Tutorial | `ai.toolTutorial` | `ai.toolTutorialDone` |

Session tools include Quick Command helpers for the terminal Quick Command Bar: `quick_command_list`, `quick_command_read`, `quick_command_create`, and `quick_command_edit`. List/read calls inspect saved per-Connection shortcuts. Create/edit save a Quick Command to the target Connection but do not run it, and they use the normal in-chat approval card in Prompt permission mode.

### Tutorial overlay

The Tutorial tool is enabled by `settings.aiTools.tutorial.label`. For UI "how do I..." questions, the assistant should answer with concise steps first and offer to navigate to the relevant UI when a known target exists. If the user accepts that offer, the assistant calls `tutorial_highlight` for an app-owned target listed in the current page context or documented by the tool. The assistant can include navigation to a known app page or Settings section before the UI dims the window, scrolls the target into view, highlights the target control, and shows a short balloon beside it. The overlay dismisses on the next click or key press.

`terminal.*`, `sftp.*`, `webview.*`, and `remoteDesktop.*` targets live inside a Workspace Tab surface. The overlay first activates an open Tab of the matching kind (preferring the already-active Tab) before highlighting. When no Tab of that kind is open it reports `ai.tutorialSurfaceNotOpen` instead of highlighting a control that is not on screen, so the assistant tells the user the surface isn't open rather than inventing steps.

Switching Tabs is also available to the Sessions tool directly: when the Sessions tool is enabled the assistant can call `session_activate_tab` with a `tabId` (and optional `paneId`) from `session_state` to bring a Tab into view and focus a Pane. Like the tutorial navigation, this only changes which Tab/Pane is shown and never opens, closes, or ends a Session, so it runs without an approval prompt.

Known tutorial targets:

- `connections.addConnection` in Workspace.
- Settings targets listed in [15-settings.md](15-settings.md), including General, Appearance, Dashboard, Credentials, AI Assistant, SSH, Terminal, URL, RDP, VNC, and About sections.

When adding a new tutorial target, add the `data-tutorial-id` anchor, route it in `src/app/tutorialNavigationModel.ts`, document it in `tutorial_highlight` metadata, and include it in the owning manual chapter's `## AI grep hints`. `npm run check` verifies the anchor and navigation registry stay aligned.

Thinking / progress markers:

- If the assistant invokes one or more Assistant Skills for a response, the assistant work panel shows green `ai.skillInvoked` status text with the skill names, matching the tool-call progress treatment.
- `ai.thinking`, `ai.thoughtFor`, `ai.workedFor`, `ai.thinkingStep`.
- Duration formatting: `ai.workDurationUnderSecond`, `ai.workDurationSeconds`, `ai.workDurationMinutesSeconds`.
- While a response is streaming, the work panel stays collapsed by default. During normal thinking it shows the rotating waiting phrase. During an active tool call the collapsed summary switches to `ai.toolCallUsing`, then returns to the waiting phrase after the tool completes.
- The expanded work panel only shows `ai.thinkingStep` when the provider streams actual reasoning text or a reasoning summary. Empty thinking rows are not shown. Reasoning text is rendered as markdown.

Waiting animation phrases rotate through `ai.waitingPhrases.0`..`ai.waitingPhrases.31`. Pre-stream state: `ai.preparingResponse`, `ai.chargingBeacon`.

## Output actions

On any assistant message:

- `ai.copy` / `ai.copyMessage` — copy markdown.
- `ai.sendToTerminal` — paste a command into the focused terminal Pane. Status `ai.addedToPane`.

Error prefix `ai.errorPrefix`. Provider-level errors include `ai.providerError`, missing endpoint/key/model `ai.providerEndpointRequired`, `ai.apiKeyRequired`, `ai.modelRequired`. Copilot-flow gate `ai.copilotConnectRequired`.

## Debug logging

`aiassistant.debug.log` is a local troubleshooting log for AI Assistant interactions. Debug builds write it automatically; release builds write full AI Assistant debug logs only when Settings → General → Debug → `settings.advancedDebugging` is enabled. The log may include raw prompts, attached context, screenshots/data URLs, tool calls/results, and generated Dashboard widget source. Debug builds also write raw built-in and remote MCP request/response records to `mcp.debug.log`; release builds write the same MCP log when `settings.advancedDebugging` is enabled. The same setting enables `installer.helper.debug.log` for Installer Helper operations and `kkterm-heartbeat.debug.log` for frontend/native liveness timing in release builds. Turning on Advanced Debugging writes an `advanced_debugging.enabled` marker to the JSONL debug logs so users can verify the option is active before the next assistant, MCP, or Installer Helper event. Users should review these files before sharing.

## Secret-request card

When a tool needs a secret it doesn't have, KKTerm renders a small "secret card" inline in the chat:

- Default headline `ai.secretCardDefaultDescription`. AI-provider variant `ai.secretCardAiProviderMessage` / `ai.secretCardAiProviderDescription`.
- Privacy note `ai.secretCardPrivacy`.
- Input `ai.secretCardInputLabel`, placeholder `ai.secretCardPlaceholder`. Show/hide `ai.secretCardShow` / `ai.secretCardHide`.
- Save `ai.secretCardSave` → `ai.secretCardSaved`. Stored inline marker `ai.secretCardStoredInline`. Stored persistent indicator `ai.secretCardStoredStatus` / `ai.secretCardStoredMessage`.
- Runtime / shape errors: `ai.secretCardRuntimeRequired`, `ai.secretCardInvalidWidgetRequest`, `ai.secretCardMissingWidget`.

Secrets land in the Windows Credential Manager under the AI-provider secret owner namespace (`AI_PROVIDER_SECRET_OWNER_ID` in `src/lib/settings.ts`).

## Providers and MCP

Provider keys (`settings.credentialKindAiApiKey`) and per-provider model selection are configured in Settings → AI (`settings.sectionAiAssistant`). The known-model picker is a real `<select>` rendered from `src/ai/providerRegistry/`; custom model IDs go in the separate custom-model input. OpenAI Compatible endpoints can also choose API mode with `settings.apiMode`. See [15-settings.md](15-settings.md) §AI.

Assistant tools (`settings.aiToolsTitle`) and Assistant Skills (`settings.assistantSkillsTitle`) are collapsed by default in Settings → AI; expand/collapse uses `common.expand` / `common.collapse`.

Assistant Skills are local SKILL.md-compatible folders managed in Settings → AI (`settings.assistantSkillsTitle`, hint `settings.assistantSkillsHint`). KKTerm ships bundled starter skills and copies missing ones into the editable app-data skills folder when skills are listed or invoked: `dashboard-widget-builder`, `dns-dhcp-troubleshooter`, `firewall-port-troubleshooter`, `network-connectivity-troubleshooter`, `remote-desktop-helper`, `sftp-transfer-helper`, `ssh-troubleshooter`, `terminal-command-planner`, and `tls-certificate-troubleshooter`. Open `settings.assistantSkillsOpenFolder`, add or edit one folder per skill, then refresh. Each valid skill can be enabled/disabled with `settings.assistantSkillsEnabled` / `settings.assistantSkillsDisabled` and opened directly with `settings.assistantSkillsOpen`. The assistant sees enabled skill metadata and must invoke `assistant_use_skill` to load full instructions; KKTerm does not use keyword matching to pick skills. v1 loads skill instructions only; bundled `scripts/` are not executed.

MCP servers are managed under Settings → Credentials (`settings.mcpServersTitle`, hint `settings.mcpServersHint`). See [15-settings.md](15-settings.md) §Credentials & MCP.
