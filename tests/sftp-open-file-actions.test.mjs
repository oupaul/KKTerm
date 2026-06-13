import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("SFTP file panes expose Open for file double-click and context menu", async () => {
  const [workspaceSource, filePaneSource, overlaysSource] = await Promise.all([
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpFilePane.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/modules/workspace/connections/sftp/SftpOverlays.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(
    filePaneSource,
    /onOpenFile\?: \(fileName: string\) => void;/,
    "file panes should accept a file-open action separate from folder navigation",
  );
  assert.match(
    filePaneSource,
    /file\.kind === "folder"[\s\S]*onOpenFolder\?\.\(file\.name\)[\s\S]*else if \(file\.kind === "file"\)[\s\S]*onOpenFile\?\.\(file\.name\)/,
    "double-clicking folders should navigate while double-clicking files should open",
  );
  assert.match(
    overlaysSource,
    /onOpen: \(menu: SftpContextMenuState\) => void;/,
    "the SFTP context menu should receive an Open action handler",
  );
  assert.match(
    overlaysSource,
    /t\("common\.open"\)/,
    "the SFTP context menu should label Open through the shared localization key",
  );
  assert.match(
    workspaceSource,
    /await commands\.downloadPath\([\s\S]*\);[\s\S]*if \(transfer\.openWhenDone\) \{[\s\S]*await openFilesystemPath\(transfer\.openWhenDone\)/,
    "queued remote file Open should open only after the awaited download completes",
  );
  assert.match(
    workspaceSource,
    /openWhenDone: localFilePath/,
    "remote file Open should mark the queued download with the local file to open",
  );
});
