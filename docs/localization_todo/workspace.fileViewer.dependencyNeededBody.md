# workspace.fileViewer.dependencyNeededBody

- **English value**: `Previewing this file type uses {{tool}}, a small add-on KKTerm downloads on demand instead of bundling it.`
- **Namespace**: `workspace`
- **File/component**: `src/modules/workspace/connections/file-viewer/viewers/PdfDependencyGate.tsx`
- **UI role**: `status`
- **User flow**: Explains why the dependency is needed before previewing (e.g. PDF needs Poppler).
- **Tone**: concise/neutral
- **Placeholders**: {{tool}} = dependency display name (e.g. Poppler)
- **Context/meaning**: Document Phase 2 — external dependencies (e.g. Poppler for PDF) installed on demand via the Install Helper instead of bundled.
- **Domain notes**: "Poppler" and "PDF" are proper/technical terms; keep "Install Helper" aligned with its existing localized Module name. PATH stays as the technical term.

<!--
Filename: workspace.fileViewer.dependencyNeededBody.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
