# Localization Backlog

This file tracks English source strings that still need translation. Product implementation is English first: add or update `src/i18n/locales/en.json` during feature work, then document any untranslated keys here with enough context for later localization.

When a key is translated into every supported locale, remove its entry from this file.

## Pending Strings

- `ai.attachedFiles`
  - English: `Attached files ({{count}})`
  - Namespace: `ai`
  - File/component: `src/ai/AssistantPanel.tsx`
  - UI role: label
  - Flow: AI Assistant composer, after the user chooses one or more non-image files from the `+` menu.
  - Tone: concise desktop UI label.
  - Placeholders: `{{count}}` is the number of currently attached files.
  - Domain notes: These are transient AI Assistant context attachments, not durable wiki or SFTP attachments.

- `ai.removeFileAttachment`
  - English: `Remove {{label}}`
  - Namespace: `ai`
  - File/component: `src/ai/AssistantPanel.tsx`
  - UI role: aria-label/tooltip
  - Flow: AI Assistant composer file attachment preview remove button.
  - Tone: direct action label.
  - Placeholders: `{{label}}` is the selected file name.
  - Domain notes: Removing the attachment only removes it from the pending AI Assistant prompt.

- `ai.fileTooLarge`
  - English: `{{name}} is larger than 10 MB.`
  - Namespace: `ai`
  - File/component: `src/ai/AssistantPanel.tsx`
  - UI role: status/warning
  - Flow: AI Assistant composer file picker rejects a selected file over the per-file attachment cap.
  - Tone: plain warning.
  - Placeholders: `{{name}}` is the selected file name.
  - Domain notes: The size limit applies to transient AI Assistant file/photo context only.
