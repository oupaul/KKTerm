import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("File Explorer can open local files in the inline Document", async () => {
  const [typesSource, defaultsSource, storeSource, workspaceSource, settingsSource] =
    await Promise.all([
      readFile(new URL("../src/types.ts", import.meta.url), "utf8"),
      readFile(new URL("../src/app-defaults.ts", import.meta.url), "utf8"),
      readFile(new URL("../src/store.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src/modules/settings/WorkspaceSettings.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(
    typesSource,
    /export type FileExplorerOpenMode = "external" \| "inlineEditor";/,
    "the setting should use a narrow mode union",
  );
  assert.match(
    defaultsSource,
    /fileExplorerOpenMode: "external"/,
    "File Explorer should keep opening files externally by default",
  );
  assert.match(
    storeSource,
    /openFileViewerPath: \(path: string, options\?: \{ sourceConnection\?: Connection \}\) => void;/,
    "the store should expose a runtime-only path opener for inline Document tabs",
  );
  assert.match(
    storeSource,
    /openFileViewerPath: \(path, options\) => \{[\s\S]*type: "fileView"[\s\S]*kind: "fileViewer"/,
    "opening by path should create an inline Document tab without requiring a saved fileView Connection",
  );
  assert.match(
    workspaceSource,
    /const fileExplorerOpenMode = useWorkspaceStore\(\(state\) => state\.sftpSettings\.fileExplorerOpenMode\);/,
    "File Explorer should read the persisted open mode",
  );
  assert.match(
    workspaceSource,
    /if \(isLocalFilesBrowser && fileExplorerOpenMode === "inlineEditor"\) \{[\s\S]*openFileViewerPath\(path, \{ sourceConnection: tab\.connection \}\);[\s\S]*return;[\s\S]*\}[\s\S]*await openFilesystemPath\(path\);/,
    "local File Explorer files should route to Document only when inline mode is selected",
  );
  assert.match(
    settingsSource,
    /<legend>\{t\("settings\.fileExplorer"\)\}<\/legend>[\s\S]*settings\.fileExplorerOpenMode[\s\S]*settings\.fileExplorerOpenModeExternal[\s\S]*settings\.fileExplorerOpenModeInlineEditor/,
    "Workspace Settings should expose the File Explorer open-mode selector",
  );
});
