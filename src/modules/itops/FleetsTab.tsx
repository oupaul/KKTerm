// Fleets tab — durable fleet target groups (docs/ITOPS.md Phase 1). The left
// panel is a Connection-tree-style navigator over the rack topology
// (Fleet → Region → Datacenter → Server Room → Rack); the right panel drills
// down that hierarchy, ending at a single animated rack elevation. Member lists
// come from the run-time resolver (itops_resolve_fleet) so dynamic-filter groups
// show the Connections they currently match.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmSheet } from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { Fleet, ItopsTransport, Rack, RackItem, ResolvedHost, RunScope } from "../../types";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { TransportChip } from "./TransportChip";
import { FleetDialog } from "./FleetDialog";
import { RackElevation } from "./RackElevation";
import { RackDialog } from "./RackDialog";
import { RackItemDialog } from "./RackItemDialog";
import { useItOpsStore } from "./state";
import { EMPTY_DRILL, groupRackTopology, nodeId, type DrillPath } from "./rackTopology";
import {
  FLEET_TREE_MAX_WIDTH,
  FLEET_TREE_MIN_WIDTH,
  loadCollapsedNodeIds,
  loadFleetTreeWidth,
  saveCollapsedNodeIds,
  saveFleetTreeWidth,
} from "./fleetTreeState";

type FleetView = "members" | "racks";

const TRANSPORT_ORDER: ItopsTransport[] = ["auto", "ssh", "winrm", "psexec"];
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

export function FleetsTab() {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const openConnection = useWorkspaceStore((state) => state.openConnection);
  const fleets = useItOpsStore((state) => state.fleets);
  const loaded = useItOpsStore((state) => state.loaded);
  const updateFleet = useItOpsStore((state) => state.updateFleet);
  const removeFleet = useItOpsStore((state) => state.removeFleet);
  const resolveFleet = useItOpsStore((state) => state.resolveFleet);
  const requestNewBatchRun = useItOpsStore((state) => state.requestNewBatchRun);
  const newGroupRequest = useItOpsStore((state) => state.newGroupRequest);
  const racksByFleet = useItOpsStore((state) => state.racksByFleet);
  const loadRacks = useItOpsStore((state) => state.loadRacks);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<FleetView>("racks");
  const [drill, setDrill] = useState<DrillPath>(EMPTY_DRILL);
  const [members, setMembers] = useState<ResolvedHost[]>([]);
  const [dialog, setDialog] = useState<{ group: Fleet | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Fleet | null>(null);
  const [rackDialog, setRackDialog] = useState<{
    rack: Rack | null;
    defaultServerRoom?: string;
  } | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [itemDialog, setItemDialog] = useState<{
    rack: Rack;
    item: RackItem | null;
    startU?: number;
  } | null>(null);
  const [pendingRackDelete, setPendingRackDelete] = useState<Rack | null>(null);
  const deleteRack = useItOpsStore((state) => state.deleteRack);
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);

  // ── Tree navigator state (search, resizable width, collapsed nodes) ──
  const [query, setQuery] = useState("");
  const [treeWidth, setTreeWidth] = useState(loadFleetTreeWidth);
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsedNodeIds);
  const resizing = useRef(false);

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
      const width = Math.min(FLEET_TREE_MAX_WIDTH, Math.max(FLEET_TREE_MIN_WIDTH, event.clientX));
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
    setView("racks");
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

  async function applyUpdate(
    group: Fleet,
    changes: Partial<Pick<Fleet, "transport" | "memberIds">>,
  ) {
    try {
      await updateFleet(group.id, {
        name: group.name,
        memberIds: changes.memberIds ?? group.memberIds,
        filter: group.filter ?? null,
        transport: changes.transport ?? group.transport,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  async function confirmRackDelete() {
    if (!pendingRackDelete || !activeGroup) return;
    const rack = pendingRackDelete;
    setPendingRackDelete(null);
    try {
      await deleteRack(activeGroup.id, rack.id);
      if (drill.rackId === rack.id) setDrill((d) => ({ ...d, rackId: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const group = pendingDelete;
    setPendingDelete(null);
    try {
      await removeFleet(group.id);
      showStatusBarNotice(t("itops.fleets.deletedNotice", { name: group.name }), {
        tone: "success",
      });
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

  const q = query.trim().toLowerCase();
  const matchQ = (s: string) => !q || (s || t("itops.racks.unassigned")).toLowerCase().includes(q);

  return (
    <div className="hg ft">
      {/* ── Tree navigator ── */}
      <div className="ft-tree" style={{ width: treeWidth, flex: `0 0 ${treeWidth}px` }}>
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
                      setView("racks");
                      setRackDialog({ rack: null, defaultServerRoom: "" });
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
                      setView("racks");
                      setRackDialog({
                        rack: null,
                        defaultServerRoom: drill.serverRoom ?? undefined,
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
        <div
          className="ft-resize"
          onMouseDown={() => {
            resizing.current = true;
            document.body.style.cursor = "col-resize";
          }}
        />
      </div>

      {/* ── Detail ── */}
      {activeGroup ? (
        <div className="hg-detail">
          <div className="hg-detail-head">
            <span className="tile" style={{ background: groupColor(activeGroup.id) }}>
              <ItIcon name={groupIcon(activeGroup)} size={22} sw={1.6} />
            </span>
            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <div className="nm">{activeGroup.name}</div>
              <div className="sub">
                {t("itops.fleets.connectionsCount", { count: members.length })}
                {activeGroup.filter ? `  ·  ${t("itops.fleets.dynamicMembership")}` : ""}
              </div>
            </div>
            <div className="seg" role="tablist" aria-label={t("itops.fleets.viewToggleLabel")}>
              <button
                type="button"
                role="tab"
                aria-selected={view === "members"}
                className={view === "members" ? "on" : ""}
                onClick={() => setView("members")}
              >
                {t("itops.fleets.viewMembers")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "racks"}
                className={view === "racks" ? "on" : ""}
                onClick={() => setView("racks")}
              >
                {t("itops.fleets.viewRacks")}
              </button>
            </div>
            <button
              type="button"
              className="it-icon-btn"
              title={t("itops.actions.edit")}
              onClick={() => setDialog({ group: activeGroup })}
            >
              <ItIcon name="edit" size={15} />
            </button>
            <button
              type="button"
              className="it-icon-btn"
              title={t("itops.actions.delete")}
              onClick={() => setPendingDelete(activeGroup)}
            >
              <ItIcon name="trash" size={15} />
            </button>
            <button
              type="button"
              className="it-btn"
              onClick={() => requestNewBatchRun(activeGroup.id)}
            >
              <span className="it-btn-ic">
                <ItIcon name="run" size={13} />
              </span>
              {t("itops.actions.runTask")}
            </button>
          </div>

          {view === "members" ? (
            <MembersView
              group={activeGroup}
              members={members}
              onEditGroup={() => setDialog({ group: activeGroup })}
              applyUpdate={applyUpdate}
            />
          ) : (
            <RackDrill
              group={activeGroup}
              topology={topology}
              racks={racks}
              drill={drill}
              setDrill={setDrill}
              onNewRack={() =>
                setRackDialog({ rack: null, defaultServerRoom: drill.serverRoom ?? undefined })
              }
              onRunScope={(scope) => requestNewBatchRun(activeGroup.id, scope)}
              hostForItem={hostForItem}
              isGhostItem={isGhostItem}
              onSlotClick={(rack, startU) => setItemDialog({ rack, item: null, startU })}
              onOpenItem={(item) => void openRackItem(item)}
              onEditItem={(rack, item) => setItemDialog({ rack, item })}
              onEditRack={(rack) => setRackDialog({ rack })}
              onDeleteRack={(rack) => setPendingRackDelete(rack)}
              onRunRack={(rack) => requestNewBatchRun(activeGroup.id, { rackId: rack.id })}
              onMoveItem={(itemId, targetRackId, startU) =>
                void moveItem(itemId, targetRackId, startU)
              }
            />
          )}
        </div>
      ) : null}

      {dialog ? (
        <FleetDialog
          group={dialog.group}
          onClose={() => setDialog(null)}
          onSaved={(saved) => setActiveId(saved.id)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmSheet
          tone="danger"
          title={t("itops.fleets.deleteTitle")}
          message={t("itops.fleets.deleteBody", { name: pendingDelete.name })}
          confirmLabel={t("itops.actions.delete")}
          confirmIcon="trash"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
      {rackDialog && activeGroup ? (
        <RackDialog
          fleetId={activeGroup.id}
          rack={rackDialog.rack}
          defaultServerRoom={rackDialog.defaultServerRoom}
          onClose={() => setRackDialog(null)}
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
      {pendingRackDelete ? (
        <ConfirmSheet
          tone="danger"
          title={t("itops.racks.deleteTitle")}
          message={t("itops.racks.deleteBody", { name: pendingRackDelete.name })}
          confirmLabel={t("itops.actions.delete")}
          confirmIcon="trash"
          onConfirm={() => void confirmRackDelete()}
          onCancel={() => setPendingRackDelete(null)}
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

// ── Members view (unchanged behaviour, extracted for clarity) ───────────────
function MembersView({
  group,
  members,
  onEditGroup,
  applyUpdate,
}: {
  group: Fleet;
  members: ResolvedHost[];
  onEditGroup: () => void;
  applyUpdate: (
    group: Fleet,
    changes: Partial<Pick<Fleet, "transport" | "memberIds">>,
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="it-section-label">{t("itops.fleets.transportDefaultLabel")}</div>
      <div className="card">
        <div className="hg-opt">
          <span className="ic">
            <ItIcon name="link" size={16} />
          </span>
          <div className="hg-opt-txt">
            <div className="t">{t("itops.fleets.perHostTransport")}</div>
            <div className="d">{t("itops.fleets.perHostTransportHint")}</div>
          </div>
          <div className="seg">
            {TRANSPORT_ORDER.map((tp) => (
              <button
                key={tp}
                type="button"
                className={tp === group.transport ? "on" : ""}
                onClick={() => {
                  if (tp !== group.transport) void applyUpdate(group, { transport: tp });
                }}
              >
                {tp === "auto" ? t("itops.transport.auto") : tp.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {group.filter ? (
          <div className="hg-opt">
            <span className="ic">
              <ItIcon name="filter" size={16} />
            </span>
            <div className="hg-opt-txt">
              <div className="t">{t("itops.fleets.dynamicFilter")}</div>
              <div className="d">{t("itops.fleets.dynamicFilterHint")}</div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {group.filter.types.map((type) => (
                <span key={type} className="filter-pill">
                  <span className="k">{t("itops.fleets.filterTypeKey")}</span>
                  {type}
                </span>
              ))}
              {group.filter.folderId ? (
                <span className="filter-pill">
                  <span className="k">{t("itops.fleets.filterFolderKey")}</span>
                  {group.filter.folderId}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="it-section-label">
        <span>{t("itops.fleets.membersLabel")}</span>
        <span className="ct">{t("itops.fleets.membersCount", { count: members.length })}</span>
      </div>
      <div className="card">
        {members.length === 0 ? (
          <div className="hg-dlg-empty">{t("itops.fleets.noMembers")}</div>
        ) : (
          members.map((member) => (
            <div key={member.connectionId} className="member">
              <span className="tile">
                <ItIcon
                  name={member.transport === "winrm" ? "windows" : "server"}
                  size={15}
                  sw={1.6}
                />
              </span>
              <div className="member-txt">
                <div className="nm">{member.name}</div>
                <div className="host">
                  {member.username ? `${member.username}@` : ""}
                  {member.host}
                  {member.port ? `:${member.port}` : ""}
                </div>
              </div>
              <span className="os">{member.connectionType}</span>
              <TransportChip transport={member.transport} />
              {group.memberIds.includes(member.connectionId) ? (
                <button
                  type="button"
                  className="x"
                  title={t("itops.actions.removeFromGroup")}
                  onClick={() =>
                    void applyUpdate(group, {
                      memberIds: group.memberIds.filter((id) => id !== member.connectionId),
                    })
                  }
                >
                  <ItIcon name="xmark" size={13} />
                </button>
              ) : (
                <span className="dyn">{t("itops.fleets.dynamicBadge")}</span>
              )}
            </div>
          ))
        )}
        <button type="button" className="member-add" onClick={onEditGroup}>
          <ItIcon name="plus" size={14} />
          {t("itops.actions.addConnections")}
        </button>
      </div>
    </>
  );
}

// ── Rack drill-down ─────────────────────────────────────────────────────────
function RackDrill({
  group,
  topology,
  racks,
  drill,
  setDrill,
  onNewRack,
  onRunScope,
  hostForItem,
  isGhostItem,
  onSlotClick,
  onOpenItem,
  onEditItem,
  onEditRack,
  onDeleteRack,
  onRunRack,
  onMoveItem,
}: {
  group: Fleet;
  topology: ReturnType<typeof groupRackTopology>;
  racks: Rack[];
  drill: DrillPath;
  setDrill: (next: DrillPath) => void;
  onNewRack: () => void;
  onRunScope: (scope: RunScope) => void;
  hostForItem: (item: RackItem) => string | null;
  isGhostItem: (item: RackItem) => boolean;
  onSlotClick: (rack: Rack, startU: number) => void;
  onOpenItem: (item: RackItem) => void;
  onEditItem: (rack: Rack, item: RackItem) => void;
  onEditRack: (rack: Rack) => void;
  onDeleteRack: (rack: Rack) => void;
  onRunRack: (rack: Rack) => void;
  onMoveItem: (itemId: string, targetRackId: string, startU: number) => void;
}) {
  const { t } = useTranslation();
  const unassigned = t("itops.racks.unassigned");

  const serverRoom =
    drill.serverRoom != null ? topology.find((s) => s.key === drill.serverRoom) : undefined;
  const rack = drill.rackId != null ? racks.find((r) => r.id === drill.rackId) : undefined;

  const crumbs: { label: string; onClick: () => void }[] = [
    { label: group.name, onClick: () => setDrill(EMPTY_DRILL) },
  ];
  if (drill.serverRoom != null)
    crumbs.push({
      label: drill.serverRoom || unassigned,
      onClick: () => setDrill({ serverRoom: drill.serverRoom, rackId: null }),
    });
  if (rack) crumbs.push({ label: rack.name, onClick: () => {} });

  // Scoped run for the current server room (skip "Unassigned" — an empty key
  // acts as a wildcard in the matcher, so a scoped run there would target all).
  const scope: RunScope | null = (() => {
    if (rack) return { rackId: rack.id };
    if (drill.serverRoom) return { serverRoom: drill.serverRoom };
    return null;
  })();

  function elevation(r: Rack, detailed = false) {
    return (
      <RackElevation
        key={r.id}
        rack={r}
        hostFor={hostForItem}
        onSlotClick={(startU) => onSlotClick(r, startU)}
        onOpenItem={onOpenItem}
        onEditItem={(item) => onEditItem(r, item)}
        onEditRack={onEditRack}
        onDeleteRack={onDeleteRack}
        onRunRack={onRunRack}
        onMoveItem={onMoveItem}
        isGhost={isGhostItem}
        detailed={detailed}
      />
    );
  }

  return (
    <div className="ft-drill">
      <div className="ft-bar">
        <nav className="ft-breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={i} className="ft-crumb">
              {i > 0 ? <ItIcon name="chevR" size={11} /> : null}
              <button
                type="button"
                className={i === crumbs.length - 1 ? "cur" : ""}
                onClick={crumb.onClick}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
        <span style={{ flex: "1 1 auto" }} />
        {scope ? (
          <button type="button" className="it-icon-btn sm" title={t("itops.racks.runScope")} onClick={() => onRunScope(scope)}>
            <ItIcon name="run" size={12} />
          </button>
        ) : null}
        <button type="button" className="it-btn sm" onClick={onNewRack}>
          <span className="it-btn-ic">
            <ItIcon name="plus" size={13} />
          </span>
          {t("itops.racks.newTitle")}
        </button>
      </div>

      {racks.length === 0 ? (
        <div className="card">
          <div className="hg-dlg-empty">{t("itops.racks.empty")}</div>
        </div>
      ) : rack ? (
        <div className="ft-rack-detail">{elevation(rack, true)}</div>
      ) : serverRoom ? (
        <div className="rk-row">{serverRoom.racks.map((r) => elevation(r))}</div>
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
