# installer.status.nodeStartFailed

- **English value**: `Could not start {{name}} with current nvm Node {{current}} (launch runtime {{runtime}}, required {{requirement}}): {{reason}}`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/InstallerToolDialog.tsx`
- **UI role**: `error`
- **User flow**: Appears in the Status Bar notice when Start fails for a managed Node web application.
- **Tone**: direct diagnostic guidance
- **Placeholders**: `{{name}}`, `{{current}}`, `{{runtime}}`, `{{requirement}}`, `{{reason}}`; every placeholder must survive unchanged.
- **Context/meaning**: Reports the active nvm Node version and KKTerm's selected compatible launch runtime alongside the original service or process failure.
- **Domain notes**: This is a managed runtime/service start failure, not an installation failure. Node.js and nvm are technical names.

