# workspace.fileViewer.largeTextLoadFailed

- **English value**: `Could not load the complete large file.`
- **Namespace**: `workspace.fileViewer`
- **File/component**: `src/modules/workspace/connections/file-viewer/viewers/LargeTextViewer.tsx`
- **UI role**: `status bar error notice`
- **User flow**: The user scrolls through a large read-only text file and KKTerm cannot build its sparse line index or read a requested page.
- **Tone**: `concise/neutral error`
- **Placeholders**: `none`
- **Context/meaning**: Loading the complete file means making every line navigable through bounded lazy page reads; the file itself is not modified.
- **Domain notes**: Large file refers to a text Document whose initial bounded read is truncated. This notice does not imply that KKTerm attempted to place the entire file in memory.

<!--
Filename: workspace.fileViewer.largeTextLoadFailed.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
