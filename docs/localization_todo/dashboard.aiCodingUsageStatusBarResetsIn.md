# dashboard.aiCodingUsageStatusBarResetsIn

- **English value**: `resets in {{time}}`
- **Namespace**: `dashboard`
- **File/component**: `src/ai-coding-usage/AiCodingUsageStatusBar.tsx`
- **UI role**: `aria-label fragment`
- **User flow**: `Spoken alongside the per-provider 5-hour usage indicator in the status bar to tell assistive tech how long until the limit resets.`
- **Tone**: `concise informational`
- **Placeholders**: `{{time}} = relative duration like "2h 14m" or "12m"`
- **Domain notes**: `"5-hour limit" is the rolling Codex / Claude Code quota window; this string carries the remaining duration, not an absolute timestamp.`
