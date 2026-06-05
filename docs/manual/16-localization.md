# 16 — Localization

## AI grep hints

- Keys: `settings.language`, `languages.*` (native language names)
- Topics: changing language, supported locales, source-of-truth English, dynamic locale loading, fallback
- Synonyms: "change language", "switch locale", "i18n", "translation", "中文", "繁體"

## Supported locales

| File | Language |
|------|----------|
| `en.json` | English (bundled, source of truth) |
| `fr.json` | French |
| `it.json` | Italian |
| `de.json` | German |
| `es.json` | Spanish |
| `es-MX.json` | Spanish (Mexico) |
| `pt-BR.json` | Portuguese (Brazil) |
| `zh-TW.json` | Traditional Chinese |
| `zh-CN.json` | Simplified Chinese |
| `ja.json` | Japanese |
| `ko.json` | Korean |
| `th.json` | Thai |
| `id.json` | Indonesian |
| `vi.json` | Vietnamese |

> **`vi.json` frequently falls behind.** Vietnamese was added later than the other locales and has a pattern of accumulating missing keys after feature releases. When running a localization pass, always verify `vi.json` coverage first even if the other 12 locales are complete.

Native language names come from the `languages` namespace in each locale file. English is bundled with the app; everything else loads on demand via dynamic `import()`. The active locale is persisted in `localStorage` under `kkterm.language` and survives restarts.

## Switching language

Settings → General → Language (`settings.language`). Hot-swap via `switchLanguage()` in `src/i18n/config.ts`; `ensureI18nReady()` handles startup. Changes take effect immediately — no app restart.

## Source-of-truth rules (developer-facing)

Detailed rules are in `docs/ARCHITECTURE.md` §Internationalization. Summary:

1. Every user-visible string must go through `t()` / `useTranslation()`. Bare English in JSX is a bug.
2. English changes happen in `src/i18n/locales/en.json` first.
3. Pending translations are tracked one-key-per-file under `docs/localization_todo/` (copy `_TEMPLATE.md`). Delete the corresponding file when a translation lands.
4. Only update non-English locale files when intentionally translating; keep all 14 locale JSON files structurally aligned. `en.json` defines the canonical namespace/key order for every locale. Insert translated keys in the same relative position, run `npm run i18n:normalize` if order drifts, and always run `npm run i18n:check` during translation runs to compare every locale against `en.json` for missing, redundant, and misordered keys.
5. Renames must update every locale file plus the matching `docs/localization_todo/` filename.
6. Prefer context-specific keys over reusing one key. When a single English word covers meanings that other languages translate differently — e.g. "Play" for start-media vs. run vs. a theatrical play — add a separate key per context and name it after the meaning, not the spelling. Reuse a key only when the meaning is identical everywhere it appears.
7. Keep placeholders translation-safe. Use named i18next placeholders (`{{count}}`, `{{host}}`) so translators can reorder them, keep one full sentence per key (never concatenate keys or fragments around a variable), and confirm every `{{…}}` token survives unchanged in each locale. Prefer i18next plural/context features over English-shaped string assembly.

Technical terms (SSH, SFTP, RDP, VNC, tmux, ProxyJump, PowerShell, WSL, API, URL) typically stay English across languages.

## Namespaces

`app`, `settings`, `connections`, `terminal`, `sftp`, `webview`, `remoteDesktop`, `ai`, `watchdog`, `workspace`, `common`, `languages`, `manual`, plus feature namespaces `dashboard`, `appLauncher`, `screenshots`, `installer`. Each chapter of this manual lists which namespaces are in scope.

## Typed key autocomplete

In TypeScript code, `useT()` from `src/i18n/useT.ts` autocompletes keys from the English JSON shape. Outside React, import `i18next` from `src/i18n/config.ts` and call `i18next.t(key)` directly.
