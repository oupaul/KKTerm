import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Connection Tree exposes a root panorama and hides folder-only controls without folders", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /openConnectionPanorama\(flattenConnections\(treeWithLiveStatuses\), panelTitle\)/);
  assert.match(source, /t\("connections\.panoramaView"\)[\s\S]*?<PanelsTopLeft size=\{13\} \/>/);
  assert.match(source, /const hasWorkspaceFolders = treeWithLiveStatuses\.folders\.length > 0/);
  assert.match(source, /const hasWorkspaceConnections = flattenConnections\(treeWithLiveStatuses\)\.length > 0/);
  assert.match(source, /connections\.panoramaView[\s\S]*?disabled=\{!hasWorkspaceConnections\}/);
  assert.match(source, /\{hasWorkspaceFolders \? \([\s\S]*?connections\.collapseAll[\s\S]*?connections\.expandAll/);
  assert.match(source, /\{hasWorkspaceFolders \? \([\s\S]*?connections\.hideFolders/);
});
