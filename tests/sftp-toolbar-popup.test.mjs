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
    /onOpenSftp=\{\(connection\) => setSftpDialogConnection\(connection\)\}/,
    "clicking the SSH toolbar SFTP action should open the popup, not dispatch to a tab opener",
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
