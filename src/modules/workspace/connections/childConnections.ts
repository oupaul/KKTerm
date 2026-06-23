import type { DashboardBackground } from "../../dashboard/types";
import type { TerminalPane, WorkspaceChildConnection, WorkspacePane, WorkspaceTab } from "../../../types";

export const CHILD_CONNECTIONS_STORAGE_KEY = "kkterm.workspace.childConnections.v1";

export function loadStoredChildConnections(): WorkspaceChildConnection[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHILD_CONNECTIONS_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isStoredChildConnection) : [];
  } catch {
    return [];
  }
}

export function persistStoredChildConnections(children: WorkspaceChildConnection[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CHILD_CONNECTIONS_STORAGE_KEY, JSON.stringify(children));
  } catch {
    // Storage can be unavailable or full; keep runtime state working.
  }
}

function isStoredChildConnection(value: unknown): value is WorkspaceChildConnection {
  if (!value || typeof value !== "object") {
    return false;
  }
  const child = value as Partial<WorkspaceChildConnection>;
  return (
    typeof child.id === "string" &&
    child.id.trim().length > 0 &&
    typeof child.parentConnectionId === "string" &&
    child.parentConnectionId.trim().length > 0 &&
    typeof child.name === "string" &&
    child.name.trim().length > 0
  );
}

function isTerminalWorkspacePane(pane: WorkspacePane): pane is TerminalPane {
  return pane.kind === undefined || pane.kind === "terminal";
}

function backgroundsEqual(
  left: DashboardBackground | null | undefined,
  right: DashboardBackground | null | undefined,
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function syncChildConnectionsFromTabs(
  children: WorkspaceChildConnection[],
  tabs: WorkspaceTab[],
): WorkspaceChildConnection[] {
  const paneByChildId = new Map<string, WorkspacePane>();
  for (const tab of tabs) {
    for (const pane of tab.panes) {
      if (pane.childConnectionId) {
        paneByChildId.set(pane.childConnectionId, pane);
      }
    }
  }

  let changed = false;
  const next = children.map((child) => {
    const pane = paneByChildId.get(child.id);
    if (!pane || !isTerminalWorkspacePane(pane)) {
      return child;
    }

    const cwd = pane.cwd.trim();
    const fontSize = pane.fontSize;
    const terminalOpacity = pane.connection?.terminalOpacity;
    const terminalBackground =
      "terminalBackground" in pane && pane.terminalBackground !== undefined
        ? pane.terminalBackground
        : pane.connection?.terminalBackground;
    const cwdChanged = Boolean(cwd) && child.cwd !== cwd;
    const fontSizeChanged = child.fontSize !== fontSize;
    const opacityChanged = child.terminalOpacity !== terminalOpacity;
    const backgroundChanged = !backgroundsEqual(child.terminalBackground, terminalBackground);

    if (!cwdChanged && !fontSizeChanged && !opacityChanged && !backgroundChanged) {
      return child;
    }

    changed = true;
    return {
      ...child,
      cwd: cwdChanged ? cwd : child.cwd,
      fontSize,
      terminalOpacity,
      terminalBackground,
    };
  });

  return changed ? next : children;
}

/**
 * Gather the Panes that must survive when (re)building a parent Connection's
 * child panorama Tab, beyond the named child Connections themselves (issue #430):
 *
 *  - `carriedGroupPanes`: Panes already inside the group Tab that never became
 *    named children — e.g. a "split right" created within the panorama.
 *    Rebuilding the layout strictly from the children list would drop them.
 *  - `adoptedOrphanPanes`: the parent Connection's original session, opened as a
 *    plain Tab with no `childConnectionId`. Without adoption it is left behind as
 *    an unreachable orphan Tab once child Tabs take over the Connection.
 *
 * `excludedPaneIds` holds Panes the caller has already claimed (e.g. child Panes
 * being moved in from other Tabs) so they are not adopted a second time.
 */
export function collectPreservedParentPanes(params: {
  parentConnectionId: string;
  activeWorkspaceId: string;
  defaultWorkspaceId: string;
  existingGroupTab: WorkspaceTab | undefined;
  tabs: WorkspaceTab[];
  excludedPaneIds?: ReadonlySet<string>;
}): { carriedGroupPanes: WorkspacePane[]; adoptedOrphanPanes: WorkspacePane[] } {
  const {
    parentConnectionId,
    activeWorkspaceId,
    defaultWorkspaceId,
    existingGroupTab,
    tabs,
    excludedPaneIds,
  } = params;

  const carriedGroupPanes = existingGroupTab
    ? existingGroupTab.panes.filter((pane) => !pane.childConnectionId)
    : [];

  const claimed = new Set(excludedPaneIds ?? []);
  const adoptedOrphanPanes: WorkspacePane[] = [];
  for (const sourceTab of tabs) {
    if (
      sourceTab.kind !== "terminal" ||
      sourceTab.childConnectionGroupParentId ||
      sourceTab.connection?.id !== parentConnectionId ||
      (sourceTab.workspaceId ?? defaultWorkspaceId) !== activeWorkspaceId
    ) {
      continue;
    }
    for (const pane of sourceTab.panes) {
      if (pane.childConnectionId || claimed.has(pane.id)) {
        continue;
      }
      claimed.add(pane.id);
      adoptedOrphanPanes.push(pane);
    }
  }

  return { carriedGroupPanes, adoptedOrphanPanes };
}

export function focusedPaneIdForChildLayout(
  existingTab: Pick<WorkspaceTab, "focusedPaneId"> | undefined,
  panes: WorkspacePane[],
) {
  const paneIds = new Set(panes.map((pane) => pane.id));
  return existingTab?.focusedPaneId && paneIds.has(existingTab.focusedPaneId)
    ? existingTab.focusedPaneId
    : undefined;
}
