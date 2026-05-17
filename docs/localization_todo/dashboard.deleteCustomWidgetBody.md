# dashboard.deleteCustomWidgetBody

- **English value**: `This deletes the AI Created Widget "{{name}}" and all its instances from every Dashboard view. This cannot be undone.`
- **Namespace**: `dashboard`
- **File/component**: `src/dashboard/edit/CatalogOverlay.tsx`
- **UI role**: `fragment`
- **User flow**: `Shown in the confirmation dialog when deleting an AI Created Widget from the catalog. It warns that every placed instance on every Dashboard view will also be removed.`
- **Tone**: `clear/destructive warning`
- **Placeholders**: `{{name}}`: the AI Created Widget title.
- **Domain notes**: `Dashboard views can contain multiple instances of the same AI Created Widget; the warning must preserve that all instances are deleted.`

