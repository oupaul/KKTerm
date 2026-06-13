import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("File Explorer local pane exposes rename and delete actions", async () => {
  const [workspaceSource, overlaysSource] = await Promise.all([
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpOverlays.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(
    workspaceSource,
    /const handleRenameLocalPath = async \(currentName: string, newName: string\) =>/,
    "local files should use the local filesystem rename command path",
  );
  assert.match(
    workspaceSource,
    /const handleDeleteLocalPath = async \(names = selectedLocalNames\) =>/,
    "local files should use the local filesystem delete command path",
  );
  assert.match(
    workspaceSource,
    /onRenameSelected=\{!isLocalDrivePicker \? handleRenameLocalPath : undefined\}/,
    "the local pane should receive a rename handler except in the Windows drive picker",
  );
  assert.match(
    workspaceSource,
    /onDeleteSelected=\{!isLocalDrivePicker \? handleDeleteLocalPath : undefined\}/,
    "the local pane should receive a delete handler except in the Windows drive picker",
  );
  assert.match(
    workspaceSource,
    /menu\.side === "local"[\s\S]*handleDeleteLocalPath\(menu\.names\)/,
    "context-menu delete should dispatch local selections to the local delete path",
  );
  assert.doesNotMatch(
    overlaysSource,
    /const canRename = isRemote && menu\.names\.length === 1;/,
    "Rename should not be gated to remote-only selections",
  );
  assert.doesNotMatch(
    overlaysSource,
    /const canDelete = isRemote && menu\.names\.length > 0;/,
    "Delete should not be gated to remote-only selections",
  );
});
