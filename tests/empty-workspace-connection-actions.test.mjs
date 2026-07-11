import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const canvasSource = fs.readFileSync("src/modules/workspace/WorkspaceCanvas.tsx", "utf8");
const sidebarSource = fs.readFileSync(
  "src/modules/workspace/connections/ConnectionSidebar.tsx",
  "utf8",
);
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const stylesSource = fs.readFileSync("src/modules/workspace/workspace.css", "utf8");

test("empty Workspace creation actions reveal the tree and open the created Connection", () => {
  assert.match(canvasSource, /requestNewConnection\(type, \{ openAfterCreate: true \}\)/);
  assert.match(sidebarSource, /onRevealPanel\?\.\(\)/);
  assert.match(sidebarSource, /handleConnectionSaved\(connection\)/);
  assert.match(sidebarSource, /handleOpenConnection\(connection\)/);
  assert.match(appSource, /onRevealPanel=\{expandConnectionPanel\}/);
});

test("empty Workspace actions include import and center their grid items", () => {
  assert.match(canvasSource, /requestImportConnections/);
  assert.match(canvasSource, /t\("workspace\.importConnections"\)/);
  assert.match(stylesSource, /\.empty-workspace-connection-links\s*\{[^}]*justify-items: center;/s);
});
