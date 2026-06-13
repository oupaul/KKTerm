import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("top Tab Strip is scoped to the active Workspace", async () => {
  const canvasSource = await readFile(
    new URL("../src/modules/workspace/WorkspaceCanvas.tsx", import.meta.url),
    "utf8",
  );
  const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

  assert.match(
    canvasSource,
    /const activeWorkspaceId = useWorkspaceStore\(\(state\) => state\.activeWorkspaceId\);/,
    "TabStrip should read the active Workspace id",
  );
  assert.match(
    canvasSource,
    /const visibleTabs = tabs\.filter\(\(tab\) => tabWorkspaceId\(tab\) === activeWorkspaceId\);/,
    "TabStrip should render only Tabs owned by the active Workspace",
  );
  assert.match(
    canvasSource,
    /visibleTabs\.map\(\(tab\) =>/,
    "TabStrip buttons should be generated from the scoped visible Tabs list",
  );
  assert.match(
    storeSource,
    /activeTabId: tabWorkspaceId\(activeTab\) === workspaceId[\s\S]*?activeTab\?\.id \?\? ""[\s\S]*?firstTabIdForWorkspace\(get\(\)\.tabs,\s*workspaceId\)/,
    "switching Workspaces should activate a Tab from the destination Workspace or clear the active Tab",
  );
  assert.match(
    storeSource,
    /const nextActiveTabId =[\s\S]*?firstTabIdForWorkspace\(remainingTabs,\s*activeWorkspaceId\)/,
    "closing the active Tab should choose the next Tab from the same active Workspace",
  );
});
