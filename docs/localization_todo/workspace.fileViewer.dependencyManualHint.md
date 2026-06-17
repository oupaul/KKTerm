# workspace.fileViewer.dependencyManualHint

- **English value**: `Install {{tool}} and make sure it is on your PATH, then retry.`
- **Namespace**: `workspace`
- **File/component**: `src/modules/workspace/connections/file-viewer/viewers/PdfDependencyGate.tsx`
- **UI role**: `status`
- **User flow**: Shown on platforms without the Installer Helper, asking the user to provide the dependency via PATH.
- **Tone**: concise/neutral
- **Placeholders**: {{tool}} = dependency display name
- **Context/meaning**: File Viewer Phase 2 — external dependencies (e.g. Poppler for PDF) installed on demand via the Installer Helper instead of bundled.
- **Domain notes**: "Poppler" and "PDF" are proper/technical terms; keep "Installer Helper" aligned with its existing localized Module name. PATH stays as the technical term.

<!--
Filename: workspace.fileViewer.dependencyManualHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
