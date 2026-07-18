import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const storeSource = readFileSync("src/store.ts", "utf8");
const activityRailSource = readFileSync("src/app/ActivityRail.tsx", "utf8");

assert.match(
  storeSource,
  /closeWorkspaceTabs: \(workspaceId: string, fallbackWorkspaceId\?: string\) => void;/,
  "workspace store exposes a targeted cleanup action for deleted Workspace tabs",
);

assert.match(
  storeSource,
  /closeWorkspaceTabs: \(workspaceId, fallbackWorkspaceId = DEFAULT_WORKSPACE_ID\) => \{[\s\S]*?tabs: remainingTabs,[\s\S]*?activeWorkspaceId: nextActiveWorkspaceId,[\s\S]*?window\.dispatchEvent\(new CustomEvent\("kkterm:connection-tree-invalidated"\)\);[\s\S]*?\n  \},\n  setGeneralSettings:/,
  "deleted Workspace cleanup closes its open tabs, falls back to Default Workspace, and invalidates the Connection Tree",
);

assert.match(
  storeSource,
  /set\(\{[\s\S]*?workspaces,[\s\S]*?activeWorkspaceId: fallbackId,[\s\S]*?activeTabId: tabIdForWorkspace\([\s\S]*?get\(\)\.tabs,[\s\S]*?fallbackId,[\s\S]*?get\(\)\.activeTabIdsByWorkspace\[fallbackId\],[\s\S]*?\),[\s\S]*?\}\);[\s\S]*?window\.dispatchEvent\(new CustomEvent\("kkterm:connection-tree-invalidated"\)\);/,
  "workspace list refresh also invalidates the tree when the active Workspace disappears",
);

assert.match(
  activityRailSource,
  /const closeWorkspaceTabs = useWorkspaceStore\(\(state\) => state\.closeWorkspaceTabs\);/,
  "Activity Rail reads the deleted Workspace cleanup action",
);

assert.match(
  activityRailSource,
  /onDeleted=\{\(deletedWorkspace\) => \{[\s\S]*?closeWorkspaceTabs\(deletedWorkspace\.id\);[\s\S]*?onNavigate\("workspace"\);[\s\S]*?void reloadWorkspaces\(\);[\s\S]*?\}\}/,
  "Activity Rail cleans up deleted Workspace sessions and returns to Workspace before refreshing lists",
);

assert.match(
  activityRailSource,
  /listen\("workspaces-changed", \(\) => \{[\s\S]*?void loadWorkspaces\(\);[\s\S]*?\}\)/,
  "Activity Rail reloads Workspace mutations made by the AI Assistant or built-in MCP bridge",
);

assert.match(
  activityRailSource,
  /const removedWorkspaceIds = useWorkspaceStore[\s\S]*?\.workspaces\.filter\([\s\S]*?!list\.some\([\s\S]*?closeWorkspaceTabs\(workspaceId\);/,
  "an out-of-band Workspace deletion closes the removed Workspace's live tabs after reload",
);
