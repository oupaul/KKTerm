# Localization Backlog

This file tracks English source strings that still need translation. Product implementation is English first: add or update `src/i18n/locales/en.json` during feature work, then document any untranslated keys here with enough context for later localization.

When a key is translated into every supported locale, remove its entry from this file.

## Pending Strings

### `settings.satoshiDefault`

- English: "Satoshi (Default)"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This is the first option and identifies Satoshi as the app default UI font.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Keep the font family name `Satoshi` in English. Translate only the parenthetical default marker if appropriate.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.jfOpenHuninn`

- English: "jf open Huninn"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses the bundled `src/assets/fonts/jf-openhuninn-2.1.ttf` UI font.
- Tone: Neutral, product font name
- Placeholders: None
- Domain notes: Font family names should usually remain in their original branding. This is the user-facing label for the bundled Traditional Chinese-friendly font.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.segoeUi`

- English: "Segoe UI"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses the Windows UI font family.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.arial`

- English: "Arial"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses the Windows Arial font family.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.microsoftJhengHeiUi`

- English: "Microsoft JhengHei UI"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses a Windows Traditional Chinese UI font.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.microsoftYaHeiUi`

- English: "Microsoft YaHei UI"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses a Windows Simplified Chinese UI font.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.yuGothicUi`

- English: "Yu Gothic UI"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses a Windows Japanese UI font.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.malgunGothic`

- English: "Malgun Gothic"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses a Windows Korean UI font.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.tahoma`

- English: "Tahoma"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses the Windows Tahoma font family.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.consolas`

- English: "Consolas"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings font selector. This option chooses the Windows Consolas font family.
- Tone: Neutral, system font name
- Placeholders: None
- Domain notes: Keep the Microsoft font family name in English. Consolas is monospaced and commonly used for code and terminal text.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.customFont`

- English: "Custom font"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label and status value
- Context: Appearance settings font selector. This appears only if a previously saved font stack does not match one of the curated options.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: This hides a legacy raw CSS font-family stack while preserving the saved value until the user chooses another option.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.schemeDefault`

- English: "Default"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings color scheme selector. Label for the built-in Default color scheme.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Naming convention follows OS display theme labels.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.schemeDark`

- English: "Dark"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings color scheme selector. Label for the Dark color scheme (dark background, light text).
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Standard display appearance term. Translate as the standard adjective.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.schemeLight`

- English: "Light"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings color scheme selector. Label for the Light color scheme (pure white background, dark blue text, high contrast).
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Standard display appearance term. Translate as the standard adjective.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.schemeMac`

- English: "Mac"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings color scheme selector. Label for the Mac-inspired color scheme (latest macOS-like grays and accent).
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Keep `Mac` as the proper name.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.schemeOrange`

- English: "Orange"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings color scheme selector. Label for the Orange color scheme (light orange background, black text).
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Color name. Translate as the standard color word.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.schemePurple`

- English: "Purple"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings color scheme selector. Label for the Purple color scheme (dark purple background, light text).
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Color name. Translate as the standard color word.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.schemePink`

- English: "Pink"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Select option label
- Context: Appearance settings color scheme selector. Label for the Pink color scheme (light pink background, dark purple text).
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Color name. Translate as the standard color word.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.colorSchemePreview`

- English: "Preview"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Label for color swatch preview row
- Context: Appearance settings color scheme selector. Small label above a row of 5 color swatches that preview the selected scheme's key colors (background, surface, text, accent, green).
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Standard UI term for a live preview of a selection.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.appBg`

- English: "Background"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Color swatch label inside preview
- Context: Appearance settings color scheme preview. Label inside a colored swatch indicating the app background color of the selected scheme.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Standard UI color role label.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.surface`

- English: "Surface"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Color swatch label inside preview
- Context: Appearance settings color scheme preview. Label inside a colored swatch indicating the surface/panel background color of the selected scheme.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Standard UI color role label.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.text`

- English: "Text"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Color swatch label inside preview
- Context: Appearance settings color scheme preview. Label inside a colored swatch indicating the primary text color of the selected scheme.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Standard UI color role label.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.accent`

- English: "Accent"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Color swatch label inside preview
- Context: Appearance settings color scheme preview. Label inside a colored swatch indicating the accent/highlight color of the selected scheme.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Standard UI color role label.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.green`

- English: "Green"
- Namespace: `settings`
- Appears in: `src/settings/AppearanceSettings.tsx`
- UI role: Color swatch label inside preview
- Context: Appearance settings color scheme preview. Label inside a colored swatch indicating the success/green color of the selected scheme.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Color name used as UI semantic role label.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

## Entry Template

```markdown
### `namespace.key.path`

- English: "Text shown in the UI"
- Namespace: `namespace`
- Appears in: `src/path/Component.tsx`
- UI role: Button label | field label | aria-label | tooltip | status | error | dialog title | sentence fragment
- Context: Explain what the user is doing, what state causes this text to appear, and what surrounding labels or controls are nearby.
- Tone: Neutral | concise | warning | destructive | friendly
- Placeholders: Describe each placeholder, including example values and whether order may change in other languages.
- Domain notes: Explain product-specific meaning, and list technical terms that should remain in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id
```
