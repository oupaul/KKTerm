import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("File Explorer renders the shared file browser as a single local pane", async () => {
  const [workspaceSource, overlaysSource, manualSource] = await Promise.all([
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpOverlays.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../docs/manual/07-sftp.md", import.meta.url), "utf8"),
  ]);

  assert.match(
    workspaceSource,
    /const isLocalFilesBrowser = tab\.kind === "localFiles";/,
    "the SFTP workspace should name the local File Explorer render mode",
  );
  assert.match(
    workspaceSource,
    /if \(isLocalFilesBrowser\) \{[\s\S]*setRemoteFiles\(\[\]\);[\s\S]*setStatus\(""\);[\s\S]*return;/,
    "File Explorer should skip remote session startup and connected-status semantics",
  );
  assert.match(
    workspaceSource,
    /className=\{isLocalFilesBrowser \? "sftp-panes sftp-panes-single" : "sftp-panes"\}/,
    "File Explorer should render the pane row in single-pane mode",
  );
  assert.match(
    workspaceSource,
    /\{!isLocalFilesBrowser \? \([\s\S]*<div className="sftp-gutter">[\s\S]*<FilePane[\s\S]*side="remote"[\s\S]*\) : null\}/,
    "File Explorer should omit the remote pane and center transfer gutter",
  );
  assert.match(
    workspaceSource,
    /\{!isLocalFilesBrowser \? \([\s\S]*<TransferArea[\s\S]*\) : null\}/,
    "File Explorer should omit the bottom Transfer Activity bar",
  );
  assert.match(
    workspaceSource,
    /showTransfer=\{!isLocalFilesBrowser\}/,
    "File Explorer should hide transfer commands from the shared context menu",
  );
  assert.match(
    workspaceSource,
    /const kindLabel = isLocalFilesBrowser\s*\?\s*toolbarTitle\s*:/,
    "File Explorer toolbar title should use the saved Connection name instead of the generic Files protocol label",
  );
  assert.match(
    overlaysSource,
    /showTransfer = true[\s\S]*showTransfer\?: boolean;[\s\S]*\{showTransfer \? \(/,
    "the shared SFTP context menu should allow callers to suppress transfer actions",
  );
  assert.match(
    manualSource,
    /File Explorer Connections \(`localFiles`\)[\s\S]*single-pane local browser[\s\S]*no remote pane[\s\S]*Transfer Activity bar/,
    "the shipped manual should document the File Explorer single-pane layout",
  );
  assert.match(
    manualSource,
    /File Explorer Connections \(`localFiles`\)[\s\S]*titlebar shows the saved Connection name/,
    "the shipped manual should document the File Explorer titlebar name",
  );
});
