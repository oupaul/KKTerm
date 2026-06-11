# connections.showConnected

- **English value**: `Show Connected`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/ConnectionSidebar.tsx`
- **UI role**: `button` (icon button, also used as `aria-label` and `title` tooltip)
- **User flow**: A toggle in the Connection Tree control row (left of "Hide Folders"). When pressed, the tree is filtered to only connections that currently have a live session; empty folders are pruned. Pressing again restores the full tree.
- **Tone**: concise/neutral, short toolbar label.
- **Placeholders**: `none`
- **Context/meaning**: "Connected" = a connection with at least one active/live session right now (status "connected"), not "reachable" or "saved". It is a filter, not a navigation action.
- **Domain notes**: "Connection" is the KKTerm saved host entry. Keep wording short enough for an icon-button tooltip.

<!--
Best-effort translations were added to all non-English locales in the same change; review for accuracy before deleting this file.
-->
