# Localization Backlog

This file tracks English source strings that still need translation. Product implementation is English first: add or update `src/i18n/locales/en.json` during feature work, then document any untranslated keys here with enough context for later localization.

When a key is translated into every supported locale, remove its entry from this file.

## Pending Strings

### settings.customFonts
- **English value:** Custom fonts
- **Namespace:** `settings`
- **File/component:** `src/settings/AppearanceSettings.tsx`
- **UI role:** select optgroup label
- **Flow/context:** Settings → Appearance → App UI font family dropdown; groups fonts discovered in the `fonts` folder beside the app executable.
- **Tone:** Short, neutral settings label.
- **Placeholders:** None.
- **Domain notes:** Refers to user-provided app UI font files, not terminal font settings.

### settings.openCustomFontsFolder
- **English value:** Open fonts folder
- **Namespace:** `settings`
- **File/component:** `src/settings/AppearanceSettings.tsx`
- **UI role:** button text, aria-label, and title
- **Flow/context:** Button beside the App UI font family dropdown; opens or creates the `fonts` folder next to the AdminDeck executable.
- **Tone:** Direct action label.
- **Placeholders:** None.
- **Domain notes:** The folder name is literally `fonts` on disk and should stay lowercase/English if referenced explicitly.

### settings.customFontsHint
- **English value:** Custom fonts are loaded from the fonts folder beside the app executable. Supported files: .ttf, .otf, .woff, and .woff2.
- **Namespace:** `settings`
- **File/component:** `src/settings/AppearanceSettings.tsx`
- **UI role:** field hint
- **Flow/context:** Shown under the App UI font family control when at least one custom font was discovered.
- **Tone:** Informational, concise.
- **Placeholders:** None.
- **Domain notes:** Keep file extensions verbatim and mention the literal `fonts` folder.

### settings.noCustomFonts
- **English value:** No custom fonts found. Add .ttf, .otf, .woff, or .woff2 files to the fonts folder beside the app executable.
- **Namespace:** `settings`
- **File/component:** `src/settings/AppearanceSettings.tsx`
- **UI role:** empty-state field hint
- **Flow/context:** Shown under the App UI font family control when the `fonts` folder contains no supported font files.
- **Tone:** Helpful empty state.
- **Placeholders:** None.
- **Domain notes:** Keep file extensions verbatim and mention the literal `fonts` folder.

### connections.import.setUsernameButton
- **English value:** Set username
- **Namespace:** `connections`
- **File/component:** `src/connections/ImportDialog.tsx` Bulk credential toolbar
- **UI role:** Button
- **Flow/context:** Connection import preview: opens a popover to enter a username and apply it to selected rows.
- **Tone:** Concise, imperative.
- **Placeholders:** None.
- **Domain notes:** Replaces a denser inline form. Pairs with `setPasswordButton`.

### connections.import.setPasswordButton
- **English value:** Set password
- **Namespace:** `connections`
- **File/component:** `src/connections/ImportDialog.tsx` Bulk credential toolbar
- **UI role:** Button
- **Flow/context:** Mirrors the username flow; applies a password to selected rows.
- **Tone:** Concise, imperative.
- **Placeholders:** None.
- **Domain notes:** Pairs with `setUsernameButton`.

### connections.import.bulkScopeAll
- **English value:** Apply to all selected
- **Namespace:** `connections`
- **File/component:** `src/connections/ImportDialog.tsx` Bulk credential popover
- **UI role:** Radio label
- **Flow/context:** Choice within the Set username / Set password popover that overwrites every selected row.
- **Tone:** Plain.
- **Placeholders:** None.
- **Domain notes:** Mutually exclusive with `bulkScopeUnfilled`.

### connections.import.bulkScopeUnfilled
- **English value:** Only fill unfilled entries
- **Namespace:** `connections`
- **File/component:** `src/connections/ImportDialog.tsx` Bulk credential popover
- **UI role:** Radio label
- **Flow/context:** Sibling of `bulkScopeAll`; only writes to selected rows whose value is empty.
- **Tone:** Plain.
- **Placeholders:** None.
- **Domain notes:** "Entry" here means a selected import row.

### connections.import.bulkApply
- **English value:** Apply
- **Namespace:** `connections`
- **File/component:** `src/connections/ImportDialog.tsx` Bulk credential popover
- **UI role:** Button
- **Flow/context:** Confirms the bulk username/password assignment.
- **Tone:** Concise, imperative.
- **Placeholders:** None.
- **Domain notes:** Differs from generic Save/OK; specific to the popover.

### connections.import.bulkCancel
- **English value:** Cancel
- **Namespace:** `connections`
- **File/component:** `src/connections/ImportDialog.tsx` Bulk credential popover
- **UI role:** Button
- **Flow/context:** Dismisses the popover without applying.
- **Tone:** Concise, imperative.
- **Placeholders:** None.
- **Domain notes:** Maps to the standard cancel verb.

### connections.import.bulkPasswordRequired
- **English value:** Enter a password to apply.
- **Namespace:** `connections`
- **File/component:** `src/connections/ImportDialog.tsx` Bulk credential popover
- **UI role:** Inline error
- **Flow/context:** Shown when the user clicks Apply without entering a password.
- **Tone:** Plain, instructive.
- **Placeholders:** None.
- **Domain notes:** Mirrors `bulkUserRequired`.
