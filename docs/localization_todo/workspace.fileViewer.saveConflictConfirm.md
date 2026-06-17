# workspace.fileViewer.saveConflictConfirm

- **English value**: `This file changed on disk since you opened it. Overwrite it with your changes?`
- **Namespace**: `workspace`
- **File/component**: `src/modules/workspace/connections/file-viewer/FileViewerWorkspace.tsx`
- **UI role**: `status`
- **User flow**: Native confirm shown when the file's on-disk mtime changed since load and the user tries to save.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: Document Phase 3 — light editing of text/code files with an atomic safe-save pipeline.
- **Domain notes**: "Save" is the file-write action; keep distinct from any session/connection save. Ctrl/Cmd refers to the platform modifier key.

<!--
Filename: workspace.fileViewer.saveConflictConfirm.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
