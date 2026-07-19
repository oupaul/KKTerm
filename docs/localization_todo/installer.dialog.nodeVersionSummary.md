# installer.dialog.nodeVersionSummary

- **English value**: `Current nvm Node: {{current}} · Launch runtime: {{runtime}} · Required: {{requirement}}`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/InstallerToolDialog.tsx`
- **UI role**: `status`
- **User flow**: Shown in the dedicated Run dialog for n8n and Flowise so the user can compare the globally active nvm version, the compatible runtime KKTerm will launch, and the package's declared Node requirement.
- **Tone**: concise/diagnostic
- **Placeholders**: `{{current}}`, `{{runtime}}`, `{{requirement}}`; every placeholder must survive unchanged.
- **Context/meaning**: Current means the Node version active through nvm; launch runtime means the concrete compatible installed Node LTS selected by KKTerm; required is the package's Node engine range.
- **Domain notes**: Node.js and nvm are technical names. Do not translate a runtime as a Windows service.

