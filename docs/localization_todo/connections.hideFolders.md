# connections.hideFolders

- **English value**: `Hide Folders`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/ConnectionSidebar.tsx`
- **UI role**: `button` (icon button, also used as `aria-label` and `title` tooltip)
- **User flow**: A toggle in the Connection Tree control row (rightmost). When pressed, the tree's folder structure is hidden and every connection is shown in a single flat, alphabetically sorted list. Pressing again restores the folder view. The preference persists across app relaunches.
- **Tone**: concise/neutral, short toolbar label.
- **Context/meaning**: Renamed from the former "Show All" (key `connections.showAll`) for clarity — the button hides the folder hierarchy and flattens connections, it does not reveal hidden items. Translators should base the new wording on "hide folders / flatten", NOT on the old "show all".
- **Domain notes**: "Folder" is the KKTerm connection-grouping container in the Connection Tree. Keep wording short enough for an icon-button tooltip.

<!--
Renamed from connections.showAll. Best-effort translations were added to all non-English locales in the same change; review for accuracy before deleting this file.
-->
