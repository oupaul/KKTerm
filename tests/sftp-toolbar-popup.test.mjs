import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("SSH pane toolbar SFTP button opens an in-place popup instead of a workspace Tab", async () => {
  const terminalSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    terminalSource,
    /import \{ SftpWorkspace \} from "\.\.\/sftp\/SftpWorkspace";/,
    "the terminal toolbar popup should reuse the SFTP/FTP workspace surface",
  );
  assert.match(
    terminalSource,
    /const \[sftpDialogConnection,\s*setSftpDialogConnection\] = useState<Connection \| null>\(null\);/,
    "the SFTP toolbar action should own dialog state inside TerminalWorkspace",
  );
  assert.match(
    terminalSource,
    /onOpenSftp=\{openSftpDialog\}/,
    "clicking the SSH toolbar SFTP action should open the popup through TerminalWorkspace, not dispatch to a tab opener",
  );
  assert.match(
    terminalSource,
    /sftpFocusRestorePaneIdRef/,
    "the SFTP popup should remember the originating terminal pane for focus restore",
  );
  assert.match(
    terminalSource,
    /<SftpWorkspace\s+isActive=\{true\}\s+tab=\{sftpDialogTab\}/,
    "the popup should render the normal SFTP workspace in the dialog",
  );
  assert.doesNotMatch(
    terminalSource,
    /const openSftpBrowser = useWorkspaceStore\(\(state\) => state\.openSftpBrowser\);/,
    "the SSH toolbar SFTP action should not create or activate a workspace tab",
  );
});

test("SSH pane toolbar SFTP action is icon-only with a native SFTP tooltip", async () => {
  const terminalSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    terminalSource,
    /import \{[^}]*Folder[^}]*\} from "lucide-react";/,
    "the SSH toolbar SFTP action should use the folder icon",
  );
  assert.match(
    terminalSource,
    /title=\{t\("terminal\.sftp"\)\}[\s\S]*?<Folder size=\{13\} \/>/,
    "the native browser tooltip should read SFTP while the button body stays icon-only",
  );
  assert.doesNotMatch(
    terminalSource,
    /<Folder size=\{13\} \/>\s*<span>\{t\("terminal\.sftp"\)\}<\/span>/,
    "the SSH toolbar should not render visible SFTP text beside the folder icon",
  );
});

test("SFTP popup uses the selected app color scheme outside the app shell", async () => {
  const shellEffectsSource = await readFile(
    new URL("../src/app/appShellEffects.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    shellEffectsSource,
    /document\.documentElement\.setAttribute\("data-color-scheme", appearanceSettings\.colorScheme\);/,
    "portal-mounted SFTP dialogs should inherit the selected color scheme from the document root",
  );
});

test("SFTP popup close button is anchored to the dialog top right", async () => {
  const terminalStyles = await readFile(
    new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
    "utf8",
  );
  const connectionStyles = await readFile(
    new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
    "utf8",
  );

  assert.match(
    terminalStyles,
    /\.connection-dialog\.sftp-popup-dialog\s*\{[^}]*position:\s*relative;/s,
    "the SFTP popup dialog should establish a positioning context for its close button",
  );
  assert.match(
    connectionStyles,
    /\.connection-dialog-header\s+\.connection-dialog-close,\s*\.connection-dialog-header\s+\.mcp-dialog-close-button\s*\{[^}]*position:\s*absolute;[^}]*top:\s*0;[^}]*right:\s*0;/s,
    "the shared dialog close button should be fixed to the top-right corner",
  );
});
