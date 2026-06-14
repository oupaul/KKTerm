# Localization Backlog

![Downloads](https://img.shields.io/github/downloads/ryantsai/KKTerm/total)

Each pending English string lives in its own file in this directory. One key per file. This replaces the previous single `docs/LOCALIZATION.md` so feature branches can add or remove pending strings without colliding.

## Filename Convention

`<namespace>.<keyPath>.md` — dots from the i18n key path stay as dots, slashes are not allowed.

Examples:
- `ai.dashboardToolsDisabledTitle.md`
- `settings.general.languageHint.md`

## Flow

Every new or changed user-visible English key added to `src/i18n/locales/en.json`
must get a matching `docs/localization_todo/<namespace>.<keyPath>.md` file in
the same change. Add the file even when you also add best-effort translations to
every non-English locale, because the backlog is the explicit review record for
new translation work. Before finishing, run `npm run i18n:check` to prove every
locale contains the key in the same relative order.

When you add or change an English key in `src/i18n/locales/en.json` and do **not** translate it into the other 13 locales in the same change:

1. Copy `_TEMPLATE.md` to `<namespace>.<keyPath>.md`.
2. Fill in every field.
3. Keep the English key in its intended namespace position; `en.json` is the source of truth for locale key order.
4. Commit the file alongside the `en.json` change.

When you (or a localization pass) translate the key into every supported locale:

1. Update each non-English locale file under `src/i18n/locales/`.
2. Insert translated keys in the same relative order as `src/i18n/locales/en.json`; run `npm run i18n:normalize` if a locale drifts.
3. For related regional locales, translate independently instead of copying from the sibling locale. Cross-locale translation bleed is forbidden even when scripts or words look similar: `zh-CN` and `zh-TW`, `es-ES` and `es-MX`, and `pt-PT` and `pt-BR` must use their own script, spelling, and regional terminology.
4. Run `npm run i18n:check` and fix any missing, redundant, or misordered keys before finishing the translation run.
5. **Delete** the matching `docs/localization_todo/<namespace>.<keyPath>.md` file.

When you rename or remove a key:

1. Update `en.json` and every non-English locale that touched the key.
2. Run `npm run i18n:check` and fix any missing, redundant, or misordered keys.
3. Rename or delete the matching `docs/localization_todo/*.md` file to match.

## Why per-file

The previous single-file backlog generated merge conflicts on every feature branch that touched UI strings. Per-key files let independent branches add, remove, and translate entries without touching shared lines.

## Template

See [`_TEMPLATE.md`](_TEMPLATE.md). Do not edit `_TEMPLATE.md` for a real string — copy it first.
