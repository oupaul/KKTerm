# KKTerm — Apple/Finder-flavoured desktop UI kit

KKTerm's design language is **macOS/Finder-inspired**: hairline borders, soft
shadows, 8–14px radii, a restrained system palette, and the Inter typeface
(standing in for SF Pro). Components are **prop-driven** — there are **no utility
classes** to compose with. You style layout and your own glue with the **CSS
custom properties (tokens)** below; you style components by passing their props.

## Setup — no provider needed for styling
Tokens and fonts are global: importing the design system's `styles.css` puts the
`:root` token palette and the Inter/JetBrains Mono `@font-face`s on the page, and
every component themes off them automatically. There is **no ThemeProvider** to
wrap. Just render components and use the tokens.

Two optional context pieces exist (don't reach for them unless you need them):
- `DialogConventionProvider value="mac" | "windows"` — flips dialog footer button
  order. Defaults to the host platform; wrap a subtree to force one.
- A few components (`ConfirmSheet`, `ColorPalettePicker`) read i18n for *default*
  labels. Always pass explicit text props (`confirmLabel`, `cancelLabel`, …) and
  you never depend on an i18n runtime.

## The styling idiom — tokens, not classes
Read the real definitions in the bound `styles.css` and its `_ds_bundle.css`
import. Core tokens (all `var(--…)`):

| Token | Use |
|---|---|
| `--surface`, `--surface-muted` | panel / field backgrounds |
| `--app-bg`, `--chrome` | window + toolbar fills |
| `--text`, `--text-muted`, `--text-faint` | text hierarchy |
| `--border`, `--border-strong`, `--hairline` | dividers / outlines |
| `--accent`, `--accent-soft`, `--accent-press` | primary blue (#0a84ff) |
| `--green`, `--amber`, `--red` | status / semantic |
| `--radius-sheet` (14px), `--radius-field` (8px) | corner radii |
| `--ring` | focus ring shadow |

Example glue: `style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 10, color: "var(--text)" }}`.

## Components (import from the design system package)
**Dialogs** (`group: dialog`)
- `Sheet` — the dialog panel (`eyebrow`, `title`, `sub`, `footer`, `width`,
  `onClose`). Renders inline; wrap in `DialogShell` for a modal backdrop + portal.
- `DialogShell` — full-screen dimmed backdrop + portal (`onBackdrop`).
- `ConfirmSheet` — ready-made alert. `tone="info" | "danger" | "warn"`, `title`,
  `message`, `confirmLabel`, `cancelLabel`, optional `extraLeft` (e.g. a
  "Don't Save"). Brings its own `DialogShell`.
- `Actions` — footer button row in platform order (`cancel`, `primary`, `extraLeft`).
- `Btn` — `kind="" | "primary" | "danger" | "ghost"`, `icon`, `sm`, `wide`.
- Form controls: `Field` (label/hint/req wrapper), `TextInput` (`mono`),
  `TextArea`, `Select` (`options`), `Switch`, `Segmented`, `Stepper`,
  `Group` + `GRow` (settings-list rows), `Swatches`, `ConnTile`.
- `DIcon name=…` — the SF-Symbols-ish glyph family (e.g. `terminal`, `server`,
  `gear`, `trash`, `check`, `plus`, `package`, `dashboard`).

**Settings**
- `ToggleSwitch` — controlled iOS-style switch (`checked`, `onChange`, `disabled`).

**App chrome** (`group: app`)
- `ModuleHeader` + `ModuleHeaderLead`, `ModuleIconTile module="workspace" |
  "dashboard" | "installer" | "itops"`, `ModuleHeaderTitle`, `ModuleHeaderDivider`,
  `ModuleHeaderSpacer` — the translucent module title bar with a gradient icon tile.
- `ColorPalettePicker` — rainbow trigger opening a hex/color-wheel popover
  (`value`, `onChange`).

Each component's `.d.ts` is the authoritative prop contract; its `.prompt.md`
has usage detail.

## Idiomatic example
```tsx
<DialogShell onBackdrop={close}>
  <Sheet
    eyebrow="SSH"
    title="New Connection"
    sub="Connect to a remote host"
    width={440}
    footer={
      <Actions
        cancel={<Btn onClick={close}>Cancel</Btn>}
        primary={<Btn kind="primary" icon="check" onClick={save}>Connect</Btn>}
      />
    }
  >
    <Field label="Host"><TextInput mono defaultValue="db.example.com" /></Field>
    <Group title="General">
      <GRow icon="bolt" label="Cursor blink" control={<Switch on />} />
    </Group>
  </Sheet>
</DialogShell>
```
