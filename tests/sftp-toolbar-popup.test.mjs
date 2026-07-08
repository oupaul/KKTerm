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
    /const SftpWorkspace = lazy\(\(\) =>\s*import\("\.\.\/sftp\/SftpWorkspace"\)/,
    "the terminal toolbar popup should reuse the (lazily loaded) SFTP/FTP workspace surface",
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
    /import \{[^}]*Folder[^}]*\} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/reicon";/,
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
    /document\.documentElement\.setAttribute\("data-color-scheme", appliedColorScheme\);/,
    "portal-mounted SFTP dialogs should inherit the selected color scheme from the document root",
  );
});

test("SFTP workspace carries the selected app color scheme on its own surface", async () => {
  const sftpWorkspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    sftpWorkspaceSource,
    /const appearanceSettings = useWorkspaceStore\(\(state\) => state\.appearanceSettings\);/,
    "the SFTP/File Browser surface should read the selected app appearance settings directly",
  );
  assert.match(
    sftpWorkspaceSource,
    /data-color-scheme=\{resolveAppliedColorScheme\(appearanceSettings\.colorScheme\)\}/,
    "the SFTP/File Browser pane should expose the applied color scheme for its own descendants",
  );
  assert.match(
    sftpWorkspaceSource,
    /data-selected-color-scheme=\{appearanceSettings\.colorScheme\}/,
    "the SFTP/File Browser pane should retain the selected scheme name for scheme-specific styling",
  );
});

test("SFTP-over-FTP Connections keep the SFTP runtime adapter after metadata refresh", async () => {
  const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

  assert.match(
    storeSource,
    /function sftpBrowserConnectionFromFtpConnection\(connection: Connection\): Connection/,
    "FTP Connections with the SFTP protocol should be converted to an SSH-shaped runtime Connection",
  );
  assert.match(
    storeSource,
    /tab\.kind === "sftp" && connection\.type === "ftp" && connection\.ftpOptions\?\.protocol === "sftp"[\s\S]*?\? sftpBrowserConnectionFromFtpConnection\(connection\)[\s\S]*?: connection/,
    "refreshing an open SFTP browser after editing its durable Connection should not switch it to FTP commands",
  );
  assert.match(
    storeSource,
    /connection: refreshedConnection/,
    "the refreshed SFTP tab should retain the converted runtime Connection",
  );
  assert.match(
    storeSource,
    /ftpOptions: connection\.ftpOptions/,
    "the converted runtime Connection should preserve standalone SFTP start-path preferences",
  );
});

test("SFTP titlebar stays compact with equal vertical padding", async () => {
  const sftpStyles = await readFile(
    new URL("../src/modules/workspace/connections/sftp/sftp.css", import.meta.url),
    "utf8",
  );

  assert.match(
    sftpStyles,
    /\.sftp-toolbar\.workspace-toolbar\s*\{[^}]*min-height:\s*22px;[^}]*padding:\s*3px 6px 1px 14px;/s,
    "the SFTP titlebar should be compact while preserving the intentional optical-centering padding",
  );
});

test("SFTP pane search shrinks inside the shared pane toolbar", async () => {
  const sftpStyles = await readFile(
    new URL("../src/modules/workspace/connections/sftp/sftp.css", import.meta.url),
    "utf8",
  );

  assert.match(
    sftpStyles,
    /\.sftp-pane-head-actions\s*\{[^}]*flex:\s*0 1 auto;[^}]*min-width:\s*0;/s,
    "pane toolbar actions should be allowed to shrink instead of overflowing into the search field",
  );
  assert.match(
    sftpStyles,
    /\.sftp-search\s*\{[^}]*flex:\s*1 1 132px;[^}]*min-width:\s*112px;[^}]*max-width:\s*170px;[^}]*overflow:\s*hidden;/s,
    "the SFTP search box should use the same bounded, non-overlapping behavior as the File Explorer pane",
  );
  assert.match(
    sftpStyles,
    /\.sftp-search input\s*\{[^}]*flex:\s*1 1 auto;[^}]*width:\s*auto;/s,
    "the search input should fill its wrapper instead of imposing a fixed width that can overlap adjacent buttons",
  );
});

test("SFTP open-terminal action is wired only on the local pane", async () => {
  const sftpWorkspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    sftpWorkspaceSource,
    /const openLocalTerminalHere = useWorkspaceStore\(\(state\) => state\.openLocalTerminalHere\);/,
    "the file browser should use the ephemeral local terminal opener",
  );
  assert.match(
    sftpWorkspaceSource,
    /const handleOpenLocalTerminalHere = async \(\) => \{[\s\S]*?openLocalTerminalHere\(localPath,[\s\S]*?<FilePane[\s\S]*?side="local"[\s\S]*?onOpenTerminalHere=\{\(\) => void handleOpenLocalTerminalHere\(\)\}/,
    "the local pane should expose Open Terminal Here for the current local path",
  );
  assert.doesNotMatch(
    sftpWorkspaceSource,
    /<FilePane[\s\S]*?side="remote"[\s\S]*?onOpenTerminalHere=/,
    "the remote SFTP pane must not show the local terminal icon",
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
