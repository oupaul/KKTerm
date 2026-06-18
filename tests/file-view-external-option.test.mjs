import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Document Connections can open directly in the external editor without creating a tab", async () => {
  const [typesSource, sidebarSource, storeSource, fieldsSource, storageSource, connectionsSource] =
    await Promise.all([
      readFile(new URL("../src/types.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src/store.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../src/modules/workspace/connections/connection-dialog/FileViewConnectionFields.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src-tauri/src/storage.rs", import.meta.url), "utf8"),
      readFile(new URL("../src-tauri/src/storage/connections.rs", import.meta.url), "utf8"),
    ]);

  assert.match(typesSource, /fileViewOpenExternal\?: boolean;/);
  assert.match(
    fieldsSource,
    /connections\.fileViewOpenExternal[\s\S]*connections\.fileViewOpenExternalHint/,
    "Document Add/Edit fields should expose the per-Connection external-open option",
  );
  assert.match(
    sidebarSource,
    /fileViewOpenExternal:\s*connectionType === "fileView" \? form\.get\("fileViewOpenExternal"\) === "on" : undefined/,
    "saving a Document Connection should send the external-open flag",
  );
  assert.match(
    storeSource,
    /if \(connection\.fileViewOpenExternal\) \{[\s\S]*openFilesystemPath\(filePath\);[\s\S]*return;[\s\S]*\}[\s\S]*const tabId = `tab-\$\{connection\.id\}-fileView`;/,
    "opening an external Document Connection should return before creating a tab",
  );
  assert.match(storageSource, /file_view_open_external INTEGER NOT NULL DEFAULT 0/);
  assert.match(connectionsSource, /file_view_open_external/);
});
