# Settings Font Picker Clarity

## Goal

Make the font controls in Settings → Appearance and Settings → Terminal easier to understand and scan.

## User-visible behavior

- Both font controls show this description through i18n: “Press the refresh button to get system fonts. To use custom fonts, put them in the fonts folder.”
- The Open fonts folder action is an icon-only button. Its localized tooltip and accessible name remain `settings.openCustomFontsFolder`.
- Each native font select separates its entries into three labeled groups, in this order: Custom fonts, Recommended, and System fonts. Empty Custom fonts and System fonts groups are omitted.
- System-font refresh prefers English family names from font metadata. When a font provides both a localized alias and an English family name, only the English name is returned, avoiding entries such as “微軟正黑體” beside “Microsoft JhengHei.”

## Implementation boundaries

- Keep the existing native `<select>` controls and represent all three sections with `<optgroup>`.
- Add one `settings.recommendedFonts` translation key and update the existing shared font-description key in English. Follow the localization TODO workflow for untranslated changes.
- Keep font scanning in `src-tauri/src/media.rs`, font-list filtering in `src/lib/systemFonts.ts`, and Settings rendering in the existing Appearance and Terminal components.
- Do not introduce a custom dropdown, new font persistence, or changes to font selection values.

## Verification

- Add focused frontend coverage for the shared description, icon-only folder controls, and the three optgroup labels in both Settings components.
- Add Rust unit coverage proving that English family metadata is preferred over localized family metadata when both exist.
- Run only the focused checks needed for this small change; the repository's full suite is not required.

