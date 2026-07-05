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

test("Quick Connect recent menu keeps 50 entries and pages them five at a time", async () => {
  const sidebarStateSource = await readFile(
    new URL("../src/modules/workspace/connections/connectionSidebarState.ts", import.meta.url),
    "utf8",
  );
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );
  const menuSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionMenus.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    sidebarStateSource,
    /export const RECENT_CONNECTION_LIMIT = 50;/,
    "recent Connection storage should keep up to 50 ids",
  );
  assert.match(
    menuSource,
    /const QUICK_CONNECT_RECENT_PAGE_SIZE = 5;/,
    "Quick Connect should show recent Connections in five-item pages",
  );
  assert.match(
    menuSource,
    /recentConnections\.slice\(0, visibleRecentCount\)/,
    "Quick Connect should render only the visible recent page",
  );
  assert.match(
    menuSource,
    /setVisibleRecentCount\(\(count\) => count \+ QUICK_CONNECT_RECENT_PAGE_SIZE\)/,
    "Load more should reveal one additional five-item page in the open menu",
  );
  assert.match(
    menuSource,
    /t\("connections\.loadMore"\)/,
    "the Load more action should be localized",
  );

  const quickConnectButtonHandler = sidebarSource.slice(
    sidebarSource.indexOf("function handleQuickConnectButtonClick()"),
    sidebarSource.indexOf("function handleDragEnd()"),
  );
  assert.doesNotMatch(
    quickConnectButtonHandler,
    /showNativeContextMenu/,
    "Quick Connect should use the React menu so Load more can update without closing",
  );
});

test("Quick Connect local shell menu flattens normal and admin choices", async () => {
  const menuSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionMenus.tsx", import.meta.url),
    "utf8",
  );
  const menuCss = await readFile(
    new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
    "utf8",
  );

  assert.match(
    menuSource,
    /const normalLabel = t\("connections\.normal"\);[\s\S]*const adminLabel = t\("connections\.admin"\);/,
    "flat shell variants should reuse the localized Normal/Admin labels",
  );
  assert.match(
    menuSource,
    /key=\{`\$\{optionKey\}-normal`\}[\s\S]*onOpenLocalShell\(option\)[\s\S]*`\$\{option\.label\} \(\$\{normalLabel\}\)`/,
    "the normal local-shell action should be a first-level menu item",
  );
  assert.match(
    menuSource,
    /key=\{`\$\{optionKey\}-admin`\}[\s\S]*onOpenElevatedShell\(option\)[\s\S]*`\$\{option\.label\} \(\$\{adminLabel\}\)`/,
    "the admin local-shell action should be a first-level menu item",
  );
  assert.doesNotMatch(
    menuSource + menuCss,
    /quick-connect-submenu/,
    "Quick Connect should not render or style a nested local-shell submenu",
  );
});
