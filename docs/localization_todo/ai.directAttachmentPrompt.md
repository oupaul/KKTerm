# ai.directAttachmentPrompt

- **English value**: `Help me with this. Explain what you see, and if it looks like an error, warning, or problem, do your best to explain how to fix it.`
- **Namespace**: `ai`
- **File/component**: `src/ai/AssistantPanel.tsx`
- **UI role**: `fragment`
- **User flow**: `Used as the implicit prompt when a Workspace Send to AI Assistant action directly submits a screenshot or terminal buffer attachment. The user may see it as their submitted chat message.`
- **Tone**: `plain helpful request`
- **Placeholders**: `none`
- **Context/meaning**: `This is a user prompt to the AI Assistant, not button text or a status message.`
- **Domain notes**: `Keep the instruction broad enough for terminal text and screenshots across terminal, SSH, RDP, and VNC surfaces.`

<!--
Filename: ai.directAttachmentPrompt.md (e.g. ai.dashboardToolsDisabledTitle.md)
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
