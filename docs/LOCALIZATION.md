# Localization Backlog

This file tracks English source strings that still need translation. Product implementation is English first: add or update `src/i18n/locales/en.json` during feature work, then document any untranslated keys here with enough context for later localization.

When a key is translated into every supported locale, remove its entry from this file.

## Pending Strings

### ai.pastedImageSource

- English value: `Pasted image`
- Namespace: `ai`
- File/component: `src/ai/AssistantPanel.tsx`
- UI role: label
- Surrounding user flow: User pastes an image into the AI Assistant composer and the composer shows the attached image preview.
- Tone: Short, neutral, descriptive.
- Placeholder details: None.
- Domain notes: Refers to an image/screenshot pasted from the clipboard, not a saved Connection or Session artifact.

### ai.imageInputNotSupported

- English value: `This model does not support image input, so pasted screenshots are not sent.`
- Namespace: `ai`
- File/component: `src/ai/AssistantPanel.tsx`
- UI role: status notice
- Surrounding user flow: User pastes a screenshot or has an image context while the selected AI provider/model cannot accept image input.
- Tone: Subtle, factual, non-blocking.
- Placeholder details: None.
- Domain notes: "Model" means the selected AI model in Settings/assistant picker; image input means multimodal image content sent to the provider API.

