// Fleets tab — durable fleet target groups (docs/ITOPS.md Phase 1). The left
// panel is a Connection-tree-style navigator over the rack topology
// (Fleet → Server Room → Rack); the right panel drills down that hierarchy,
// ending at a single animated rack elevation. Member lists come from the
// run-time resolver (itops_resolve_fleet) so dynamic-filter groups show the
// Connections they currently match.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { Fleet, Rack, RackItem, ResolvedHost } from "../../types";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { FleetDialog } from "./FleetDialog";
import { RackElevation } from "./RackElevation";
import { RackDialog } from "./RackDialog";
import { ServerRoomDialog } from "./ServerRoomDialog";
import { RackItemDialog } from "./RackItemDialog";
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
import type { DashboardBackground } from "../dashboard/types";
import {
  FLEET_TREE_COLLAPSED_WIDTH,
  FLEET_TREE_MAX_WIDTH,
  FLEET_TREE_MIN_WIDTH,
  loadCollapsedNodeIds,
  loadFleetTreeWidth,
  saveCollapsedNodeIds,
  saveFleetTreeWidth,
} from "./fleetTreeState";

const TILE_COLORS = [
  IT_ACCENTS.green,
  IT_ACCENTS.indigo,
  IT_ACCENTS.blue,
  IT_ACCENTS.teal,
  IT_ACCENTS.orange,
  IT_ACCENTS.purple,
];

// A stable per-group tile colour (Fleets don't store one); hashing the id
// keeps a group's colour steady across reloads without a durable field.
function groupColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return TILE_COLORS[hash % TILE_COLORS.length];
}

function groupIcon(group: Fleet): ItIconName {
  return group.filter ? "filter" : "group";
}

export function FleetsTab({
  renderSidebarHeader,
  treeCollapsed,
}: {
  renderSidebarHeader?: (props: { collapsed: boolean }) => ReactNode;
  treeCollapsed: boolean;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const openConnection = useWorkspaceStore((state) => state.openConnection);
  const fleets = useItOpsStore((state) => state.fleets);
  const loaded = useItOpsStore((state) => state.loaded);
  const resolveFleet = useItOpsStore((state) => state.resolveFleet);
  const newGroupRequest = useItOpsStore((state) => state.newGroupRequest);
  const racksByFleet = useItOpsStore((state) => state.racksByFleet);
  const loadRacks = useItOpsStore((state) => state.loadRacks);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillPath>(EMPTY_DRILL);
  const [members, setMembers] = useState<ResolvedHost[]>([]);
  const [dialog, setDialog] = useState<{ group: Fleet | null } | null>(null);
  const [rackDialog, setRackDialog] = useState<{
    fleetId: string;
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
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);

  // ── Tree navigator state (search, resizable width, collapsed nodes) ──
  const [query, setQuery] = useState("");
  const [treeWidth, setTreeWidth] = useState(loadFleetTreeWidth);
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

  // Drag the splitter to resize the tree; persist on release.
  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!resizing.current) return;
      const left = treeRef.current?.getBoundingClientRect().left ?? 0;
      const width = Math.min(
        FLEET_TREE_MAX_WIDTH,
        Math.max(FLEET_TREE_MIN_WIDTH, event.clientX - left),
      );
      setTreeWidth(width);
    }
    function onUp() {
      if (!resizing.current) return;
      resizing.current = false;
      document.body.style.cursor = "";
      setTreeWidth((width) => {
        saveFleetTreeWidth(width);
        return width;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const activeGroup = useMemo(
    () => fleets.find((group) => group.id === activeId) ?? fleets[0] ?? null,
    [fleets, activeId],
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
    if (fleets.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!fleets.some((group) => group.id === activeId)) {
      setActiveId(fleets[0].id);
    }
  }, [fleets, activeId]);

  // Resolve the active group's members whenever the group (or its definition)
  // changes. The group object identity changes after an edit, re-running this.
  useEffect(() => {
    let disposed = false;
    if (!activeGroup) {
      setMembers([]);
      return;
    }
    void resolveFleet(activeGroup.id)
      .then((resolved) => {
        if (!disposed) setMembers(resolved);
      })
      .catch(() => {
        if (!disposed) setMembers([]);
      });
    return () => {
      disposed = true;
    };
  }, [activeGroup, resolveFleet]);

  // Load racks for every expanded Fleet node so the tree can show its topology.
  useEffect(() => {
    for (const fleet of fleets) {
      if (isExpanded(nodeId.fleet(fleet.id)) && !racksByFleet[fleet.id]) {
        void loadRacks(fleet.id);
      }
    }
  }, [fleets, racksByFleet, isExpanded, loadRacks]);

  const racks = useMemo(
    () => (activeGroup ? (racksByFleet[activeGroup.id] ?? []) : []),
    [activeGroup, racksByFleet],
  );
  const topology = useMemo(() => groupRackTopology(racks), [racks]);
  const selectedFleetIdForDialog = activeGroup?.id ?? fleets[0]?.id ?? "";
  const selectedServerRoomForDialog =
    drill.serverRoom ?? (drill.rackId ? racks.find((rack) => rack.id === drill.rackId)?.serverRoom : undefined);

  // A placed Connection whose id no longer resolves to a Fleet member (deleted
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

  // Select a node: focus its Fleet, switch to the Rack view, and set the drill.
  function selectNode(fleetId: string, next: DrillPath) {
    setActiveId(fleetId);
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

  if (loaded && fleets.length === 0) {
    return (
      <>
        <div className="it-empty">
          <span className="glyph">
            <ItIcon name="group" size={30} sw={1.5} />
          </span>
          <h2>{t("itops.fleets.emptyTitle")}</h2>
          <p>{t("itops.fleets.emptyBody")}</p>
          <button type="button" className="it-btn primary" onClick={() => setDialog({ group: null })}>
            <span className="it-btn-ic">
              <ItIcon name="plus" size={15} />
            </span>
            {t("itops.actions.newFleet")}
          </button>
        </div>
        {dialog ? (
          <FleetDialog
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
        : nodeId.fleet(activeGroup.id);

  // ── Per-view background derivation ──
  const drillRack = drill.rackId != null ? racks.find((r) => r.id === drill.rackId) : undefined;

  const viewBackground = drillRack
    ? drillRack.background
    : drill.serverRoom != null
      ? activeGroup?.roomBackgrounds?.[drill.serverRoom]
      : activeGroup?.background;

  const q = query.trim().toLowerCase();
  const matchQ = (s: string) => !q || (s || t("itops.racks.unassigned")).toLowerCase().includes(q);
  const effectiveTreeWidth = treeCollapsed ? FLEET_TREE_COLLAPSED_WIDTH : treeWidth;

  return (
    <div className={`hg ft${treeCollapsed ? " ft-collapsed" : ""}`}>
      {/* ── Tree navigator ── */}
      <div
        ref={treeRef}
        className="ft-tree"
        data-tutorial-id="itops.fleetsTree"
        style={{ width: effectiveTreeWidth, flex: `0 0 ${effectiveTreeWidth}px` }}
      >
        {renderSidebarHeader?.({ collapsed: treeCollapsed })}
        {!treeCollapsed ? (
          <>
            <div className="ft-head">
              <span className="ft-head-title">{t("itops.fleets.heading")}</span>
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
                        <ItIcon name="group" size={14} />
                        {t("itops.racks.addFleet")}
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
                        <ItIcon name="ops" size={14} />
                        {t("itops.racks.addServerRoom")}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={!activeGroup}
                        onClick={() => {
                          setAddMenuOpen(false);
                          setRackDialog({
                            fleetId: selectedFleetIdForDialog,
                            rack: null,
                            defaultServerRoom: selectedServerRoomForDialog,
                          });
                        }}
                      >
                        <ItIcon name="server" size={14} />
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
              {fleets.map((fleet) => {
                const fId = nodeId.fleet(fleet.id);
                const fleetRacks = racksByFleet[fleet.id] ?? [];
                const fleetTopo = groupRackTopology(fleetRacks);
                const open = isExpanded(fId);
                return (
                  <div key={fleet.id}>
                    <TreeRow
                      depth={0}
                      icon={groupIcon(fleet)}
                      label={fleet.name}
                      tint={groupColor(fleet.id)}
                      hasChildren={fleetRacks.length > 0}
                      open={open}
                      selected={selectedId === fId && drill.serverRoom == null}
                      onToggle={() => toggleNode(fId)}
                      onSelect={() => {
                        setActiveId(fleet.id);
                        setDrill(EMPTY_DRILL);
                      }}
                    />
                    {open
                      ? fleetTopo
                          .filter((room) => matchQ(room.key))
                          .map((room) => {
                            const mId = nodeId.serverRoom(fleet.id, room.key);
                            const mOpen = isExpanded(mId);
                            return (
                              <div key={mId}>
                                <TreeRow
                                  depth={1}
                                  icon="ops"
                                  label={room.key || t("itops.racks.unassigned")}
                                  count={room.racks.length}
                                  hasChildren={room.racks.length > 0}
                                  open={mOpen}
                                  selected={selectedId === mId}
                                  onToggle={() => toggleNode(mId)}
                                  onSelect={() =>
                                    selectNode(fleet.id, { serverRoom: room.key, rackId: null })
                                  }
                                />
                                {mOpen
                                  ? room.racks.map((rack) => (
                                      <TreeRow
                                        key={rack.id}
                                        depth={2}
                                        icon="server"
                                        label={rack.name}
                                        hasChildren={false}
                                        open={false}
                                        selected={selectedId === nodeId.rack(rack.id)}
                                        onSelect={() =>
                                          selectNode(fleet.id, {
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
          onMouseDown={() => {
            if (treeCollapsed) return;
            resizing.current = true;
            document.body.style.cursor = "col-resize";
          }}
        />
      </div>

      {/* ── Detail ── */}
      {activeGroup ? (
        <div className="hg-detail" data-tutorial-id="itops.fleetView">
          <RackDrill
            topology={topology}
            racks={racks}
            drill={drill}
            setDrill={setDrill}
            viewBackground={viewBackground}
            hostForItem={hostForItem}
            isGhostItem={isGhostItem}
            onSlotClick={(rack, startU) => setItemDialog({ rack, item: null, startU })}
            onOpenItem={(item) => void openRackItem(item)}
            onEditItem={(rack, item) => setItemDialog({ rack, item })}
            onMoveItem={(itemId, targetRackId, startU) => void moveItem(itemId, targetRackId, startU)}
          />
        </div>
      ) : null}

      {dialog ? (
        <FleetDialog
          group={dialog.group}
          onClose={() => setDialog(null)}
          onSaved={(saved) => setActiveId(saved.id)}
        />
      ) : null}
      {rackDialog && activeGroup ? (
        <RackDialog
          defaultFleetId={rackDialog.fleetId}
          fleets={fleets}
          racksByFleet={racksByFleet}
          rack={rackDialog.rack}
          defaultServerRoom={rackDialog.defaultServerRoom}
          onClose={() => setRackDialog(null)}
          onSaved={(saved) => {
            setActiveId(saved.fleetId);
            setDrill({ serverRoom: saved.serverRoom, rackId: saved.id });
          }}
        />
      ) : null}
      {serverRoomDialogOpen ? (
        <ServerRoomDialog
          fleets={fleets}
          defaultFleetId={selectedFleetIdForDialog}
          onClose={() => setServerRoomDialogOpen(false)}
          onCreated={(saved) => {
            setActiveId(saved.fleetId);
            setDrill({ serverRoom: saved.serverRoom, rackId: null });
          }}
        />
      ) : null}
      {itemDialog && activeGroup ? (
        <RackItemDialog
          fleetId={activeGroup.id}
          rack={itemDialog.rack}
          item={itemDialog.item}
          defaultStartU={itemDialog.startU}
          members={members}
          onClose={() => setItemDialog(null)}
        />
      ) : null}
    </div>
  );
}

// ── Tree row ──────────────────────────────────────────────────────────────
function TreeRow({
  depth,
  icon,
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
        <ItIcon name={icon} size={14} sw={1.6} />
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
  drill,
  setDrill,
  viewBackground,
  hostForItem,
  isGhostItem,
  onSlotClick,
  onOpenItem,
  onEditItem,
  onMoveItem,
}: {
  topology: ReturnType<typeof groupRackTopology>;
  racks: Rack[];
  drill: DrillPath;
  setDrill: (next: DrillPath) => void;
  viewBackground: DashboardBackground | null | undefined;
  hostForItem: (item: RackItem) => string | null;
  isGhostItem: (item: RackItem) => boolean;
  onSlotClick: (rack: Rack, startU: number) => void;
  onOpenItem: (item: RackItem) => void;
  onEditItem: (rack: Rack, item: RackItem) => void;
  onMoveItem: (itemId: string, targetRackId: string, startU: number) => void;
}) {
  const { t } = useTranslation();
  const unassigned = t("itops.racks.unassigned");
  const ungrouped = t("itops.racks.ungrouped");

  const serverRoom =
    drill.serverRoom != null
      ? topology.find((s) => topologyGroupKey(s.key) === topologyGroupKey(drill.serverRoom))
      : undefined;
  const rack = drill.rackId != null ? racks.find((r) => r.id === drill.rackId) : undefined;

  function elevation(r: Rack) {
    return (
      <RackElevation
        key={r.id}
        rack={r}
        hostFor={hostForItem}
        onSlotClick={(startU) => onSlotClick(r, startU)}
        onOpenItem={onOpenItem}
        onEditItem={(item) => onEditItem(r, item)}
        onMoveItem={onMoveItem}
        isGhost={isGhostItem}
      />
    );
  }

  return (
    <div className="ft-drill">
      <ItOpsBackground background={viewBackground} className="ft-drill-bg">
        {racks.length === 0 ? (
          <div className="card">
            <div className="hg-dlg-empty">{t("itops.racks.empty")}</div>
          </div>
        ) : rack ? (
          <RackStage
            rack={rack}
            hostFor={hostForItem}
            isGhost={isGhostItem}
            onSlotClick={(startU) => onSlotClick(rack, startU)}
            onOpenItem={onOpenItem}
            onEditItem={(item) => onEditItem(rack, item)}
            onMoveItem={onMoveItem}
          />
        ) : serverRoom ? (
          groupRacksByGroup(serverRoom.racks).map((g) => (
            <div className="rk-group" key={g.key}>
              {groupRacksByGroup(serverRoom.racks).length > 1 || g.key ? (
                <div className="rk-group-h">{g.key || ungrouped}</div>
              ) : null}
              <div className="rk-row">{g.racks.map((r) => elevation(r))}</div>
            </div>
          ))
        ) : (
          <div className="ft-cards">
            {topology.map((room) => (
              <DrillCard
                key={room.key}
                icon="ops"
                title={room.key || unassigned}
                meta={t("itops.racks.rackCount", { count: room.racks.length })}
                onClick={() => setDrill({ serverRoom: room.key, rackId: null })}
              />
            ))}
          </div>
        )}
      </ItOpsBackground>
    </div>
  );
}

function DrillCard({
  icon,
  title,
  meta,
  onClick,
}: {
  icon: ItIconName;
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ft-card" onClick={onClick}>
      <span className="ft-card-ic">
        <ItIcon name={icon} size={20} sw={1.6} />
      </span>
      <span className="ft-card-txt">
        <span className="ft-card-title">{title}</span>
        <span className="ft-card-meta">{meta}</span>
      </span>
      <ItIcon name="chevR" size={14} />
    </button>
  );
}
