// Sites tab — durable site target groups (docs/ITOPS.md Phase 1). The left
// panel is a Connection-tree-style navigator over the rack topology
// (Site → Server Room → Rack); the right panel drills down that hierarchy,
// ending at a single animated rack elevation. Member lists come from the
// run-time resolver (itops_resolve_site) so dynamic-filter groups show the
// Connections they currently match.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2 } from "../../lib/reicon";
import { ConfirmSheet } from "../../app/ui/dialog";
import { showNativeContextMenu } from "../../lib/nativeContextMenu";
import { nativeMenuIcons } from "../../lib/nativeMenuIcons";
import { useWorkspaceStore } from "../../store";
import type { Site, Rack, RackItem, RackItemKind, ResolvedHost, ServerRoom } from "../../types";
import { ConnectionIcon } from "../workspace/connections/ConnectionIcon";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { SiteDialog } from "./SiteDialog";
import { BatchRunsTab } from "./BatchRunsTab";
import { AutomationsTab } from "./AutomationsTab";
import { HostsPanel } from "./HostsPanel";
import { RackElevation } from "./RackElevation";
import { RackDialog } from "./RackDialog";
import { ServerRoomDialog } from "./ServerRoomDialog";
import { RackItemDialog, RACK_ITEM_KINDS, type RackItemDraft } from "./RackItemDialog";
import { RackDevice } from "./RackDevice";
import { RackItemBindingsDialog } from "./RackItemBindingsDialog";
import { RackItemConnectPopover, type ConnectPopoverAnchor } from "./RackItemConnectPopover";
import { useItOpsStore, type RackPlacementKind } from "./state";
import {
  EMPTY_DRILL,
  groupRackTopology,
  groupRacksByGroup,
  nodeId,
  topologyGroupKey,
  type DrillPath,
} from "./rackTopology";
import { resolveIsoLayout, sanitizeFacing } from "./roomIsoLayout";
import { ItOpsBackground } from "./ItOpsBackground";
import { RackStage } from "./RackStage";
import { ServerRoomFloorPlan } from "./ServerRoomFloorPlan";
import { ServerRoomIsoView } from "./ServerRoomIsoView";
import { RoomObjectPicker, type RoomTool } from "./roomViewParts";
import { collectBoundConnectionIds } from "./rackInventory";
import type { DashboardBackground } from "../dashboard/types";
import { SharedBackgroundPopover } from "../dashboard/edit/SharedBackgroundPopover";
import { loadBackgroundImage } from "../dashboard/state/persistence";
import {
  SITE_TREE_COLLAPSED_WIDTH,
  SITE_TREE_MAX_WIDTH,
  SITE_TREE_MIN_WIDTH,
  loadCollapsedNodeIds,
  loadFreePlacement,
  loadRackFacing,
  loadRoomObjects,
  loadRoomViewMode,
  loadSiteTreeWidth,
  saveFreePlacement,
  saveCollapsedNodeIds,
  saveRackFacing,
  saveRoomObjects,
  saveRoomViewMode,
  saveSiteTreeWidth,
  sanitizeIsoFloor,
  type FreePlacementMap,
  type RackFacingMap,
  type RoomViewMode,
} from "./siteTreeState";
import { settleRoomObjects, type RoomObject } from "./roomObjects";
import {
  createItOpsPdfBytes,
  excelFilename,
  pdfFilename,
  rackExcelBytes,
  rackPdfDocument,
  roomIsoLayoutScope,
  saveExportBytes,
  serverRoomPdfDocument,
  siteLayoutScope,
  sitePdfDocument,
  type ItOpsExportFormat,
  type ItOpsExportLabels,
} from "./itopsExport";

const TILE_COLORS = [
  IT_ACCENTS.green,
  IT_ACCENTS.indigo,
  IT_ACCENTS.blue,
  IT_ACCENTS.teal,
  IT_ACCENTS.orange,
  IT_ACCENTS.purple,
];

type ItOpsCustomIcon = {
  iconColor?: string | null;
  iconDataUrl?: string | null;
  iconBackgroundColor?: string | null;
};

type PendingDelete =
  | { kind: "serverRoom"; siteId: string; room: ServerRoom; racks: Rack[] }
  | { kind: "rack"; siteId: string; rack: Rack }
  | { kind: "item"; siteId: string; rack: Rack; item: RackItem };

const FREE_CARD_WIDTH = 240;
const FREE_CARD_HEIGHT = 74;

// Site View segments: the Server Room card overview, or the Hosts / Batch
// Runs / Automations surfaces scoped to the selected Site.
type SiteViewMode = "overview" | "hosts" | "batchRuns" | "automations";

// A stable per-group tile colour (Sites don't store one); hashing the id
// keeps a group's colour steady across reloads without a durable field.
function groupColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return TILE_COLORS[hash % TILE_COLORS.length];
}

function groupIcon(group: Site): ItIconName {
  return group.filter ? "filter" : "site";
}

function iconForegroundForBackground(color?: string | null) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) {
    return "var(--surface)";
  }
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.72 ? "var(--text)" : "var(--surface)";
}

export function SitesTab({
  renderSidebarHeader,
  treeCollapsed,
  onShowWorkspace,
}: {
  renderSidebarHeader?: (props: { actions?: ReactNode; collapsed: boolean }) => ReactNode;
  treeCollapsed: boolean;
  /** Navigate the app shell to the Workspace Module (connect popover jumps). */
  onShowWorkspace: () => void;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const sites = useItOpsStore((state) => state.sites);
  const loaded = useItOpsStore((state) => state.loaded);
  const resolveSite = useItOpsStore((state) => state.resolveSite);
  const newGroupRequest = useItOpsStore((state) => state.newGroupRequest);
  const racksBySite = useItOpsStore((state) => state.racksBySite);
  const loadRacks = useItOpsStore((state) => state.loadRacks);
  const serverRoomsBySite = useItOpsStore((state) => state.serverRoomsBySite);
  const loadServerRooms = useItOpsStore((state) => state.loadServerRooms);
  const deleteServerRoom = useItOpsStore((state) => state.deleteServerRoom);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillPath>(EMPTY_DRILL);
  const [members, setMembers] = useState<ResolvedHost[]>([]);
  const [dialog, setDialog] = useState<{ group: Site | null } | null>(null);
  const [rackDialog, setRackDialog] = useState<{
    siteId: string;
    rack: Rack | null;
    defaultServerRoom?: string;
    /** Picker placement flow: consume the saved rack instead of drilling in. */
    onSaved?: (saved: Rack) => void;
  } | null>(null);
  const [serverRoomDialog, setServerRoomDialog] = useState<{
    siteId: string;
    room: ServerRoom | null;
  } | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [itemDialog, setItemDialog] = useState<{
    rack: Rack;
    item: RackItem | null;
    kind?: RackItemKind;
    startU?: number;
    /** Picker placement flow: arm the configured draft instead of placing. */
    onConfigured?: (draft: RackItemDraft) => void;
  } | null>(null);
  const [bindingsDialog, setBindingsDialog] = useState<RackItem | null>(null);
  const [connectPopover, setConnectPopover] = useState<{
    item: RackItem;
    anchor: ConnectPopoverAnchor;
  } | null>(null);
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);
  const placeRackItem = useItOpsStore((state) => state.placeRackItem);
  const deleteRack = useItOpsStore((state) => state.deleteRack);
  const removeRackItem = useItOpsStore((state) => state.removeRackItem);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // ── Tree navigator state (search, resizable width, collapsed nodes) ──
  const [query, setQuery] = useState("");
  const [treeWidth, setTreeWidth] = useState(loadSiteTreeWidth);
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsedNodeIds);
  const resizing = useRef(false);
  const treeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => saveCollapsedNodeIds(collapsed), [collapsed]);

  const isExpanded = useCallback((id: string) => !collapsed.has(id), [collapsed]);
  const toggleNode = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const expandAllNodes = useCallback(() => setCollapsed(new Set()), []);
  const collapseAllNodes = useCallback(() => {
    setCollapsed(() => {
      const next = new Set<string>();
      for (const site of sites) {
        const siteId = nodeId.site(site.id);
        const siteRacks = racksBySite[site.id] ?? [];
        const siteTopo = groupRackTopology(siteRacks, serverRoomsBySite[site.id] ?? []);
        if (siteTopo.length > 0) {
          next.add(siteId);
        }
        for (const room of siteTopo) {
          if (room.racks.length > 0) {
            next.add(nodeId.serverRoom(site.id, room.key));
          }
        }
      }
      return next;
    });
  }, [racksBySite, serverRoomsBySite, sites]);

  // Drag the splitter to resize the tree. During the drag we set the width
  // directly on the DOM element so the cursor stays in sync with the bar —
  // calling setTreeWidth on every pointermove triggers a full tree re-render
  // which causes the 1–2 second lag. React state (and persistence) sync on
  // pointer up.
  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (treeCollapsed) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizing.current = true;
    document.body.style.cursor = "col-resize";

    const startX = event.clientX;
    const startWidth = treeWidth;
    const el = treeRef.current;
    let lastWidth = startWidth;

    function onMove(event: PointerEvent) {
      if (!resizing.current || !el) return;
      lastWidth = Math.min(
        SITE_TREE_MAX_WIDTH,
        Math.max(SITE_TREE_MIN_WIDTH, startWidth + event.clientX - startX),
      );
      el.style.width = `${lastWidth}px`;
      el.style.flex = `0 0 ${lastWidth}px`;
    }

    function onUp() {
      if (!resizing.current) return;
      resizing.current = false;
      document.body.style.cursor = "";
      setTreeWidth(lastWidth);
      saveSiteTreeWidth(lastWidth);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [treeCollapsed, treeWidth]);

  const activeGroup = useMemo(
    () => sites.find((group) => group.id === activeId) ?? sites[0] ?? null,
    [sites, activeId],
  );

  // Open the create dialog when the module header's primary button signals.
  const seenNewGroupRequest = useRef(newGroupRequest);
  useEffect(() => {
    if (newGroupRequest !== seenNewGroupRequest.current) {
      seenNewGroupRequest.current = newGroupRequest;
      setDialog({ group: null });
    }
  }, [newGroupRequest]);

  // Keep a valid selection as the list loads or its active group is removed.
  useEffect(() => {
    if (sites.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!sites.some((group) => group.id === activeId)) {
      setActiveId(sites[0].id);
    }
  }, [sites, activeId]);

  // Resolve the active group's members whenever the group (or its definition)
  // changes. The group object identity changes after an edit, re-running this.
  useEffect(() => {
    let disposed = false;
    if (!activeGroup) {
      setMembers([]);
      return;
    }
    void resolveSite(activeGroup.id)
      .then((resolved) => {
        if (!disposed) setMembers(resolved);
      })
      .catch(() => {
        if (!disposed) setMembers([]);
      });
    return () => {
      disposed = true;
    };
  }, [activeGroup, resolveSite]);

  // Load every Site's durable topology before deciding whether its tree row
  // has children. Gating the request on expansion creates a deadlock for a
  // restored collapsed row: unloaded data means no caret, so it cannot expand.
  useEffect(() => {
    for (const site of sites) {
      if (!racksBySite[site.id]) void loadRacks(site.id);
      if (!serverRoomsBySite[site.id]) void loadServerRooms(site.id);
    }
  }, [sites, racksBySite, serverRoomsBySite, loadRacks, loadServerRooms]);

  const racks = useMemo(
    () => (activeGroup ? (racksBySite[activeGroup.id] ?? []) : []),
    [activeGroup, racksBySite],
  );
  const serverRooms = useMemo(
    () => (activeGroup ? (serverRoomsBySite[activeGroup.id] ?? []) : []),
    [activeGroup, serverRoomsBySite],
  );
  const topology = useMemo(() => groupRackTopology(racks, serverRooms), [racks, serverRooms]);
  const topologyLoaded = activeGroup
    ? racksBySite[activeGroup.id] !== undefined && serverRoomsBySite[activeGroup.id] !== undefined
    : false;
  const selectedSiteIdForDialog = activeGroup?.id ?? sites[0]?.id ?? "";
  const selectedServerRoomForDialog =
    drill.serverRoom ?? (drill.rackId ? racks.find((rack) => rack.id === drill.rackId)?.serverRoom : undefined);

  // A placed Connection whose id no longer resolves to a Site member (deleted
  // or moved out) is a "ghost" — shown dimmed, not openable, editable/removable.
  const memberIds = useMemo(() => new Set(members.map((m) => m.connectionId)), [members]);
  function isGhostItem(item: RackItem): boolean {
    return item.kind === "connection" && !!item.connectionId && !memberIds.has(item.connectionId);
  }

  // Resolve a placed Connection's host so its faceplate can show the address.
  const hostById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) map.set(member.connectionId, member.host);
    return map;
  }, [members]);
  function hostForItem(item: RackItem): string | null {
    return item.connectionId ? (hostById.get(item.connectionId) ?? null) : null;
  }

  // Select a node: focus its Site, switch to the Rack view, and set the drill.
  function selectNode(siteId: string, next: DrillPath) {
    setActiveId(siteId);
    setDrill(next);
  }

  function showPropertiesMenu(event: ReactMouseEvent<HTMLElement>, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    void showNativeContextMenu(
      [
        {
          kind: "item",
          label: t("common.properties"),
          iconSvg: nativeMenuIcons.pencil,
          action,
        },
      ],
      { x: event.clientX, y: event.clientY },
    );
  }

  // Armed picker placement: the configured Rack Device lands on the clicked U.
  async function placeConfiguredDevice(rack: Rack, draft: RackItemDraft, startU: number) {
    if (!activeGroup) return;
    try {
      await placeRackItem(activeGroup.id, {
        rackId: rack.id,
        connectionId: draft.connectionId,
        kind: draft.kind,
        label: draft.label,
        startU,
        heightU: draft.heightU,
        metadata: draft.metadata,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  async function moveItem(itemId: string, targetRackId: string, startU: number) {
    if (!activeGroup) return;
    const item = racks.flatMap((rack) => rack.items).find((entry) => entry.id === itemId);
    if (!item) return;
    if (item.rackId === targetRackId && item.startU === startU) return;
    try {
      await moveRackItem(activeGroup.id, {
        id: itemId,
        rackId: targetRackId,
        startU,
        heightU: item.heightU,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  // Click on a bound device: anchor the connect popover to its faceplate.
  function openRackItem(item: RackItem, anchorEl: HTMLElement) {
    if (collectBoundConnectionIds(item).length === 0) return;
    const rect = anchorEl.getBoundingClientRect();
    setConnectPopover({
      item,
      anchor: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    });
  }

  async function confirmDelete() {
    const pending = pendingDelete;
    if (!pending) return;
    setPendingDelete(null);
    try {
      if (pending.kind === "serverRoom") {
        for (const rack of pending.racks) {
          await deleteRack(pending.siteId, rack.id);
        }
        await deleteServerRoom(pending.siteId, pending.room.id);
        setDrill(EMPTY_DRILL);
        return;
      }
      if (pending.kind === "rack") {
        await deleteRack(pending.siteId, pending.rack.id);
        setDrill({ serverRoom: pending.rack.serverRoom, rackId: null });
        return;
      }
      await removeRackItem(pending.siteId, pending.item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  if (loaded && sites.length === 0) {
    return (
      <>
        <div className="it-empty">
          <span className="glyph">
            <ItIcon name="site" size={30} sw={1.5} />
          </span>
          <h2>{t("itops.sites.emptyTitle")}</h2>
          <p>{t("itops.sites.emptyBody")}</p>
          <button type="button" className="it-btn primary" onClick={() => setDialog({ group: null })}>
            <span className="it-btn-ic">
              <ItIcon name="plus" size={15} />
            </span>
            {t("itops.actions.newSite")}
          </button>
        </div>
        {dialog ? (
          <SiteDialog
            group={dialog.group}
            onClose={() => setDialog(null)}
            onSaved={(saved) => setActiveId(saved.id)}
          />
        ) : null}
      </>
    );
  }

  // The deepest selected node id, for tree-row highlighting.
  const selectedId = !activeGroup
    ? ""
    : drill.rackId
      ? nodeId.rack(drill.rackId)
      : drill.serverRoom != null
        ? nodeId.serverRoom(activeGroup.id, drill.serverRoom)
        : nodeId.site(activeGroup.id);

  // ── Per-view background derivation ──
  const drillRack = drill.rackId != null ? racks.find((r) => r.id === drill.rackId) : undefined;

  const viewBackground = drillRack
    ? drillRack.background
    : drill.serverRoom != null
      ? activeGroup?.roomBackgrounds?.[drill.serverRoom]
      : activeGroup?.background;

  const q = query.trim().toLowerCase();
  const matchQ = (s: string) => !q || (s || t("itops.racks.unassigned")).toLowerCase().includes(q);
  const effectiveTreeWidth = treeCollapsed ? SITE_TREE_COLLAPSED_WIDTH : treeWidth;
  const hasExpandableTreeNodes = sites.some(
    (site) =>
      groupRackTopology(racksBySite[site.id] ?? [], serverRoomsBySite[site.id] ?? []).length > 0,
  );
  const addTopologyMenu = !treeCollapsed ? (
    <div className="ft-add-wrap">
      <button
        type="button"
        className="icon-button"
        title={t("itops.racks.addNode")}
        aria-label={t("itops.racks.addNode")}
        aria-haspopup="menu"
        aria-expanded={addMenuOpen}
        onClick={() => setAddMenuOpen((open) => !open)}
      >
        <ItIcon name="plus" size={14} />
      </button>
      {addMenuOpen ? (
        <>
          <div className="ft-add-backdrop" onClick={() => setAddMenuOpen(false)} />
          <div className="ft-add-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAddMenuOpen(false);
                setDialog({ group: null });
              }}
            >
              <ItIcon name="site" size={14} />
              {t("itops.racks.addSite")}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!activeGroup}
              onClick={() => {
                setAddMenuOpen(false);
                setServerRoomDialog({ siteId: selectedSiteIdForDialog, room: null });
              }}
            >
              <ItIcon name="room" size={14} />
              {t("itops.racks.addServerRoom")}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!activeGroup}
              onClick={() => {
                setAddMenuOpen(false);
                setRackDialog({
                  siteId: selectedSiteIdForDialog,
                  rack: null,
                  defaultServerRoom: selectedServerRoomForDialog,
                });
              }}
            >
              <ItIcon name="rack" size={14} />
              {t("itops.racks.addRack")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={`hg ft${treeCollapsed ? " ft-collapsed" : ""}`}>
      {/* ── Tree navigator ── */}
      <div
        ref={treeRef}
        className="ft-tree"
        data-tutorial-id="itops.sitesTree"
        style={{ width: effectiveTreeWidth, flex: `0 0 ${effectiveTreeWidth}px` }}
      >
        {renderSidebarHeader?.({ actions: addTopologyMenu, collapsed: treeCollapsed })}
        {!treeCollapsed ? (
          <>
            <div className="ft-head">
              <span className="ft-head-title">{t("itops.sites.heading")}</span>
              {hasExpandableTreeNodes ? (
                <div className="ft-tree-controls" aria-label={t("itops.sites.heading")}>
                  <button
                    aria-label={t("connections.collapseAll")}
                    className="it-icon-btn sm ft-tree-control"
                    onClick={collapseAllNodes}
                    title={t("connections.collapseAll")}
                    type="button"
                  >
                    <Minimize2 size={13} />
                  </button>
                  <button
                    aria-label={t("connections.expandAll")}
                    className="it-icon-btn sm ft-tree-control"
                    onClick={expandAllNodes}
                    title={t("connections.expandAll")}
                    type="button"
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="ft-search">
              <ItIcon name="search" size={13} />
              <input
                type="text"
                value={query}
                placeholder={t("itops.racks.treeSearchPlaceholder")}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              {query ? (
                <button type="button" className="ft-search-x" onClick={() => setQuery("")}>
                  <ItIcon name="xmark" size={12} />
                </button>
              ) : null}
            </div>
            <div className="ft-tree-body">
              {sites.map((site) => {
                const fId = nodeId.site(site.id);
                const siteRacks = racksBySite[site.id] ?? [];
                const siteTopo = groupRackTopology(siteRacks, serverRoomsBySite[site.id] ?? []);
                const open = isExpanded(fId);
                return (
                  <div key={site.id}>
                    <TreeRow
                      depth={0}
                      icon={groupIcon(site)}
                      customIcon={site}
                      label={site.name}
                      tint={groupColor(site.id)}
                      hasChildren={siteTopo.length > 0}
                      open={open}
                      selected={selectedId === fId && drill.serverRoom == null}
                      onToggle={() => toggleNode(fId)}
                      onSelect={() => {
                        setActiveId(site.id);
                        setDrill(EMPTY_DRILL);
                      }}
                      onContextMenu={(event) =>
                        showPropertiesMenu(event, () => setDialog({ group: site }))
                      }
                    />
                    {open
                      ? siteTopo
                          .filter((room) => matchQ(room.key))
                          .map((room) => {
                            const mId = nodeId.serverRoom(site.id, room.key);
                            const mOpen = isExpanded(mId);
                            return (
                              <div key={mId}>
                                <TreeRow
                                  depth={1}
                                  icon="room"
                                  customIcon={site.roomIcons?.[room.key]}
                                  label={room.key || t("itops.racks.unassigned")}
                                  count={room.racks.length}
                                  hasChildren={room.racks.length > 0}
                                  open={mOpen}
                                  selected={selectedId === mId}
                                  onToggle={() => toggleNode(mId)}
                                  onSelect={() =>
                                    selectNode(site.id, { serverRoom: room.key, rackId: null })
                                  }
                                  onContextMenu={
                                    room.room
                                      ? (event) =>
                                          showPropertiesMenu(event, () =>
                                            setServerRoomDialog({ siteId: site.id, room: room.room! }),
                                          )
                                      : undefined
                                  }
                                />
                                {mOpen
                                  ? room.racks.map((rack) => (
                                      <TreeRow
                                        key={rack.id}
                                        depth={2}
                                        icon="rack"
                                        label={rack.name}
                                        hasChildren={false}
                                        open={false}
                                        selected={selectedId === nodeId.rack(rack.id)}
                                        onSelect={() =>
                                          selectNode(site.id, {
                                            serverRoom: room.key,
                                            rackId: rack.id,
                                          })
                                        }
                                        onContextMenu={(event) =>
                                          showPropertiesMenu(event, () =>
                                            setRackDialog({ siteId: site.id, rack }),
                                          )
                                        }
                                      />
                                    ))
                                  : null}
                              </div>
                            );
                          })
                      : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
        <div
          className="ft-resize"
          onPointerDown={handleResizeStart}
        />
      </div>

      {/* ── Detail ── */}
      {activeGroup ? (
        <div className="hg-detail" data-tutorial-id="itops.siteView">
          <RackDrill
            topology={topology}
            topologyLoaded={topologyLoaded}
            racks={racks}
            site={activeGroup}
            members={members}
            drill={drill}
            setDrill={setDrill}
            viewBackground={viewBackground}
            roomIcons={activeGroup.roomIcons}
            hostForItem={hostForItem}
            isGhostItem={isGhostItem}
            onSlotClick={(rack, startU) => setItemDialog({ rack, item: null, startU })}
            onConfigureDevice={(rack, kind, arm) =>
              setItemDialog({ rack, item: null, kind, onConfigured: arm })
            }
            onPlaceDevice={(rack, draft, startU) => void placeConfiguredDevice(rack, draft, startU)}
            onOpenItem={openRackItem}
            onEditItem={(rack, item) => setItemDialog({ rack, item })}
            onBindItem={setBindingsDialog}
            onMoveItem={(itemId, targetRackId, startU) => void moveItem(itemId, targetRackId, startU)}
            onAddRack={(serverRoom) => {
              setRackDialog({
                siteId: activeGroup.id,
                rack: null,
                defaultServerRoom: serverRoom,
              });
            }}
            onAddServerRoom={() => {
              setServerRoomDialog({ siteId: activeGroup.id, room: null });
            }}
            onAddRackForPlacement={(serverRoom, onSaved) => {
              setRackDialog({
                siteId: activeGroup.id,
                rack: null,
                defaultServerRoom: serverRoom,
                onSaved,
              });
            }}
            onDeleteServerRoom={(serverRoom, roomRacks) => {
              const room = serverRooms.find((entry) => topologyGroupKey(entry.name) === topologyGroupKey(serverRoom));
              if (room) setPendingDelete({ kind: "serverRoom", siteId: activeGroup.id, room, racks: roomRacks });
            }}
            onDeleteRack={(rack) =>
              setPendingDelete({ kind: "rack", siteId: activeGroup.id, rack })
            }
            onDeleteItem={(rack, item) =>
              setPendingDelete({ kind: "item", siteId: activeGroup.id, rack, item })
            }
          />
        </div>
      ) : null}

      {dialog ? (
        <SiteDialog
          group={dialog.group}
          onClose={() => setDialog(null)}
          onSaved={(saved) => setActiveId(saved.id)}
        />
      ) : null}
      {rackDialog && activeGroup ? (
        <RackDialog
          defaultSiteId={rackDialog.siteId}
          sites={sites}
          serverRoomsBySite={serverRoomsBySite}
          rack={rackDialog.rack}
          defaultServerRoom={rackDialog.defaultServerRoom}
          onClose={() => setRackDialog(null)}
          onSaved={(saved) => {
            // Picker placement flow: stay in the room view and arm the new
            // rack for its placement click instead of drilling into it.
            if (rackDialog.onSaved) {
              rackDialog.onSaved(saved);
              return;
            }
            setActiveId(saved.siteId);
            setDrill({ serverRoom: saved.serverRoom, rackId: saved.id });
          }}
        />
      ) : null}
      {serverRoomDialog ? (
        <ServerRoomDialog
          sites={sites}
          defaultSiteId={serverRoomDialog.siteId}
          room={serverRoomDialog.room}
          onClose={() => setServerRoomDialog(null)}
          onSaved={(saved) => {
            setActiveId(saved.siteId);
            setDrill({ serverRoom: saved.name, rackId: null });
          }}
        />
      ) : null}
      {itemDialog && activeGroup ? (
        <RackItemDialog
          siteId={activeGroup.id}
          rack={itemDialog.rack}
          item={itemDialog.item}
          defaultKind={itemDialog.kind}
          defaultStartU={itemDialog.startU}
          members={members}
          onClose={() => setItemDialog(null)}
          onConfigured={itemDialog.onConfigured}
        />
      ) : null}
      {bindingsDialog && activeGroup ? (
        <RackItemBindingsDialog siteId={activeGroup.id} item={bindingsDialog} onClose={() => setBindingsDialog(null)} />
      ) : null}
      {connectPopover ? (
        <RackItemConnectPopover
          item={connectPopover.item}
          anchor={connectPopover.anchor}
          onClose={() => setConnectPopover(null)}
          onShowWorkspace={onShowWorkspace}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmSheet
          tone="danger"
          title={
            pendingDelete.kind === "serverRoom"
              ? t("itops.racks.deleteServerRoomTitle")
              : pendingDelete.kind === "rack"
                ? t("itops.racks.deleteTitle")
                : t("itops.racks.deleteItemTitle")
          }
          message={
            pendingDelete.kind === "serverRoom"
              ? t("itops.racks.deleteServerRoomBody", {
                  name: pendingDelete.room.name,
                  count: pendingDelete.racks.length,
                })
              : pendingDelete.kind === "rack"
                ? t("itops.racks.deleteBody", { name: pendingDelete.rack.name })
                : t("itops.racks.deleteItemBody", {
                    name: pendingDelete.item.label || t(`itops.racks.kind.${pendingDelete.item.kind}`),
                  })
          }
          confirmLabel={t("itops.actions.delete")}
          confirmIcon="trash"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}

function ItOpsIcon({
  icon,
  customIcon,
  size,
}: {
  icon: ItIconName;
  customIcon?: ItOpsCustomIcon;
  size: number;
}) {
  if (customIcon?.iconDataUrl) {
    return (
      <ConnectionIcon
        iconBackgroundColor={customIcon.iconBackgroundColor}
        iconColor={customIcon.iconColor}
        iconDataUrl={customIcon.iconDataUrl}
        size={size}
        type="localFiles"
      />
    );
  }
  if (customIcon?.iconBackgroundColor) {
    return (
      <span
        className="ft-custom-icon"
        style={{
          background: customIcon.iconBackgroundColor,
          color: iconForegroundForBackground(customIcon.iconBackgroundColor),
        }}
      >
        {customIcon.iconColor ? (
          <span style={{ color: customIcon.iconColor }}>
            <ItIcon name={icon} size={size} sw={1.6} />
          </span>
        ) : (
          <ItIcon name={icon} size={size} sw={1.6} />
        )}
      </span>
    );
  }
  if (customIcon?.iconColor) {
    return (
      <span style={{ color: customIcon.iconColor }}>
        <ItIcon name={icon} size={size} sw={1.6} />
      </span>
    );
  }
  return <ItIcon name={icon} size={size} sw={1.6} />;
}

// ── Tree row ──────────────────────────────────────────────────────────────
function TreeRow({
  depth,
  icon,
  customIcon,
  label,
  count,
  tint,
  hasChildren,
  open,
  selected,
  onToggle,
  onSelect,
  onContextMenu,
}: {
  depth: number;
  icon: ItIconName;
  customIcon?: ItOpsCustomIcon;
  label: string;
  count?: number;
  tint?: string;
  hasChildren: boolean;
  open: boolean;
  selected: boolean;
  onToggle?: () => void;
  onSelect: () => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`ft-row${selected ? " sel" : ""}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <button
        type="button"
        className={`ft-caret${hasChildren ? "" : " empty"}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle?.();
        }}
        tabIndex={hasChildren ? 0 : -1}
        aria-hidden={!hasChildren}
      >
        {hasChildren ? <ItIcon name={open ? "chevD" : "chevR"} size={11} /> : null}
      </button>
      <span className="ft-ic" style={tint ? { color: tint } : undefined}>
        <ItOpsIcon icon={icon} customIcon={customIcon} size={14} />
      </span>
      <span className="ft-label">{label}</span>
      {count != null ? <span className="ft-count">{count}</span> : null}
    </div>
  );
}

// ── Rack drill body ───────────────────────────────────────────────────────
function RackDrill({
  topology,
  topologyLoaded,
  racks,
  site,
  members,
  drill,
  setDrill,
  viewBackground,
  roomIcons,
  hostForItem,
  isGhostItem,
  onSlotClick,
  onConfigureDevice,
  onPlaceDevice,
  onOpenItem,
  onEditItem,
  onBindItem,
  onMoveItem,
  onAddServerRoom,
  onAddRack,
  onAddRackForPlacement,
  onDeleteServerRoom,
  onDeleteRack,
  onDeleteItem,
}: {
  topology: ReturnType<typeof groupRackTopology>;
  topologyLoaded: boolean;
  racks: Rack[];
  site: Site;
  /** The Site's resolved member Connections (for scoping the site segments). */
  members: ResolvedHost[];
  drill: DrillPath;
  setDrill: (next: DrillPath) => void;
  viewBackground: DashboardBackground | null | undefined;
  roomIcons?: Record<string, ItOpsCustomIcon>;
  hostForItem: (item: RackItem) => string | null;
  isGhostItem: (item: RackItem) => boolean;
  /** Server Room elevation only: an empty-slot click opens the add dialog at
   *  that U. Rack View adds devices through the picker's armed flow instead. */
  onSlotClick: (rack: Rack, startU: number) => void;
  /** Picker flow: open the device dialog in configure mode; `arm` receives the
   *  configured draft so the drill can start the cursor-tracked placement. */
  onConfigureDevice: (rack: Rack, kind: RackItemKind, arm: (draft: RackItemDraft) => void) => void;
  /** Armed placement click landed on `startU`: place the configured device. */
  onPlaceDevice: (rack: Rack, draft: RackItemDraft, startU: number) => void;
  onOpenItem: (item: RackItem, anchor: HTMLElement) => void;
  onEditItem: (rack: Rack, item: RackItem) => void;
  onBindItem: (item: RackItem) => void;
  onMoveItem: (itemId: string, targetRackId: string, startU: number) => void;
  onAddServerRoom: () => void;
  onAddRack: (serverRoom: string) => void;
  /** Picker flow: open the New Rack dialog, hand the saved rack back for a
   *  placement click instead of drilling into it. */
  onAddRackForPlacement: (serverRoom: string, onSaved: (saved: Rack) => void) => void;
  onDeleteServerRoom: (serverRoom: string, racks: Rack[]) => void;
  onDeleteRack: (rack: Rack) => void;
  onDeleteItem: (rack: Rack, item: RackItem) => void;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const unassigned = t("itops.racks.unassigned");
  const ungrouped = t("itops.racks.ungrouped");
  const [editMode, setEditMode] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const setServerRoomBackground = useItOpsStore((state) => state.setServerRoomBackground);
  const setSiteBackground = useItOpsStore((state) => state.setSiteBackground);

  // Server Room View layout: rack elevations (default), the blueprint floor
  // plan, or the 2.5D room. Persists app-wide.
  const [roomView, setRoomView] = useState<RoomViewMode>(loadRoomViewMode);
  useEffect(() => saveRoomViewMode(roomView), [roomView]);

  // Site View segment: the Server Room card overview (default), or the Batch
  // Runs / Automations surfaces scoped to this Site's Connections.
  const [siteView, setSiteView] = useState<SiteViewMode>("overview");
  const requestNewBatchRun = useItOpsStore((state) => state.requestNewBatchRun);
  const requestNewAutomation = useItOpsStore((state) => state.requestNewAutomation);
  const requestHostImport = useItOpsStore((state) => state.requestHostImport);

  // Host inventory for the Hosts segment and the Rack View callouts.
  const siteHosts = useItOpsStore((state) => state.hostsBySite[site.id]);
  const loadHosts = useItOpsStore((state) => state.loadHosts);
  useEffect(() => {
    void loadHosts(site.id).catch(() => undefined);
  }, [site.id, loadHosts]);

  // Picker column state shared by the two spatial layouts: the armed room
  // object kind, and a just-created rack awaiting its placement click.
  const [roomTool, setRoomTool] = useState<RoomTool>(null);
  const [placeRackId, setPlaceRackId] = useState<string | null>(null);
  // Rack View picker: a configured Rack Device awaiting its placement click.
  const [placeDevice, setPlaceDevice] = useState<RackItemDraft | null>(null);

  const serverRoom =
    drill.serverRoom != null
      ? topology.find((s) => topologyGroupKey(s.key) === topologyGroupKey(drill.serverRoom))
      : undefined;
  const rack = drill.rackId != null ? racks.find((r) => r.id === drill.rackId) : undefined;
  const viewKey = rack
    ? `rack:${rack.id}`
    : serverRoom
      ? `room:${site.id}:${topologyGroupKey(serverRoom.key)}`
      : `site:${site.id}`;
  useEffect(() => {
    setEditMode(false);
    setExportMenuOpen(false);
    setBackgroundOpen(false);
    setSiteView("overview");
  }, [viewKey]);
  useEffect(() => {
    setRoomTool(null);
    setPlaceRackId(null);
    setPlaceDevice(null);
  }, [viewKey, editMode, roomView]);

  const sitePlacementScope = siteLayoutScope(site.id);
  const [sitePlacements, setSitePlacements] = useState<FreePlacementMap>(() =>
    loadFreePlacement(sitePlacementScope),
  );
  useEffect(() => {
    setSitePlacements(loadFreePlacement(sitePlacementScope));
  }, [sitePlacementScope]);

  // Rack placements are durable rack fields (SQLite); the localStorage scopes
  // remain as a legacy fallback for layouts saved before the durable columns
  // existed. Merge order: legacy < durable < this session's live edits.
  // The floor plan and the 2.5D view share this one grid-cell placement, so
  // arranging the room in either view rearranges both.
  const roomRacks = serverRoom?.racks;
  const isoPlacementScope = serverRoom ? roomIsoLayoutScope(site.id, serverRoom.key) : "";
  const legacyIsoPlacements = useMemo(
    () => (isoPlacementScope ? loadFreePlacement(isoPlacementScope) : {}),
    [isoPlacementScope],
  );
  const [isoEdits, setIsoEdits] = useState<FreePlacementMap>({});
  useEffect(() => setIsoEdits({}), [isoPlacementScope]);
  const isoPlacements = useMemo(
    () => ({
      ...legacyIsoPlacements,
      ...durablePlacement(roomRacks, "grid"),
      ...isoEdits,
    }),
    [legacyIsoPlacements, roomRacks, isoEdits],
  );

  // Per-room rack facing, shared by the floor plan and the 2.5D view. Facing
  // is a durable rack field; the localStorage scope remains as the legacy /
  // non-Tauri fallback. Merge order: legacy < durable < this session's edits
  // (the same merge as placements).
  const legacyFacing = useMemo(
    () => (isoPlacementScope ? loadRackFacing(isoPlacementScope) : {}),
    [isoPlacementScope],
  );
  const [facingEdits, setFacingEdits] = useState<RackFacingMap>({});
  useEffect(() => setFacingEdits({}), [isoPlacementScope]);
  const roomFacing = useMemo(() => {
    const durable: RackFacingMap = {};
    for (const entry of roomRacks ?? []) {
      if (entry.facing != null) durable[entry.id] = sanitizeFacing(entry.facing);
    }
    return { ...legacyFacing, ...durable, ...facingEdits };
  }, [legacyFacing, roomRacks, facingEdits]);

  const setRackFacings = useItOpsStore((state) => state.setRackFacings);
  const loadDurableRoomObjects = useItOpsStore((state) => state.loadRoomObjects);
  const saveDurableRoomObjects = useItOpsStore((state) => state.saveRoomObjects);

  function saveRoomFacingState(next: RackFacingMap) {
    setFacingEdits(next);
    if (isoPlacementScope) saveRackFacing(isoPlacementScope, next);
    const entries = Object.entries(next)
      .filter(([id]) => rackIds.has(id))
      .map(([id, facing]) => ({ id, facing }));
    setRackFacings(site.id, entries).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    });
  }

  // Non-rack room objects: durable per room (itops_room_objects), with the
  // localStorage scope as the legacy / non-Tauri fallback until the first
  // durable write.
  const [roomObjects, setRoomObjects] = useState<RoomObject[]>([]);
  const roomObjectsSaveTimer = useRef<number | undefined>(undefined);
  const roomName = serverRoom ? serverRoom.key : null;
  useEffect(() => {
    let cancelled = false;
    setRoomObjects(isoPlacementScope ? loadRoomObjects(isoPlacementScope) : []);
    if (roomName == null) return;
    loadDurableRoomObjects(site.id, roomName)
      .then((durable) => {
        if (!cancelled && durable.length > 0) setRoomObjects(durable);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [isoPlacementScope, roomName, site.id, loadDurableRoomObjects, showStatusBarNotice, t]);

  const saveRoomObjectsState = useCallback((next: RoomObject[]) => {
    setRoomObjects(next);
    if (isoPlacementScope) saveRoomObjects(isoPlacementScope, next);
    if (roomName == null) return;
    if (roomObjectsSaveTimer.current != null) {
      window.clearTimeout(roomObjectsSaveTimer.current);
    }
    // Debounced like placement saves: dragging an object streams positions.
    roomObjectsSaveTimer.current = window.setTimeout(() => {
      roomObjectsSaveTimer.current = undefined;
      saveDurableRoomObjects(site.id, roomName, next).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      });
    }, 500);
  }, [isoPlacementScope, roomName, saveDurableRoomObjects, showStatusBarNotice, site.id, t]);

  useEffect(() => {
    if (!isoPlacementScope || roomRacks == null || roomObjects.length === 0) return;
    // Settle against the same resolved cells the room views draw (stored
    // placements plus derived defaults), not the raw stored map — otherwise
    // auto-placed racks are invisible to gravity and their rack-top objects
    // would be yanked to the floor.
    const rackCells = resolveIsoLayout(roomRacks, isoPlacements).cells;
    const settled = settleRoomObjects(roomObjects, roomRacks, rackCells, roomFacing);
    if (!sameRoomObjects(roomObjects, settled)) saveRoomObjectsState(settled);
  }, [isoPlacementScope, roomObjects, roomRacks, isoPlacements, roomFacing, saveRoomObjectsState]);

  function notifyObjectBlocked() {
    showStatusBarNotice(t("itops.floorPlan.objectNoSpace"), { tone: "warning" });
  }

  // The background popover serves the Server Room 2.5D view and Site View;
  // each persists to its own durable scope.
  async function saveDrillViewBackground(background: DashboardBackground | null) {
    try {
      if (serverRoom) {
        await setServerRoomBackground(site.id, serverRoom.key, background);
      } else {
        await setSiteBackground(site.id, background);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  // Snap every Server Room card back onto the default Site View grid.
  function autoOrganizeSiteRooms() {
    const next: FreePlacementMap = {};
    topology.forEach((room, index) => {
      next[topologyGroupKey(room.key)] = defaultFreePlacement(
        index,
        FREE_CARD_WIDTH,
        FREE_CARD_HEIGHT,
      );
    });
    saveSitePlacements(next);
  }

  // Persist placements durably, debounced: the floor plan streams a position
  // per pointermove, and even the iso view's one-per-drop saves batch cleanly.
  const setRackPlacements = useItOpsStore((state) => state.setRackPlacements);
  const durableSaveTimers = useRef<Partial<Record<RackPlacementKind, number>>>({});
  const rackIds = useMemo(() => new Set(racks.map((entry) => entry.id)), [racks]);
  function scheduleDurableSave(kind: RackPlacementKind, map: FreePlacementMap) {
    const pending = durableSaveTimers.current[kind];
    if (pending != null) window.clearTimeout(pending);
    durableSaveTimers.current[kind] = window.setTimeout(() => {
      durableSaveTimers.current[kind] = undefined;
      const entries = Object.entries(map)
        .filter(([id]) => rackIds.has(id))
        .map(([id, point]) => ({ id, x: point.x, y: point.y }));
      setRackPlacements(site.id, kind, entries).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      });
    }, 500);
  }

  function elevation(r: Rack) {
    return (
      <RackElevation
        key={r.id}
        rack={r}
        hostFor={hostForItem}
        editMode={editMode}
        onSlotClick={editMode ? (startU) => onSlotClick(r, startU) : undefined}
        onOpenItem={onOpenItem}
        onEditItem={(item) => onEditItem(r, item)}
        onBindItem={onBindItem}
        onMoveItem={editMode ? onMoveItem : undefined}
        onDeleteRack={editMode ? onDeleteRack : undefined}
        onDeleteItem={editMode ? (item) => onDeleteItem(r, item) : undefined}
        isGhost={isGhostItem}
      />
    );
  }

  function handleSegmentAdd() {
    if (siteView === "hosts") {
      requestHostImport();
      return;
    }
    if (siteView === "batchRuns") {
      requestNewBatchRun(site.id);
      return;
    }
    if (siteView === "automations") {
      requestNewAutomation();
    }
  }

  function kindLabel(kind: RackItem["kind"]) {
    return t(`itops.racks.kind.${kind}`);
  }

  function exportLabels(): ItOpsExportLabels {
    return {
      devices: t("itops.export.devices"),
      noRacks: t("itops.export.noRacks"),
      noDevices: t("itops.export.noDevices"),
      inventory: t("itops.export.inventory"),
      rack: t("itops.export.rack"),
      group: t("itops.racks.groupLabel"),
      ungrouped: t("itops.racks.ungrouped"),
      startU: t("itops.racks.startULabel"),
      heightU: t("itops.racks.heightLabel"),
      type: t("itops.racks.kindLabel"),
      label: t("itops.racks.labelLabel"),
      status: t("itops.racks.statusLabel"),
      connection: t("itops.racks.connectionLabel"),
      specs: t("itops.export.specs"),
      tags: t("itops.racks.tagsLabel"),
      deviceCount: (count) => t("itops.racks.deviceCount", { count }),
      statusLabel: (status) => t(`itops.racks.status.${status}`, { defaultValue: status }),
    };
  }

  async function handleExport(format: ItOpsExportFormat) {
    setExportMenuOpen(false);
    try {
      const labels = exportLabels();
      let name = site.name;
      if (format === "excel" && rack) {
        const roomName = rack.serverRoom;
        name = `${site.name}-${rack.name}`;
        const path = await saveExportBytes(
          excelFilename(name),
          rackExcelBytes({ site, rack, roomName, unassignedLabel: unassigned, labels, kindLabel }),
          [{ name: t("itops.export.excelFilter"), extensions: ["xls"] }],
          "application/vnd.ms-excel",
        );
        if (path) {
          showStatusBarNotice(t("itops.export.complete", { name: path }), { tone: "success" });
        }
        return;
      }

      const doc = rack
        ? rackPdfDocument({
            site,
            rack,
            roomName: rack.serverRoom,
            unassignedLabel: unassigned,
            labels,
            kindLabel,
          })
        : serverRoom
          ? serverRoomPdfDocument({
              site,
              roomName: serverRoom.key,
              racks: serverRoom.racks,
              unassignedLabel: unassigned,
              labels,
              kindLabel,
            })
          : sitePdfDocument({ site, racks, unassignedLabel: unassigned, labels, kindLabel });
      name = doc.title;
      const path = await saveExportBytes(
        pdfFilename(name),
        createItOpsPdfBytes(doc),
        [{ name: t("itops.export.pdfFilter"), extensions: ["pdf"] }],
        "application/pdf",
      );
      if (path) {
        showStatusBarNotice(t("itops.export.complete", { name: path }), { tone: "success" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  function saveSitePlacements(next: FreePlacementMap) {
    setSitePlacements(next);
    saveFreePlacement(sitePlacementScope, next);
  }

  function saveIsoPlacements(next: FreePlacementMap) {
    setIsoEdits(next);
    if (isoPlacementScope) saveFreePlacement(isoPlacementScope, next);
    scheduleDurableSave("grid", next);
  }

  // A non-overview Site View segment replaces the topology surface, so the
  // topology-only toolbar actions (edit / export / auto-organize) hide with it.
  const siteSegmentActive = !serverRoom && !rack && siteView !== "overview";
  const segmentAddLabel =
    siteView === "hosts"
      ? t("itops.hosts.importAction")
      : siteView === "batchRuns"
        ? t("itops.actions.newBatchRun")
        : t("itops.actions.newAutomation");

  return (
    <div className="ft-drill">
      <ItOpsBackground background={viewBackground} className="ft-drill-bg">
        <div className="it-drill-toolbar">
          <div className="it-drill-spacer" />
          {!serverRoom && !rack ? (
            <div
              className="rm-segmented"
              role="group"
              aria-label={t("itops.sites.viewLabel")}
            >
              <button
                type="button"
                data-active={siteView === "overview"}
                onClick={() => setSiteView("overview")}
              >
                <ItIcon name="room" size={13} />
                {t("itops.sites.viewOverview")}
              </button>
              <button
                type="button"
                data-active={siteView === "hosts"}
                onClick={() => setSiteView("hosts")}
              >
                <ItIcon name="server" size={13} />
                {t("itops.tabs.hosts")}
              </button>
              <button
                type="button"
                data-active={siteView === "batchRuns"}
                onClick={() => setSiteView("batchRuns")}
              >
                <ItIcon name="run" size={13} />
                {t("itops.tabs.runs")}
              </button>
              <button
                type="button"
                data-active={siteView === "automations"}
                onClick={() => setSiteView("automations")}
              >
                <ItIcon name="auto" size={13} />
                {t("itops.tabs.autos")}
              </button>
            </div>
          ) : null}
          {serverRoom && !rack ? (
            <div
              className="rm-segmented"
              role="group"
              aria-label={t("itops.floorPlan.viewLabel")}
            >
              <button
                type="button"
                data-active={roomView === "elevation"}
                onClick={() => setRoomView("elevation")}
              >
                <ItIcon name="rows" size={13} />
                {t("itops.floorPlan.viewElevation")}
              </button>
              <button
                type="button"
                data-active={roomView === "floor"}
                onClick={() => setRoomView("floor")}
              >
                <ItIcon name="grid" size={13} />
                {t("itops.floorPlan.viewFloor")}
              </button>
              <button
                type="button"
                data-active={roomView === "iso"}
                onClick={() => setRoomView("iso")}
              >
                <ItIcon name="cube" size={13} />
                {t("itops.floorPlan.view25d")}
              </button>
            </div>
          ) : null}
          <div className="it-drill-actions" aria-label={t("itops.actions.viewActions")}>
            {!rack && !serverRoom && !siteSegmentActive && topology.length > 0 ? (
              <button
                type="button"
                className="it-drill-action"
                title={t("itops.sites.autoOrganize")}
                aria-label={t("itops.sites.autoOrganize")}
                onClick={autoOrganizeSiteRooms}
              >
                <ItIcon name="grid" size={15} />
              </button>
            ) : null}
            {!siteSegmentActive ? (
              <button
                type="button"
                className={`it-drill-action${editMode ? " active" : ""}`}
                title={editMode ? t("itops.actions.editDone") : t("itops.actions.edit")}
                aria-label={editMode ? t("itops.actions.editDone") : t("itops.actions.edit")}
                aria-pressed={editMode}
                onClick={() => setEditMode((value) => !value)}
              >
                <ItIcon name={editMode ? "check" : "edit"} size={15} />
              </button>
            ) : null}
            {siteSegmentActive ? (
              <button
                type="button"
                className="it-drill-action"
                title={segmentAddLabel}
                aria-label={segmentAddLabel}
                onClick={handleSegmentAdd}
              >
                <ItIcon name="plus" size={15} />
              </button>
            ) : null}
            {!siteSegmentActive ? (
              <div className="it-drill-export">
                <button
                  type="button"
                  className="it-drill-action"
                  title={t("itops.actions.export")}
                  aria-label={t("itops.actions.export")}
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  onClick={() => setExportMenuOpen((open) => !open)}
                >
                  <ItIcon name="share" size={15} />
                </button>
                {exportMenuOpen ? (
                  <>
                    <div className="it-drill-menu-backdrop" onClick={() => setExportMenuOpen(false)} />
                    <div className="it-drill-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => void handleExport("pdf")}>
                        <ItIcon name="book" size={14} />
                        {t("itops.export.pdf")}
                      </button>
                      {rack ? (
                        <button type="button" role="menuitem" onClick={() => void handleExport("excel")}>
                          <ItIcon name="table" size={14} />
                          {t("itops.export.excel")}
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {siteSegmentActive && siteView === "hosts" ? (
          <HostsPanel siteId={site.id} />
        ) : siteSegmentActive && siteView === "batchRuns" ? (
          <BatchRunsTab siteId={site.id} onNewBatchRun={() => requestNewBatchRun(site.id)} />
        ) : siteSegmentActive && siteView === "automations" ? (
          <AutomationsTab siteId={site.id} siteHosts={members.map((member) => member.host)} />
        ) : !topologyLoaded ? null : rack ? (
          <div className="it-rack-layout">
            <RackStage
              rack={rack}
              hosts={siteHosts}
              hostFor={hostForItem}
              isGhost={isGhostItem}
              editMode={editMode}
              onOpenItem={onOpenItem}
              onEditItem={(item) => onEditItem(rack, item)}
              onBindItem={onBindItem}
              onMoveItem={editMode ? onMoveItem : undefined}
              onDeleteItem={editMode ? (item) => onDeleteItem(rack, item) : undefined}
              placeSpec={editMode ? placeDevice : null}
              onPlaceAt={(startU) => {
                if (!placeDevice) return;
                onPlaceDevice(rack, placeDevice, startU);
                setPlaceDevice(null);
              }}
              onCancelPlacement={() => setPlaceDevice(null)}
            />
            {editMode ? (
              <RackObjectPicker
                rack={rack}
                armedKind={placeDevice?.kind ?? null}
                onPickDevice={(kind) => {
                  // Clicking the armed card again disarms; any card re-opens
                  // the configure dialog and re-arms with the new draft.
                  if (placeDevice?.kind === kind) {
                    setPlaceDevice(null);
                    return;
                  }
                  onConfigureDevice(rack, kind, setPlaceDevice);
                }}
              />
            ) : null}
          </div>
        ) : serverRoom ? (
          serverRoom.racks.length === 0 ? (
            <div className="it-topology-empty">
              <button type="button" className="it-btn primary" onClick={() => onAddRack(serverRoom.key)}>
                <span className="it-btn-ic">
                  <ItIcon name="plus" size={15} />
                </span>
                {t("itops.racks.addRack")}
              </button>
            </div>
          ) : roomView === "iso" || roomView === "floor" ? (
            <div className="rm-spatial">
              {roomView === "iso" ? (
                <ServerRoomIsoView
                  racks={serverRoom.racks}
                  editMode={editMode}
                  floorColor={sanitizeIsoFloor(serverRoom.room?.floorColor)}
                  tool={roomTool}
                  placeRackId={placeRackId}
                  onRackPlaced={() => setPlaceRackId(null)}
                  placement={isoPlacements}
                  onPlacementChange={saveIsoPlacements}
                  facing={roomFacing}
                  onFacingChange={editMode ? saveRoomFacingState : undefined}
                  objects={roomObjects}
                  onObjectsChange={editMode ? saveRoomObjectsState : undefined}
                  onDeleteRack={editMode ? onDeleteRack : undefined}
                  onSelectRack={(rackId) => setDrill({ serverRoom: serverRoom.key, rackId })}
                  onAddRack={editMode ? () => onAddRack(serverRoom.key) : undefined}
                  onObjectBlocked={notifyObjectBlocked}
                  onOpenBackground={() => setBackgroundOpen(true)}
                  onCancelPlacement={() => {
                    setRoomTool(null);
                    setPlaceRackId(null);
                  }}
                />
              ) : (
                <ServerRoomFloorPlan
                  racks={serverRoom.racks}
                  editMode={editMode}
                  tool={roomTool}
                  placeRackId={placeRackId}
                  onRackPlaced={() => setPlaceRackId(null)}
                  placement={isoPlacements}
                  onPlacementChange={saveIsoPlacements}
                  facing={roomFacing}
                  onFacingChange={editMode ? saveRoomFacingState : undefined}
                  objects={roomObjects}
                  onObjectsChange={editMode ? saveRoomObjectsState : undefined}
                  onDeleteRack={editMode ? onDeleteRack : undefined}
                  onSelectRack={(rackId) => setDrill({ serverRoom: serverRoom.key, rackId })}
                  onObjectBlocked={notifyObjectBlocked}
                  onCancelPlacement={() => {
                    setRoomTool(null);
                    setPlaceRackId(null);
                  }}
                />
              )}
              {editMode ? (
                <RoomObjectPicker
                  tool={roomTool}
                  onToolChange={(tool) => {
                    setPlaceRackId(null);
                    setRoomTool(tool);
                  }}
                  rackArmed={placeRackId != null}
                  onPickRack={() => {
                    setRoomTool(null);
                    if (placeRackId != null) {
                      setPlaceRackId(null);
                      return;
                    }
                    onAddRackForPlacement(serverRoom.key, (saved) => setPlaceRackId(saved.id));
                  }}
                />
              ) : null}
            </div>
          ) : (
            groupRacksByGroup(serverRoom.racks).map((g) => (
              <div className="rk-group" key={g.key}>
                {groupRacksByGroup(serverRoom.racks).length > 1 || g.key ? (
                  <div className="rk-group-h">{g.key || ungrouped}</div>
                ) : null}
                <div className="rk-row">{g.racks.map((r) => elevation(r))}</div>
              </div>
            ))
          )
        ) : topology.length === 0 && !editMode ? (
          <div className="it-topology-empty">
            <button type="button" className="it-btn primary" onClick={onAddServerRoom}>
              <span className="it-btn-ic">
                <ItIcon name="plus" size={15} />
              </span>
              {t("itops.racks.addServerRoom")}
            </button>
          </div>
        ) : (
          <div className="it-site-layout">
            <SiteRoomCards
              rooms={topology}
              roomIcons={roomIcons}
              unassigned={unassigned}
              editMode={editMode}
              placement={sitePlacements}
              onPlacementChange={saveSitePlacements}
              onDeleteRoom={onDeleteServerRoom}
              onSelectRoom={(room) => setDrill({ serverRoom: room.key, rackId: null })}
              onOpenBackground={() => setBackgroundOpen(true)}
            />
            {editMode ? <SiteObjectPicker onPickServerRoom={onAddServerRoom} /> : null}
          </div>
        )}
      </ItOpsBackground>
      {backgroundOpen && ((serverRoom && roomView === "iso") || (!serverRoom && !rack)) ? (
        <SharedBackgroundPopover
          className="itops-bg-popover"
          background={viewBackground ?? null}
          titleKey="itops.racks.changeBackground"
          defaultHintKey="itops.racks.backgroundDefaultHint"
          onBackgroundChange={saveDrillViewBackground}
          onLoadBackgroundImage={(file) => {
            void loadBackgroundImage(file);
          }}
          onClose={() => setBackgroundOpen(false)}
        />
      ) : null}
    </div>
  );
}

// Fold the racks' durable placement columns into a FreePlacementMap.
function durablePlacement(racks: Rack[] | undefined, kind: RackPlacementKind): FreePlacementMap {
  const map: FreePlacementMap = {};
  for (const rack of racks ?? []) {
    const x = kind === "floor" ? rack.floorX : rack.gridX;
    const y = kind === "floor" ? rack.floorY : rack.gridY;
    if (x != null && y != null) {
      map[rack.id] = { x, y };
    }
  }
  return map;
}

function defaultFreePlacement(index: number, width: number, height: number) {
  const cols = 3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 14 + col * (width + 14), y: 14 + row * (height + 14) };
}

function freeSurfaceHeight(count: number, width: number, height: number) {
  if (count <= 0) return height + 28;
  return defaultFreePlacement(count - 1, width, height).y + height + 16;
}

function sameRoomObjects(a: RoomObject[], b: RoomObject[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((object, index) => {
    const other = b[index];
    return (
      object.id === other.id &&
      object.kind === other.kind &&
      object.x === other.x &&
      object.y === other.y &&
      object.z === other.z &&
      object.rot === other.rot &&
      object.corner === other.corner
    );
  });
}

function useFreeDrag(
  placement: FreePlacementMap,
  onPlacementChange: (next: FreePlacementMap) => void,
) {
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  function startDrag(
    event: ReactPointerEvent<HTMLElement>,
    id: string,
    fallback: { x: number; y: number },
  ) {
    const target = event.target as HTMLElement;
    if (target.closest(".it-free-delete")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = placement[id] ?? fallback;
    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      drag.moved = true;
    }
    const x = Math.max(4, Math.round(drag.originX + dx));
    const y = Math.max(4, Math.round(drag.originY + dy));
    onPlacementChange({ ...placement, [drag.id]: { x, y } });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  return { startDrag, moveDrag, endDrag };
}

function SiteObjectPicker({ onPickServerRoom }: { onPickServerRoom: () => void }) {
  const { t } = useTranslation();
  const label = t("itops.racks.serverRoomLabel");

  return (
    <div className="rm-picker" role="group" aria-label={t("itops.floorPlan.pickerTitle")}>
      <div className="rm-picker-h">{t("itops.floorPlan.pickerTitle")}</div>
      <div className="rm-picker-grid">
        <button
          type="button"
          className="rm-picker-card"
          title={label}
          onClick={onPickServerRoom}
        >
          <span className="rm-picker-thumb">
            <ItIcon name="room" size={30} sw={1.3} />
          </span>
          <span className="rm-picker-name">{label}</span>
        </button>
      </div>
    </div>
  );
}

function firstAvailableRackUnit(rack: Rack): number | null {
  for (let unit = 1; unit <= rack.heightU; unit += 1) {
    const occupied = rack.items.some(
      (item) => unit >= item.startU && unit < item.startU + item.heightU,
    );
    if (!occupied) return unit;
  }
  return null;
}

function RackObjectPicker({
  rack,
  armedKind,
  onPickDevice,
}: {
  rack: Rack;
  /** The configured draft's kind while a placement click is armed. */
  armedKind: RackItemKind | null;
  onPickDevice: (kind: RackItemKind) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const startU = firstAvailableRackUnit(rack);
  const kinds = RACK_ITEM_KINDS.filter(
    (kind) => !q || t(`itops.racks.kind.${kind}`).toLowerCase().includes(q),
  );

  return (
    <div
      className="rm-picker rm-picker-devices"
      role="group"
      aria-label={t("itops.floorPlan.pickerTitle")}
    >
      <div className="rm-picker-h">{t("itops.floorPlan.pickerTitle")}</div>
      <div className="rm-picker-search">
        <ItIcon name="search" size={13} />
        <input
          type="text"
          value={query}
          placeholder={t("itops.floorPlan.pickerSearchPlaceholder")}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {query ? (
          <button type="button" className="rm-picker-search-x" onClick={() => setQuery("")}>
            <ItIcon name="xmark" size={12} />
          </button>
        ) : null}
      </div>
      <div className="rm-picker-grid">
        {kinds.map((kind) => {
          const label = t(`itops.racks.kind.${kind}`);
          return (
            <button
              key={kind}
              type="button"
              className="rm-picker-card"
              title={label}
              data-active={armedKind === kind || undefined}
              disabled={startU == null}
              onClick={() => startU != null && onPickDevice(kind)}
            >
              <span className="rm-picker-thumb device">
                <RackDevice
                  kind={kind}
                  label={label}
                  status="online"
                  heightU={1}
                  shell="black"
                  seed={`picker-${kind}`}
                />
              </span>
              <span className="rm-picker-name">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Site View is a free-form Server Room placement surface in both modes. Edit
// mode reveals the dot grid and adds drag/delete controls; right-clicking empty
// surface offers the Site background change.
function SiteRoomCards({
  rooms,
  roomIcons,
  unassigned,
  editMode,
  placement,
  onPlacementChange,
  onDeleteRoom,
  onSelectRoom,
  onOpenBackground,
}: {
  rooms: ReturnType<typeof groupRackTopology>;
  roomIcons?: Record<string, ItOpsCustomIcon>;
  unassigned: string;
  editMode: boolean;
  placement: FreePlacementMap;
  onPlacementChange: (next: FreePlacementMap) => void;
  onDeleteRoom: (serverRoom: string, racks: Rack[]) => void;
  onSelectRoom: (room: ReturnType<typeof groupRackTopology>[number]) => void;
  onOpenBackground?: () => void;
}) {
  const { t } = useTranslation();
  const drag = useFreeDrag(placement, onPlacementChange);

  async function handleSurfaceContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    if (!onOpenBackground) return;
    const target = event.target as HTMLElement;
    if (target.closest(".it-free-card")) return;
    event.preventDefault();
    await showNativeContextMenu(
      [
        {
          kind: "item",
          label: t("itops.racks.changeBackground"),
          action: onOpenBackground,
        },
      ],
      { x: event.clientX, y: event.clientY },
    );
  }

  return (
    <div
      className={`it-free-surface site${editMode ? " editing" : ""}`}
      style={{ minHeight: freeSurfaceHeight(rooms.length, FREE_CARD_WIDTH, FREE_CARD_HEIGHT) }}
      onContextMenu={onOpenBackground ? handleSurfaceContextMenu : undefined}
    >
      {rooms.map((room, index) => {
        const id = topologyGroupKey(room.key);
        const fallback = defaultFreePlacement(index, FREE_CARD_WIDTH, FREE_CARD_HEIGHT);
        const point = placement[id] ?? fallback;
        return (
          <div
            key={id}
            className={`it-free-card${editMode ? " editing" : ""}`}
            style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
            onPointerDown={editMode ? (event) => drag.startDrag(event, id, fallback) : undefined}
            onPointerMove={editMode ? drag.moveDrag : undefined}
            onPointerUp={editMode ? drag.endDrag : undefined}
            onPointerCancel={editMode ? drag.endDrag : undefined}
          >
            <DrillCard
              icon="room"
              customIcon={roomIcons?.[room.key]}
              title={room.key || unassigned}
              meta={t("itops.racks.rackCount", { count: room.racks.length })}
              onClick={() => onSelectRoom(room)}
            />
            {editMode ? (
              <button
                type="button"
                className="it-free-delete"
                title={t("itops.racks.deleteServerRoomTitle")}
                aria-label={t("itops.racks.deleteServerRoomTitle")}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteRoom(room.key, room.racks);
                }}
              >
                <ItIcon name="xmark" size={11} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DrillCard({
  icon,
  customIcon,
  title,
  meta,
  onClick,
}: {
  icon: ItIconName;
  customIcon?: ItOpsCustomIcon;
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ft-card" onClick={onClick}>
      <span className="ft-card-ic">
        <ItOpsIcon icon={icon} customIcon={customIcon} size={20} />
      </span>
      <span className="ft-card-txt">
        <span className="ft-card-title">{title}</span>
        <span className="ft-card-meta">{meta}</span>
      </span>
      <ItIcon name="chevR" size={14} />
    </button>
  );
}
