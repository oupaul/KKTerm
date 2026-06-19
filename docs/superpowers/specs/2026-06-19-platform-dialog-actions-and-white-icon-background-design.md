# Platform Dialog Actions and White Icon Background Design

## Goal

Make every app-owned dialog follow the host platform's action-button convention,
and add white to every shared icon-background color picker.

## Confirmed behavior

- macOS dialog action groups end with `Cancel` followed by the primary action,
  so the primary action occupies the bottom-right edge.
- Windows and Linux action groups end with the primary action followed by
  `Cancel`, preserving the current Windows ordering on Linux.
- Auxiliary actions such as Back, Don't Save, destructive alternatives, or
  secondary operations stay separate from the primary/Cancel pair rather than
  being blindly reversed with it.
- Dialogs with only one dismiss action do not need platform-specific reordering.
- White is available anywhere KKTerm presents the shared circular palette for
  an icon background, including Workspace, Connection, folder, and Child
  Connection Tab icon editing.
- The white swatch remains visibly bounded on light surfaces and keeps the same
  selected-ring treatment as the existing colors.

## Architecture

The typed dialog kit in `src/app/ui/dialog/` remains the source of truth. Its
`Actions` primitive already has named `primary`, `cancel`, and `extraLeft`
slots and already selects macOS versus Windows behavior from the runtime
platform. Linux intentionally follows the Windows branch.

Legacy dialogs currently hand-author `.dialog-actions` rows. Add one small
legacy adapter that renders those same named slots through the shared `Actions`
primitive while retaining the legacy row and button styling. Migrate every
multi-action app-owned legacy footer found by the repository scan to that
adapter. This avoids CSS `row-reverse`, which incorrectly reverses auxiliary
actions in three-button dialogs. Remove the Connection sidebar's local
`DIALOG_ACTIONS_CLASS`/`mac-order` workaround once all affected footers use the
shared convention.

Keep single-action Close/Cancel footers unchanged unless adopting the adapter
materially simplifies the containing dialog. Confirmation dialogs already
using `ConfirmSheet` remain unchanged because they inherit `Actions` behavior.

The two shared icon-background palettes are
`ConnectionIconBackgroundPicker` and `DIALOG_ACCENTS`/`Swatches`. Add white to
both palettes in their existing ordering, after gray, and ensure both swatch
styles provide enough border contrast for white. Do not add a free-form color
picker or change persisted color formats.

## Dialog audit scope

The implementation scan covers all app-owned popup dialog action rows, not just
Workspace and Connection dialogs. This includes legacy dialog surfaces under:

- Workspace and Connection management, including import and child properties.
- Settings and MCP configuration.
- App update prompts.
- Install Helper and WSL management.
- Dashboard-owned popup dialogs.

For each footer, classify actions as primary, cancel/dismiss, or auxiliary and
map them to named slots. Do not infer ordering from source position. Non-dialog
toolbars, inline forms, widget footers, and operating-system native dialogs are
outside this change.

## Documentation

Update `AGENTS.md` and `docs/DESIGN_LANGUAGE.md` so the platform convention is
explicit and future dialogs must use `Actions` or the legacy adapter rather
than hand-authored button order. Update the shipped manual chapters whose UI
behavior changes:

- `docs/manual/02-app-layout.md` for Workspace icon editing.
- `docs/manual/03-connections.md` for icon-background palette behavior.

Manual text will reference existing i18n keys and will not introduce visible
English UI strings. No localization todo is required unless implementation
unexpectedly needs a new user-visible label.

## Testing and verification

Add focused regression coverage that verifies:

- The shared convention resolves macOS to Cancel/Primary and Windows/Linux to
  Primary/Cancel.
- Legacy multi-action dialog footers use the platform-aware adapter instead of
  raw ordering or the `mac-order` CSS workaround.
- Both shared icon-background palettes contain white.
- Existing footer policy rules, including no duplicate close X and
  `ConfirmSheet` confirmation usage, remain intact.

Run the focused dialog and palette tests, then `npm run check` and
`npm run build` if the final code change crosses the repository's significant
change threshold or the focused checks reveal wider coupling. Visual
verification should cover a representative Workspace dialog and a
three-action dialog on macOS ordering, plus a light-theme white swatch.

## Non-goals

- Redesigning dialog layout, copy, typography, or button appearance.
- Migrating every legacy dialog to the complete `Sheet` component.
- Changing native OS dialogs or non-dialog action bars.
- Adding arbitrary/custom icon colors.
