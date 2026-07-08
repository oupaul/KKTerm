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

test("Quick Connect recent menu uses native menu items instead of a DOM popup", async () => {
  const sidebarStateSource = await readFile(
    new URL("../src/modules/workspace/connections/connectionSidebarState.ts", import.meta.url),
    "utf8",
  );
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );
  const menusSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionMenus.tsx", import.meta.url),
    "utf8",
  );
  const menuCss = await readFile(
    new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
    "utf8",
  );

  assert.match(
    sidebarStateSource,
    /export const RECENT_CONNECTION_LIMIT = 50;/,
    "recent Connection storage should keep up to 50 ids",
  );
  assert.doesNotMatch(
    menusSource + menuCss,
    /quick-connect-menu/,
    "Quick Connect must not render a DOM menu because it can clip under native surfaces such as RDP ActiveX",
  );
  assert.match(
    sidebarSource,
    /const QUICK_CONNECT_RECENT_TOP_LEVEL_LIMIT = 5;/,
    "Quick Connect native menu should keep five recent Connections at the top level",
  );
  assert.match(
    sidebarSource,
    /const QUICK_CONNECT_RECENT_SUBMENU_LIMIT = 20;/,
    "Quick Connect native submenu should include older recent Connections up to twenty total",
  );
  assert.match(
    sidebarSource,
    /topLevelRecentConnections = recentConnections\.slice\(0, QUICK_CONNECT_RECENT_TOP_LEVEL_LIMIT\)[\s\S]*submenuRecentConnections = recentConnections\.slice\(\s*QUICK_CONNECT_RECENT_TOP_LEVEL_LIMIT,\s*QUICK_CONNECT_RECENT_SUBMENU_LIMIT,\s*\)/,
    "Quick Connect should split recent Connections into top-level and More submenu groups",
  );
  assert.match(
    sidebarSource,
    /kind: "submenu" as const,[\s\S]*label: t\("connections\.moreRecent"\),[\s\S]*items: submenuRecentConnections\.map\(recentConnectionMenuItem\)/,
    "Quick Connect should expose older recent Connections through a native More submenu",
  );
  assert.match(
    sidebarSource,
    /async function handleQuickConnectButtonClick[\s\S]*showNativeContextMenu\(buildQuickConnectMenuItems\(\),/,
    "Quick Connect should open through the native menu bridge",
  );
});

test("Quick Connect local shell menu flattens normal and admin choices", async () => {
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    sidebarSource,
    /const normalLabel = t\("connections\.normal"\);[\s\S]*const adminLabel = t\("connections\.admin"\);/,
    "flat shell variants should reuse the localized Normal/Admin labels",
  );
  assert.match(
    sidebarSource,
    /label: `\$\{option\.label\} \(\$\{normalLabel\}\)`[\s\S]*action: \(\) => handleQuickLocalShell\(option\)/,
    "the normal local-shell action should be a first-level native menu item",
  );
  assert.match(
    sidebarSource,
    /label: `\$\{option\.label\} \(\$\{adminLabel\}\)`[\s\S]*action: \(\) => void handleQuickAdminShell\(option\)/,
    "the admin local-shell action should be a first-level native menu item",
  );
});
