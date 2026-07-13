import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const activityRailSource = await readFile(
  new URL("../src/app/ActivityRail.tsx", import.meta.url),
  "utf8",
);
const childConnectionsSource = await readFile(
  new URL("../src/modules/workspace/connections/childConnections.ts", import.meta.url),
  "utf8",
);
const appCss = await readFile(new URL("../src/app/app.css", import.meta.url), "utf8");

test("Activity Rail opens Child Connection Tab layouts like the Connection Tree", () => {
  assert.match(
    childConnectionsSource,
    /export function loadStoredChildConnections\(\): WorkspaceChildConnection\[\]/,
    "Child Connection Tab storage should be shared outside the Connection Tree component",
  );
  assert.match(
    activityRailSource,
    /const openChildConnectionLayout = useWorkspaceStore/,
    "Activity Rail should use the same child-layout store path as the Connection Tree",
  );
  assert.match(
    activityRailSource,
    /generalSettings\.hideTopTabButtons[\s\S]*loadStoredChildConnections\(\)\.filter\([\s\S]*parentConnectionId === item\.connection\.id[\s\S]*openChildConnectionLayout\(item\.connection,\s*childConnections\)/,
    "when Child Connection Tabs are enabled, rail shortcuts should open the stored child layout instead of reopening the parent Connection",
  );
  assert.match(
    activityRailSource,
    /openChildConnectionLayout\(item\.connection,\s*childConnections\);[\s\S]*return;[\s\S]*if \(item\.tabId\)/,
    "child-layout activation must happen before the generic tab activation fallback",
  );
});

test("Activity Rail returns to sessions living in another Workspace", () => {
  assert.match(
    activityRailSource,
    /\(existingTab\.workspaceId \?\? DEFAULT_WORKSPACE_ID\) !== activeWorkspaceId[\s\S]*activateTab\(existingTab\.id\);[\s\S]*return;[\s\S]*generalSettings\.hideTopTabButtons/,
    "a rail click on a session from another Workspace must activate its Tab (switching Workspaces) before the child-layout branch can spawn new sessions in the current Workspace",
  );
  assert.match(
    activityRailSource,
    /child\.parentConnectionId === item\.connection\.id &&[\s\S]*\(child\.workspaceId \?\? DEFAULT_WORKSPACE_ID\) === activeWorkspaceId/,
    "rail shortcuts must only assemble child layouts from the active Workspace's Child Connections",
  );
});

test("Activity Rail CSS tooltip stays hidden while native rail tooltip is active", () => {
  assert.match(
    appCss,
    /\.rail-button:hover\s+\.rail-tooltip:not\(\.native-suppressed\)/,
    "hover CSS should not display the app tooltip when the native tooltip bridge is active",
  );
  assert.match(
    appCss,
    /\.rail-button:focus-visible\s+\.rail-tooltip:not\(\.native-suppressed\)/,
    "focus CSS should not display the app tooltip when the native tooltip bridge is active",
  );
});
