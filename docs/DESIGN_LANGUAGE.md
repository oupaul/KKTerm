# KKTerm Design Language

KKTerm's UI follows one Apple/Finder-flavoured design language. This document is
the source of truth for that language: read it before adding any dialog, sheet,
settings surface, or file-browser UI so new work stays consistent.

The reference appearance is the **Default** color scheme (light) and the **Dark**
color scheme. Both are tuned to match the design exactly; every other scheme
reuses the same components and tokens, so building against the tokens makes new
UI theme automatically across all 14 schemes.

## Color tokens

Tokens live in `src/styles/colorSchemes.css`. Each scheme sets the same token
names; **always read these, never hard-code hex** (hard-coded colors break the
other schemes and dark mode).

Core: `--app-bg`, `--surface`, `--surface-muted`, `--chrome`, `--chrome-strong`,
`--text`, `--text-muted`, `--text-faint`, `--border`, `--border-strong`,
`--accent`, `--accent-soft`, `--green`, `--amber`, `--red`, `--shadow`,
`--app-ui-font-family`.

Design-language surface tokens (added for this language): `--hover`, `--press`,
`--hairline`, `--accent-press`, `--sel`, `--sel-soft`, `--folder-top`,
`--folder-bot`, `--doc-fill`, `--doc-stroke`, `--ring`. Exact values are authored
for Default + Dark; all other schemes derive them with `color-mix()` in the
`:where(:root)` block so they adapt light/dark on their own.

Font: `--app-ui-font-family` resolves to SF Pro on macOS and bundled **Inter** on
Windows (`-apple-system, "SF Pro Text", "SF Pro Display", "Inter", "Segoe UI"`).
Inter is also selectable explicitly in Settings → Appearance.

## Dialog primitives — `src/app/ui/dialog/`

Build dialogs from these typed primitives instead of bespoke markup. Import from
`@/app/ui/dialog` (relative `src/app/ui/dialog`). All text is passed in **already
translated** — primitives contain no English.

- `DialogShell` — portal + dimmed backdrop (`onBackdrop` for click-to-dismiss).
- `Sheet` — the panel: `width`, optional `eyebrow`/`title`/`sub`, `footer`,
  `onClose`. **Only pass `onClose` when there is no footer dismiss action**
  (AGENTS.md close-X rule) — the X renders only then.
- `Field`, `TextInput`, `TextArea`, `Select`, `Switch`, `Segmented`, `Stepper`.
- `Group` + `GRow` — grouped option cards (icon, label, description, control).
- `Btn` (`kind`: `""` | `primary` | `danger` | `ghost`) and `Actions`.
- `ConnTile` + `Swatches` — connection identity tile and accent swatches.
- `DIcon` — the shared SF-Symbols-ish glyph set (`src/app/ui/dialog/icons.tsx`).

CSS: `src/app/ui/dialog/dialogs.css`, kk- prefixed classes aliased onto the app
tokens. Existing shared dialog classes (`.connection-dialog`, `.settings-*`,
`.primary-button`, `.secondary-button`, dialog inputs, `.dialog-backdrop`) are
restyled in `src/styles/base.css` to the same language, so legacy dialogs match.

`TextInput` and `TextArea` default to the shared technical-input behaviour from
`src/lib/inputBehavior.ts`, disabling autocorrect, autocapitalization, and
spellcheck for machine-oriented dialog fields. Callers may override those props
only for prose fields where spelling assistance is useful.

### Button order (Windows)

KKTerm is Windows-first: the primary/confirm action comes **immediately before**
Cancel, and the action group anchors bottom-right. `Actions` defaults to this via
`DialogConventionProvider` value `windows`. Do not reorder per-dialog.

### Titles

One concise title by default (no subtitle/explanatory header unless the flow
truly needs it — put supporting text in the body near the relevant control).

## Confirmation template — `ConfirmSheet`

Use `ConfirmSheet` for every confirmation; do not hand-roll alert dialogs. It is
a compact sheet with a tinted glyph, single title, optional body, footer in
Windows order, and no title-bar X. Three presets:

- `tone="info"` — informational / run-command confirmations (accent glyph).
- `tone="danger"` — destructive deletes (red glyph, danger confirm button).
- `tone="warn"` + `extraLeft` "Don't Save" — unsaved-changes (amber glyph).

`src/app/ConfirmDialog.tsx` and `DeleteConfirmationDialog.tsx` are thin wrappers
over `ConfirmSheet`, so existing call sites already use it. The unsaved-changes
preset is a **template only** — never wire it to app-window close (High-Risk
Invariant: no frontend close hooks).

## SFTP / file browser pattern

`src/modules/workspace/connections/sftp/` is the reference file-manager surface:
symmetric dual-pane (Local | center transfer-arrow gutter | Remote), per-pane
breadcrumb with double-click-to-edit path, List + Gallery view switch, sortable
columns, a collapsible transfer-activity bar, and a styled DOM context menu with
Copy Path / Get Info. Reuse `FilePane` and these patterns for new browser UIs.

> The SFTP context menu is a styled DOM menu — a deliberate, documented exception
> to the "simple Workspace command menus use native menus" rule, because the
> design specifies a styled Finder-like menu and the menu pre-dates that rule.

## Checklist for new UI

1. Read tokens; never hard-code colors.
2. Compose from `src/app/ui/dialog` primitives; confirmations use `ConfirmSheet`.
3. Windows button order; one concise title; close-X only without a footer dismiss.
4. Route every string through `t()`; add `en.json` keys + a
   `docs/localization_todo/` pending file (see that README).
5. Verify in Default and Dark plus one extra scheme in the real Tauri runtime.
