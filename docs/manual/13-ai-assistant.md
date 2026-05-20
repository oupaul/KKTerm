# 13 — AI Assistant

## AI grep hints

- Keys: `ai.*` (full namespace), `app.aiAssistant`, `settings.mcp*`, `settings.assistantSkills*`, `settings.sectionAiAssistant`, `settings.credentialKindAiApiKey`, `settings.aiTools.tutorial.*`
- Topics: AI panel, chats, new chat, history, SQLite, tool permission modes, tool defaults, Assistant Skills, bundled skills, SKILL.md, Tutorial overlay, intents (Watchdog / Create Widget / Extension Draft), MCP servers, attachments (files, screenshots, terminal buffer), provider keys, send-to-terminal
- Synonyms: "chat", "copilot", "AI bot", "tools", "approval", "MCP", "agent", "skill", "skills", "SKILL.md", "workflow", "ssh-troubleshooter", "dashboard-widget-builder", "terminal-command-planner", "sftp-transfer-helper", "remote-desktop-helper", "watchdog", "highlight this", "show me where", "where are chats stored", "clear chat storage"

## Panel

Right-side resizable, collapsible. Title `ai.title`. Refresh `ai.refresh`. Settings shortcut `ai.settings`. New chat `ai.newChat` (`ai.newAiChat`). Collapse `ai.collapsePanel` (resize handle `app.resizeAiAssistant`). Empty state `ai.noActiveSession` plus `ai.workspace` indicator. The same panel is available on Workspace, Dashboard, and Settings; on Settings it shows `ai.settingsContextLabel` as the context detail and receives the active Settings section plus visible control keys.

## Chat history

Header `ai.chats`. View all `ai.viewAll` → dialog `ai.allChats`. Empty `ai.noChatsYet`. Per-chat:

- Open / close: `ai.close`, `ai.closeChatHistory`.
- Delete: `ai.deleteChat`.
- No-messages state: `ai.noMessages`. Saved indicator `ai.saved`.

Chat history is stored in SQLite table `assistant_chat_threads`, indexed for recent-first history loading. Older WebView2 `localStorage` history under `kkterm.aiAssistant.chatHistory.v1` is migrated into SQLite on startup and then removed. The unsent composer draft is temporary `sessionStorage` under `ai-chat-draft`.

## Composer

Default placeholder `ai.composerPlaceholder`. Send `ai.sendMessage` / `ai.send`. Stop in-flight `ai.stopMessage`. Copy `ai.copy` / `ai.copyMessage`. Code label `ai.code`. Show-less / more `ai.showLess` / `ai.more`.

### Attachments

- Add context: `ai.addContext`.
- Add files: `ai.addFiles`. Attached files header `ai.attachedFiles`. Too-large `ai.fileTooLarge`. Remove `ai.removeFileAttachment`.
- Add screenshot: `ai.addScreenshot`. See [14-screenshots.md](14-screenshots.md).
- Add terminal buffer: `ai.addTerminalBuffer`.
- Pasted images: `ai.pastedImages`, `ai.pastedImageSource`, `ai.pastedImageSourceWithNumber`. Remove `ai.removeImageAttachment`. Preview `ai.openImagePreview` / `ai.imagePreviewTitle`.
- Image input unsupported (current provider model): `ai.imageInputNotSupported`.

`ai.clearContext` clears the current chat's pinned context.

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

### Tutorial overlay

The Tutorial tool is enabled by `settings.aiTools.tutorial.label`. It lets the assistant call `tutorial_highlight` for app-owned targets listed in the current page context. The UI dims the window, highlights the target control, and shows a short balloon beside it. The overlay dismisses on the next click or key press. Example: while Settings → Appearance is active, a color/theme question can highlight the fieldset carrying target `settings.appearance.colorScheme` and explain `settings.colorScheme`.

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

Assistant Skills are local SKILL.md-compatible folders managed in Settings → AI (`settings.assistantSkillsTitle`, hint `settings.assistantSkillsHint`). KKTerm ships bundled starter skills and copies missing ones into the editable app-data skills folder when skills are listed or invoked: `dashboard-widget-builder`, `remote-desktop-helper`, `sftp-transfer-helper`, `ssh-troubleshooter`, and `terminal-command-planner`. Open `settings.assistantSkillsOpenFolder`, add or edit one folder per skill, then refresh. Each valid skill can be enabled/disabled with `settings.assistantSkillsEnabled` / `settings.assistantSkillsDisabled` and opened directly with `settings.assistantSkillsOpen`. The assistant sees enabled skill metadata and must invoke `assistant_use_skill` to load full instructions; KKTerm does not use keyword matching to pick skills. v1 loads skill instructions only; bundled `scripts/` are not executed.

MCP servers are managed under Settings → Credentials (`settings.mcpServersTitle`, hint `settings.mcpServersHint`). See [15-settings.md](15-settings.md) §Credentials & MCP.
