import {
  collectPreservedParentPanes,
  convertOpenTabsToChildConnections,
  focusedPaneIdForChildLayout,
  isChildConnectionRowActive,
  syncChildConnectionsFromTabs,
} from "./childConnections.ts";
import type {
  Connection,
  WorkspaceChildConnection,
  WorkspacePane,
  WorkspaceTab,
} from "../../../types";

const parentConnection: Connection = {
  id: "parent-1",
  name: "Parent",
  host: "example.com",
  user: "ryan",
  type: "ssh",
  status: "idle",
  terminalBackground: { kind: "preset", preset: "graphite" },
};

const child: WorkspaceChildConnection = {
  id: "child-1",
  parentConnectionId: parentConnection.id,
  name: "Child",
  cwd: "~",
};

const tab: WorkspaceTab = {
  id: "tab-parent-children",
  childConnectionGroupParentId: parentConnection.id,
  title: "Parent",
  subtitle: "ryan@example.com",
  kind: "terminal",
  panes: [
    {
      kind: "terminal",
      id: "pane-child-1",
      childConnectionId: child.id,
      title: "Child",
      toolbarTitle: "Child",
      cwd: "/home/ryan/project",
      buffer: "",
      connection: { ...parentConnection, terminalOpacity: 42 },
      terminalBackground: { kind: "dynamic", dynamic: "matrix" },
    },
  ],
  connection: parentConnection,
};

const synced = syncChildConnectionsFromTabs([child], [tab]);
const syncedChild = synced[0];

if (syncedChild?.cwd !== "/home/ryan/project") {
  throw new Error("Open child terminal cwd should sync into stored child metadata.");
}

if (syncedChild.terminalBackground?.kind !== "dynamic" || syncedChild.terminalBackground.dynamic !== "matrix") {
  throw new Error("Open child terminal background should sync into stored child metadata.");
}

if (syncedChild.terminalOpacity !== 42) {
  throw new Error("Open child terminal transparency should sync into stored child metadata.");
}

const focusedTab = { ...tab, focusedPaneId: "pane-child-1" };
const existingFocusedPane = focusedPaneIdForChildLayout(focusedTab, focusedTab.panes);
if (existingFocusedPane !== "pane-child-1") {
  throw new Error("Refreshing an existing child layout should preserve its focused Pane.");
}

const fallbackFocusedPane = focusedPaneIdForChildLayout(
  { ...tab, focusedPaneId: "missing-pane" },
  tab.panes,
);
if (fallbackFocusedPane !== undefined) {
  throw new Error("Refreshing a child layout with stale focus should leave the panorama focus unset.");
}

const initialFocusedPane = focusedPaneIdForChildLayout(undefined, tab.panes);
if (initialFocusedPane !== undefined) {
  throw new Error("Opening a child panorama without prior focus should not invent a focused child Pane.");
}

// A parent panorama can have a focused child Pane without the user having opened
// that Child Connection Tab row. Only a maximized child Pane should mark the
// child row active; otherwise the parent row is the active target.
const parentPanorama = {
  ...tab,
  id: "parent-panorama",
  childConnectionGroupParentId: parentConnection.id,
  focusedPaneId: "pane-child-1",
  maximizedPaneId: undefined,
};
if (isChildConnectionRowActive({ tab: parentPanorama, paneId: "pane-child-1", activeTabId: parentPanorama.id })) {
  throw new Error("Selecting the parent panorama must not also highlight the focused child row.");
}
if (!isChildConnectionRowActive({
  tab: { ...parentPanorama, maximizedPaneId: "pane-child-1" },
  paneId: "pane-child-1",
  activeTabId: parentPanorama.id,
})) {
  throw new Error("Opening a child row in the panorama should highlight that child while it is maximized.");
}

// --- collectPreservedParentPanes (issue #430) ---

function terminalPane(id: string, overrides: Partial<WorkspacePane> = {}): WorkspacePane {
  return {
    kind: "terminal",
    id,
    title: id,
    toolbarTitle: id,
    cwd: "~",
    buffer: "",
    connection: parentConnection,
    ...overrides,
  } as WorkspacePane;
}

function terminalTab(id: string, panes: WorkspacePane[], overrides: Partial<WorkspaceTab> = {}): WorkspaceTab {
  return {
    id,
    title: id,
    subtitle: "",
    kind: "terminal",
    panes,
    connection: parentConnection,
    ...overrides,
  };
}

// Enabling Child Connection Tabs converts existing plain parent Panes into
// child rows instead of letting the parent remain a standalone Connection.
const orphanPlainTab = terminalTab("tab-parent-1", [terminalPane("pane-original")]);
const newChildTab = terminalTab("tab-parent-1-new", [
  terminalPane("pane-new-child", { childConnectionId: "child-2" }),
]);
const converted = convertOpenTabsToChildConnections({
  children: [],
  tabs: [orphanPlainTab, newChildTab],
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
});
const convertedChild = converted[0];
if (converted.length !== 1 || convertedChild?.id !== "pane-original") {
  throw new Error("A live parent Pane should become a stored Child Connection Tab when child mode is enabled.");
}
if (convertedChild.parentConnectionId !== parentConnection.id || convertedChild.name !== "tab-parent-1") {
  throw new Error("Converted Child Connection Tabs should keep the parent Connection identity and a usable name.");
}
const bug1 = collectPreservedParentPanes({
  parentConnectionId: parentConnection.id,
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
  existingGroupTab: undefined,
  tabs: [orphanPlainTab, newChildTab],
});
if (bug1.adoptedOrphanPanes.length !== 0) {
  throw new Error("Plain parent Panes should be converted to child rows, not adopted as unnamed panorama Panes.");
}
if (bug1.carriedGroupPanes.length !== 0) {
  throw new Error("With no existing group Tab there are no carried Panes.");
}

// Bug 2: a "split right" inside the panorama produces a childless Pane that must
// survive a layout rebuild rather than being discarded.
const groupTab = terminalTab(
  "tab-parent-children",
  [
    terminalPane("pane-child-a", { childConnectionId: "child-1" }),
    terminalPane("pane-split", { title: "Child 2" }),
  ],
  { childConnectionGroupParentId: parentConnection.id },
);
const bug2 = collectPreservedParentPanes({
  parentConnectionId: parentConnection.id,
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
  existingGroupTab: groupTab,
  tabs: [groupTab],
});
if (bug2.carriedGroupPanes.map((pane) => pane.id).join(",") !== "pane-split") {
  throw new Error("An in-panorama split Pane must be carried forward on rebuild, not dropped (Bug 2).");
}
if (bug2.adoptedOrphanPanes.length !== 0) {
  throw new Error("The group Tab itself must not be re-adopted as an orphan.");
}
const bug2Excluded = collectPreservedParentPanes({
  parentConnectionId: parentConnection.id,
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
  existingGroupTab: groupTab,
  tabs: [groupTab],
  excludedPaneIds: new Set(["pane-split"]),
});
if (bug2Excluded.carriedGroupPanes.length !== 0) {
  throw new Error("Panes already claimed as converted children must not be carried as unnamed Panes.");
}

// Panes from other Workspaces must not be converted into active Workspace children.
const foreignWorkspaceTab = terminalTab("tab-foreign-ws", [terminalPane("pane-foreign-ws")], {
  workspaceId: "other",
});
const scoped = convertOpenTabsToChildConnections({
  children: [],
  tabs: [foreignWorkspaceTab],
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
});
if (scoped.length !== 0) {
  throw new Error("Conversion must stay scoped to the active Workspace.");
}

// A plain parent Tab can temporarily contain Panes for other Connections after
// drag-to-dock or split workflows. Each terminal Pane should become a child of
// its own durable parent Connection.
const otherConnection = { ...parentConnection, id: "other-connection" };
const mixedParentTab = terminalTab("tab-mixed-parent", [
  terminalPane("pane-parent"),
  terminalPane("pane-other", { connection: otherConnection }),
]);
const mixed = convertOpenTabsToChildConnections({
  children: [],
  tabs: [mixedParentTab],
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
});
if (mixed.map((entry) => `${entry.id}:${entry.parentConnectionId}`).join(",") !== "pane-parent:parent-1,pane-other:other-connection") {
  throw new Error("Conversion should keep each Pane under its own parent Connection.");
}
