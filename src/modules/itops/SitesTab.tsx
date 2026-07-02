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
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { ConfirmSheet } from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { Site, Rack, RackItem, ResolvedHost, ServerRoom } from "../../types";
import { ConnectionIcon } from "../workspace/connections/ConnectionIcon";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { SiteDialog } from "./SiteDialog";
import { RackElevation } from "./RackElevation";
import { RackDialog } from "./RackDialog";
import { ServerRoomDialog } from "./ServerRoomDialog";
import { RackItemDialog } from "./RackItemDialog";
import { RackItemBindingsDialog } from "./RackItemBindingsDialog";
import { useItOpsStore } from "./state";
import {
  EMPTY_DRILL,
  groupRackTopology,
  groupRacksByGroup,
  nodeId,
  topologyGroupKey,
  type DrillPath,
} from "./rackTopology";
import { ItOpsBackground } from "./ItOpsBackground";
import { RackStage } from "./RackStage";
import { ServerRoomFloorPlan } from "./ServerRoomFloorPlan";
import { ServerRoomIsoView } from "./ServerRoomIsoView";
import { selectRandomRackCallouts } from "./rackInventory";
import type { DashboardBackground } from "../dashboard/types";
import {
  SITE_TREE_COLLAPSED_WIDTH,
  SITE_TREE_MAX_WIDTH,
  SITE_TREE_MIN_WIDTH,
  loadCollapsedNodeIds,
  loadFreePlacement,
  loadRoomFloorMetric,
  loadRoomViewMode,
  loadSiteTreeWidth,
  saveFreePlacement,
  saveCollapsedNodeIds,
  saveRoomFloorMetric,
  saveRoomViewMode,
  saveSiteTreeWidth,
  type FreePlacementMap,
  type RoomFloorMetric,
  type RoomViewMode,
} from "./siteTreeState";
import {
  createItOpsPdfBytes,
  excelFilename,
  pdfFilename,
  rackExcelBytes,
  rackPdfDocument,
  roomIsoLayoutScope,
  roomLayoutScope,
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
}: {
  renderSidebarHeader?: (props: { collapsed: boolean }) => ReactNode;
  treeCollapsed: boolean;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const openConnection = useWorkspaceStore((state) => state.openConnection);
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
  } | null>(null);
  const [serverRoomDialogOpen, setServerRoomDialogOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [itemDialog, setItemDialog] = useState<{
    rack: Rack;
    item: RackItem | null;
    startU?: number;
  } | null>(null);
  const [bindingsDialog, setBindingsDialog] = useState<RackItem | null>(null);
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);
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

  // Load racks for every expanded Site node so the tree can show its topology.
  useEffect(() => {
    for (const site of sites) {
      if (isExpanded(nodeId.site(site.id))) {
        if (!racksBySite[site.id]) void loadRacks(site.id);
        if (!serverRoomsBySite[site.id]) void loadServerRooms(site.id);
      }
    }
  }, [sites, racksBySite, serverRoomsBySite, isExpanded, loadRacks, loadServerRooms]);

  const racks = useMemo(
    () => (activeGroup ? (racksBySite[activeGroup.id] ?? []) : []),
    [activeGroup, racksBySite],
  );
  const serverRooms = activeGroup ? (serverRoomsBySite[activeGroup.id] ?? []) : [];
  const topology = useMemo(() => groupRackTopology(racks, serverRooms), [racks, serverRooms]);
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

  async function openRackItem(item: RackItem) {
    if (!item.connectionId) return;
    try {
      const connection = await invokeCommand("itops_get_connection", { id: item.connectionId });
      openConnection(connection);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
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

  return (
    <div className={`hg ft${treeCollapsed ? " ft-collapsed" : ""}`}>
      {/* ── Tree navigator ── */}
      <div
        ref={treeRef}
        className="ft-tree"
        data-tutorial-id="itops.sitesTree"
        style={{ width: effectiveTreeWidth, flex: `0 0 ${effectiveTreeWidth}px` }}
      >
        {renderSidebarHeader?.({ collapsed: treeCollapsed })}
        {!treeCollapsed ? (
          <>
            <div className="ft-head">
              <span className="ft-head-title">{t("itops.sites.heading")}</span>
              <div className="ft-add-wrap">
                <button
                  type="button"
                  className="it-icon-btn sm"
                  title={t("itops.racks.addNode")}
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
                          setServerRoomDialogOpen(true);
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
                      hasChildren={siteRacks.length > 0}
                      open={open}
                      selected={selectedId === fId && drill.serverRoom == null}
                      onToggle={() => toggleNode(fId)}
                      onSelect={() => {
                        setActiveId(site.id);
                        setDrill(EMPTY_DRILL);
                      }}
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
            racks={racks}
            site={activeGroup}
            drill={drill}
            setDrill={setDrill}
            viewBackground={viewBackground}
            roomIcons={activeGroup.roomIcons}
            hostForItem={hostForItem}
            isGhostItem={isGhostItem}
            onSlotClick={(rack, startU) => setItemDialog({ rack, item: null, startU })}
            onOpenItem={(item) => void openRackItem(item)}
            onEditItem={(rack, item) => setItemDialog({ rack, item })}
            onBindItem={setBindingsDialog}
            onMoveItem={(itemId, targetRackId, startU) => void moveItem(itemId, targetRackId, startU)}
            onAddServerRoom={() => setServerRoomDialogOpen(true)}
            onAddRack={(serverRoom) => {
              setRackDialog({
                siteId: activeGroup.id,
                rack: null,
                defaultServerRoom: serverRoom,
              });
            }}
            onAddRackItem={(rack, startU) => setItemDialog({ rack, item: null, startU })}
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
            setActiveId(saved.siteId);
            setDrill({ serverRoom: saved.serverRoom, rackId: saved.id });
          }}
        />
      ) : null}
      {serverRoomDialogOpen ? (
        <ServerRoomDialog
          sites={sites}
          defaultSiteId={selectedSiteIdForDialog}
          onClose={() => setServerRoomDialogOpen(false)}
          onCreated={(saved) => {
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
          defaultStartU={itemDialog.startU}
          members={members}
          onClose={() => setItemDialog(null)}
        />
      ) : null}
      {bindingsDialog && activeGroup ? (
        <RackItemBindingsDialog siteId={activeGroup.id} item={bindingsDialog} onClose={() => setBindingsDialog(null)} />
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
}) {
  return (
    <div
      className={`ft-row${selected ? " sel" : ""}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={onSelect}
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
  racks,
  site,
  drill,
  setDrill,
  viewBackground,
  roomIcons,
  hostForItem,
  isGhostItem,
  onSlotClick,
  onOpenItem,
  onEditItem,
  onBindItem,
  onMoveItem,
  onAddServerRoom,
  onAddRack,
  onAddRackItem,
  onDeleteServerRoom,
  onDeleteRack,
  onDeleteItem,
}: {
  topology: ReturnType<typeof groupRackTopology>;
  racks: Rack[];
  site: Site;
  drill: DrillPath;
  setDrill: (next: DrillPath) => void;
  viewBackground: DashboardBackground | null | undefined;
  roomIcons?: Record<string, ItOpsCustomIcon>;
  hostForItem: (item: RackItem) => string | null;
  isGhostItem: (item: RackItem) => boolean;
  onSlotClick: (rack: Rack, startU: number) => void;
  onOpenItem: (item: RackItem) => void;
  onEditItem: (rack: Rack, item: RackItem) => void;
  onBindItem: (item: RackItem) => void;
  onMoveItem: (itemId: string, targetRackId: string, startU: number) => void;
  onAddServerRoom: () => void;
  onAddRack: (serverRoom: string) => void;
  onAddRackItem: (rack: Rack, startU?: number) => void;
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

  // Server Room View layout: rack elevations (default) or the top-down floor
  // plan, plus which dimension colours the floor-plan tiles. Both persist.
  const [roomView, setRoomView] = useState<RoomViewMode>(loadRoomViewMode);
  const [floorMetric, setFloorMetric] = useState<RoomFloorMetric>(loadRoomFloorMetric);
  useEffect(() => saveRoomViewMode(roomView), [roomView]);
  useEffect(() => saveRoomFloorMetric(floorMetric), [floorMetric]);

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
  }, [viewKey]);

  const sitePlacementScope = siteLayoutScope(site.id);
  const [sitePlacements, setSitePlacements] = useState<FreePlacementMap>(() =>
    loadFreePlacement(sitePlacementScope),
  );
  useEffect(() => {
    setSitePlacements(loadFreePlacement(sitePlacementScope));
  }, [sitePlacementScope]);

  const roomPlacementScope = serverRoom ? roomLayoutScope(site.id, serverRoom.key) : "";
  const [roomPlacements, setRoomPlacements] = useState<FreePlacementMap>(() =>
    roomPlacementScope ? loadFreePlacement(roomPlacementScope) : {},
  );
  useEffect(() => {
    setRoomPlacements(roomPlacementScope ? loadFreePlacement(roomPlacementScope) : {});
  }, [roomPlacementScope]);

  // 2.5D iso view placement (grid cells, not pixels) — its own scope.
  const isoPlacementScope = serverRoom ? roomIsoLayoutScope(site.id, serverRoom.key) : "";
  const [isoPlacements, setIsoPlacements] = useState<FreePlacementMap>(() =>
    isoPlacementScope ? loadFreePlacement(isoPlacementScope) : {},
  );
  useEffect(() => {
    setIsoPlacements(isoPlacementScope ? loadFreePlacement(isoPlacementScope) : {});
  }, [isoPlacementScope]);

  const roomCallouts = serverRoom
    ? selectRandomRackCallouts(
        serverRoom.racks.flatMap((entry) => entry.items),
        serverRoom.key,
        3,
      )
    : [];

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

  function firstAvailableStartU(targetRack: Rack) {
    const occupied = new Set<number>();
    for (const item of targetRack.items) {
      for (let u = item.startU; u < item.startU + item.heightU; u += 1) {
        occupied.add(u);
      }
    }
    for (let u = 1; u <= targetRack.heightU; u += 1) {
      if (!occupied.has(u)) return u;
    }
    return 1;
  }

  function handleAdd() {
    if (rack) {
      onAddRackItem(rack, firstAvailableStartU(rack));
      return;
    }
    if (serverRoom) {
      onAddRack(serverRoom.key);
      return;
    }
    onAddServerRoom();
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

  function saveRoomPlacements(next: FreePlacementMap) {
    setRoomPlacements(next);
    if (roomPlacementScope) saveFreePlacement(roomPlacementScope, next);
  }

  function saveIsoPlacements(next: FreePlacementMap) {
    setIsoPlacements(next);
    if (isoPlacementScope) saveFreePlacement(isoPlacementScope, next);
  }

  return (
    <div className="ft-drill">
      <ItOpsBackground background={viewBackground} className="ft-drill-bg">
        <div className="it-drill-toolbar">
          <div className="it-drill-spacer" />
          <div className="it-drill-actions" aria-label={t("itops.actions.viewActions")}>
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
            <button
              type="button"
              className="it-drill-action"
              title={
                rack
                  ? t("itops.racks.addItemTitle")
                  : serverRoom
                    ? t("itops.racks.addRack")
                    : t("itops.racks.addServerRoom")
              }
              aria-label={
                rack
                  ? t("itops.racks.addItemTitle")
                  : serverRoom
                    ? t("itops.racks.addRack")
                    : t("itops.racks.addServerRoom")
              }
              onClick={handleAdd}
            >
              <ItIcon name="plus" size={15} />
            </button>
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
                <ItIcon name="download" size={15} />
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
          </div>
        </div>
        {racks.length === 0 ? (
          <div className="card">
            <div className="hg-dlg-empty">{t("itops.racks.empty")}</div>
          </div>
        ) : rack ? (
          <RackStage
            rack={rack}
            hostFor={hostForItem}
            isGhost={isGhostItem}
            editMode={editMode}
            onSlotClick={editMode ? (startU) => onSlotClick(rack, startU) : undefined}
            onOpenItem={onOpenItem}
            onEditItem={(item) => onEditItem(rack, item)}
            onBindItem={onBindItem}
            onMoveItem={editMode ? onMoveItem : undefined}
            onDeleteItem={editMode ? (item) => onDeleteItem(rack, item) : undefined}
          />
        ) : serverRoom ? (
          <>
            <div className="rm-toolbar">
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
                  {t("itops.floorPlan.viewElevation")}
                </button>
                <button
                  type="button"
                  data-active={roomView === "floor"}
                  onClick={() => setRoomView("floor")}
                >
                  {t("itops.floorPlan.viewFloor")}
                </button>
                <button
                  type="button"
                  data-active={roomView === "iso"}
                  onClick={() => setRoomView("iso")}
                >
                  {t("itops.floorPlan.view25d")}
                </button>
              </div>
              {roomView !== "elevation" ? (
                <div
                  className="rm-segmented"
                  role="group"
                  aria-label={t("itops.floorPlan.metricLabel")}
                >
                  <button
                    type="button"
                    data-active={floorMetric === "health"}
                    onClick={() => setFloorMetric("health")}
                  >
                    {t("itops.floorPlan.metricHealth")}
                  </button>
                  <button
                    type="button"
                    data-active={floorMetric === "utilization"}
                    onClick={() => setFloorMetric("utilization")}
                  >
                    {t("itops.floorPlan.metricUtilization")}
                  </button>
                </div>
              ) : null}
            </div>
            {roomCallouts.length > 0 ? (
              <div className="rack-random-callouts room">
                {roomCallouts.map((callout) => {
                  const owner = serverRoom.racks.find((entry) =>
                    entry.items.some((item) => item.id === callout.itemId),
                  );
                  const item = owner?.items.find((entry) => entry.id === callout.itemId);
                  return (
                    <button
                      key={callout.itemId}
                      type="button"
                      onClick={() => owner && item && onEditItem(owner, item)}
                    >
                      <span>{callout.label}</span>
                      {callout.text ? <small>{callout.text}</small> : null}
                      {callout.connectionIds.length > 0 ? (
                        <small>{t("itops.racks.boundConnectionCount", { count: callout.connectionIds.length })}</small>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {roomView === "iso" ? (
              <ServerRoomIsoView
                racks={serverRoom.racks}
                metric={floorMetric}
                editMode={editMode}
                placement={isoPlacements}
                onPlacementChange={saveIsoPlacements}
                onDeleteRack={editMode ? onDeleteRack : undefined}
                onSelectRack={(rackId) => setDrill({ serverRoom: serverRoom.key, rackId })}
                onAddRack={editMode ? () => onAddRack(serverRoom.key) : undefined}
              />
            ) : roomView === "floor" ? (
              <ServerRoomFloorPlan
                racks={serverRoom.racks}
                metric={floorMetric}
                editMode={editMode}
                placement={roomPlacements}
                onPlacementChange={saveRoomPlacements}
                onDeleteRack={editMode ? onDeleteRack : undefined}
                onSelectRack={(rackId) => setDrill({ serverRoom: serverRoom.key, rackId })}
              />
            ) : (
              groupRacksByGroup(serverRoom.racks).map((g) => (
                <div className="rk-group" key={g.key}>
                  {groupRacksByGroup(serverRoom.racks).length > 1 || g.key ? (
                    <div className="rk-group-h">{g.key || ungrouped}</div>
                  ) : null}
                  <div className="rk-row">{g.racks.map((r) => elevation(r))}</div>
                </div>
              ))
            )}
          </>
        ) : (
          <SiteRoomCards
            rooms={topology}
            roomIcons={roomIcons}
            unassigned={unassigned}
            editMode={editMode}
            placement={sitePlacements}
            onPlacementChange={saveSitePlacements}
            onDeleteRoom={onDeleteServerRoom}
            onSelectRoom={(room) => setDrill({ serverRoom: room.key, rackId: null })}
          />
        )}
      </ItOpsBackground>
    </div>
  );
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

function SiteRoomCards({
  rooms,
  roomIcons,
  unassigned,
  editMode,
  placement,
  onPlacementChange,
  onDeleteRoom,
  onSelectRoom,
}: {
  rooms: ReturnType<typeof groupRackTopology>;
  roomIcons?: Record<string, ItOpsCustomIcon>;
  unassigned: string;
  editMode: boolean;
  placement: FreePlacementMap;
  onPlacementChange: (next: FreePlacementMap) => void;
  onDeleteRoom: (serverRoom: string, racks: Rack[]) => void;
  onSelectRoom: (room: ReturnType<typeof groupRackTopology>[number]) => void;
}) {
  const { t } = useTranslation();
  const drag = useFreeDrag(placement, onPlacementChange);

  if (!editMode) {
    return (
      <div className="ft-cards">
        {rooms.map((room) => (
          <DrillCard
            key={room.key}
            icon="room"
            customIcon={roomIcons?.[room.key]}
            title={room.key || unassigned}
            meta={t("itops.racks.rackCount", { count: room.racks.length })}
            onClick={() => onSelectRoom(room)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="it-free-surface site"
      style={{ minHeight: freeSurfaceHeight(rooms.length, FREE_CARD_WIDTH, FREE_CARD_HEIGHT) }}
    >
      {rooms.map((room, index) => {
        const id = topologyGroupKey(room.key);
        const fallback = defaultFreePlacement(index, FREE_CARD_WIDTH, FREE_CARD_HEIGHT);
        const point = placement[id] ?? fallback;
        return (
          <div
            key={id}
            className="it-free-card"
            style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
            onPointerDown={(event) => drag.startDrag(event, id, fallback)}
            onPointerMove={drag.moveDrag}
            onPointerUp={drag.endDrag}
            onPointerCancel={drag.endDrag}
          >
            <DrillCard
              icon="room"
              customIcon={roomIcons?.[room.key]}
              title={room.key || unassigned}
              meta={t("itops.racks.rackCount", { count: room.racks.length })}
              onClick={() => onSelectRoom(room)}
            />
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
