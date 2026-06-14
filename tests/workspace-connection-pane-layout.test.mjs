import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace pane close buttons render for split panes and hidden Tab Strip single panes", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const canCloseSinglePane = tab\.kind === "terminal" && generalSettings\.hideTopTabButtons;/);
  assert.match(source, /canClosePane=\{panes\.length > 1 \|\| canCloseSinglePane\}/);
  assert.match(source, /canClosePane \? \(\s*<button[\s\S]*?terminal-pane-close[\s\S]*?\)\s*: null/);
  assert.match(source, /canClosePane \? \(\s*<button[\s\S]*?embedded-pane-close[\s\S]*?\)\s*: null/);
  assert.match(source, /<WebViewWorkspace[\s\S]*?isActive=\{isActive\}[\s\S]*?tab=\{embeddedTab\}[\s\S]*?\/>/);
});

test("embedded URL and remote desktop headers reserve close-button space only when close is visible", async () => {
  const css = await readFile(
    new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(css, /\.embedded-workspace-pane\s*>\s*\.webview-workspace\s+\.webview-pane\s*>\s*header\s*\{\s*padding-right:\s*40px;/);
  assert.doesNotMatch(css, /\.embedded-workspace-pane\s*>\s*\.remote-desktop-shell\s+\.remote-desktop-pane\s*>\s*header\s*\{\s*padding-right:\s*40px;/);
  assert.match(css, /\.embedded-workspace-pane:has\(\s*>\s*\.embedded-pane-close\s*\)\s*>\s*\.webview-workspace\s+\.webview-pane\s*>\s*header\s*\{\s*padding-right:\s*40px;/);
  assert.match(css, /\.embedded-workspace-pane:has\(\s*>\s*\.embedded-pane-close\s*\)\s*>\s*\.remote-desktop-shell\s+\.remote-desktop-pane\s*>\s*header\s*\{\s*padding-right:\s*40px;/);
});

test("stored Connection layouts include URL panes and URL Connections hydrate them on open", async () => {
  const layoutSource = await readFile(
    new URL("../src/modules/workspace/layout.ts", import.meta.url),
    "utf8",
  );
  const storeSource = await readFile(
    new URL("../src/store.ts", import.meta.url),
    "utf8",
  );

  assert.match(layoutSource, /serializeLayout\(\s*layout: LayoutNode,\s*panes: WorkspacePane\[\]/);
  assert.match(layoutSource, /pane\.kind === "webview"/);
  assert.match(storeSource, /const stored = loadStoredLayout\(connection\.id\);[\s\S]*?buildPanesFromStoredLayout\(connection, stored\)/);
  assert.match(storeSource, /stored \? hydrateLayout\(stored\.layout, paneIds\) : undefined/);
  assert.match(storeSource, /buildPaneFromStoredLayoutPane/);
});

test("Add To pane routes file-browser Connections to embedded browser panes", async () => {
  const typesSource = await readFile(new URL("../src/types.ts", import.meta.url), "utf8");
  const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");
  const terminalWorkspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(typesSource, /export interface FileBrowserPane[\s\S]*kind: "sftp" \| "ftp" \| "localFiles"/);
  assert.match(typesSource, /WorkspacePane = TerminalPane \| UrlPane \| RemoteDesktopPane \| FileBrowserPane/);
  assert.match(
    storeSource,
    /if \(connection\.type === "ftp"\) \{[\s\S]*?kind: isSftpProtocol \? "sftp" : "ftp"[\s\S]*?connection: fileConnection/,
    "FTP and SFTP-protocol FTP Connections should create file-browser panes, not terminal panes",
  );
  assert.match(
    storeSource,
    /if \(connection\.type === "localFiles"\) \{[\s\S]*?kind: "localFiles"[\s\S]*?connection,/,
    "File Explorer Connections should create localFiles panes, not terminal panes",
  );
  assert.match(
    terminalWorkspaceSource,
    /import \{ fileBrowserCommandsFor \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/fileBrowserCommands"/,
  );
  assert.match(
    terminalWorkspaceSource,
    /pane\.kind === "remoteDesktop" \? \([\s\S]*?<RemoteDesktopWorkspace[\s\S]*?\) : \([\s\S]*?<SftpWorkspace[\s\S]*?commands=\{fileBrowserCommandsFor\(pane\.connection\)\}/,
    "embedded file-browser panes should render through SftpWorkspace with the transport adapter",
  );
});
