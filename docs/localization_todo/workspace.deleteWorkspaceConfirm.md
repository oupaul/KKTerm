# workspace.deleteWorkspaceConfirm

- **English value**: `Delete "{{name}}" and all of its connections? This cannot be undone.`
- **Namespace**: `workspace`
- **File/component**: `src/modules/workspace/WorkspaceRailDialogs.tsx`
- **UI role**: `error`
- **User flow**: Confirmation body shown before deleting a Workspace and its Connections.
- **Tone**: direct, cautionary
- **Placeholders**: {{name}} = Workspace name; must survive unchanged
- **Context/meaning**: Warns that deleting a Workspace removes its Connections.
- **Domain notes**: Connection = durable openable resource; deletion cascades.
