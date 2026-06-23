import {
  collectPreservedParentPanes,
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

// Bug 1: the parent's original plain Tab (no childConnectionId) must be adopted
// into the panorama instead of being left as an unreachable orphan.
const orphanPlainTab = terminalTab("tab-parent-1", [terminalPane("pane-original")]);
const newChildTab = terminalTab("tab-parent-1-new", [
  terminalPane("pane-new-child", { childConnectionId: "child-2" }),
]);
const bug1 = collectPreservedParentPanes({
  parentConnectionId: parentConnection.id,
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
  existingGroupTab: undefined,
  tabs: [orphanPlainTab, newChildTab],
});
if (bug1.adoptedOrphanPanes.map((pane) => pane.id).join(",") !== "pane-original") {
  throw new Error("Adding a child Tab must adopt the parent's original session, not orphan it (Bug 1).");
}
if (bug1.carriedGroupPanes.length !== 0) {
  throw new Error("With no existing group Tab there are no carried Panes.");
}

// The named child Pane already being moved in must not be adopted a second time.
const bug1Excluded = collectPreservedParentPanes({
  parentConnectionId: parentConnection.id,
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
  existingGroupTab: undefined,
  tabs: [orphanPlainTab, newChildTab],
  excludedPaneIds: new Set(["pane-original"]),
});
if (bug1Excluded.adoptedOrphanPanes.length !== 0) {
  throw new Error("Panes already claimed by the caller must not be adopted again.");
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

// Panes from other Workspaces or other Connections must never be adopted.
const foreignWorkspaceTab = terminalTab("tab-foreign-ws", [terminalPane("pane-foreign-ws")], {
  workspaceId: "other",
});
const foreignConnectionTab = terminalTab("tab-foreign-conn", [terminalPane("pane-foreign-conn")], {
  connection: { ...parentConnection, id: "parent-2" },
});
const scoped = collectPreservedParentPanes({
  parentConnectionId: parentConnection.id,
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
  existingGroupTab: undefined,
  tabs: [foreignWorkspaceTab, foreignConnectionTab],
});
if (scoped.adoptedOrphanPanes.length !== 0) {
  throw new Error("Adoption must stay scoped to the active Workspace and the target Connection.");
}

// A plain parent Tab can temporarily contain Panes for other Connections after
// drag-to-dock or split workflows. Only the parent's own childless Panes should
// move into the child panorama.
const otherConnection = { ...parentConnection, id: "other-connection" };
const mixedParentTab = terminalTab("tab-mixed-parent", [
  terminalPane("pane-parent"),
  terminalPane("pane-other", { connection: otherConnection }),
]);
const mixed = collectPreservedParentPanes({
  parentConnectionId: parentConnection.id,
  activeWorkspaceId: "default",
  defaultWorkspaceId: "default",
  existingGroupTab: undefined,
  tabs: [mixedParentTab],
});
if (mixed.adoptedOrphanPanes.map((pane) => pane.id).join(",") !== "pane-parent") {
  throw new Error("Adoption must not pull unrelated split Panes into a parent's child panorama.");
}
