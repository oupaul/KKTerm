import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Quick Connect persists connections and rename guards non-persisted ids", async () => {
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );
  const menuModelSource = await readFile(
    new URL("../src/modules/workspace/connections/quickConnectMenuModel.ts", import.meta.url),
    "utf8",
  );

  // Quick Connect routes through the persist-or-reuse orchestrator.
  assert.match(
    sidebarSource,
    /async function quickConnect\(/,
    "ConnectionSidebar should define a quickConnect orchestrator",
  );
  assert.match(
    sidebarSource,
    /findMatchingConnection\(currentConnections, candidate\)/,
    "quickConnect should reuse an identical existing SSH connection before creating",
  );
  assert.match(
    sidebarSource,
    /invokeCommand\("create_connection"/,
    "quickConnect should persist new Quick Connect targets via create_connection",
  );
  assert.match(
    sidebarSource,
    /nextQuickConnectName\(currentConnections, candidate\.name\)/,
    "quickConnect should avoid duplicate saved Connection names when creating a new target",
  );
  assert.doesNotMatch(
    menuModelSource,
    /candidate\.type === "local"/,
    "local terminal Quick Connect targets should create a new saved Connection instead of reusing by shell",
  );

  // The ephemeral upsert path is gone.
  assert.doesNotMatch(
    sidebarSource,
    /upsertRootConnection|function handleConnectionReady/,
    "the ephemeral handleConnectionReady/upsertRootConnection path should be removed",
  );

  // Properties-save no longer special-cases quick connections (they are persisted now).
  const updateHandler = sidebarSource.slice(
    sidebarSource.indexOf("async function handleConnectionUpdate("),
    sidebarSource.indexOf("function handleCreateFolder("),
  );
  assert.doesNotMatch(
    updateHandler,
    /startsWith\("quick-"\)/,
    "handleConnectionUpdate should no longer branch on quick- ids",
  );

  // Rename guards non-persisted ids defensively.
  const renameHandler = sidebarSource.slice(
    sidebarSource.indexOf("async function commitConnectionRename("),
  );
  assert.match(
    renameHandler.slice(0, renameHandler.indexOf("\n  }\n")),
    /id\.startsWith\("quick-"\)/,
    "commitConnectionRename should skip the backend call for non-persisted ids",
  );
});
