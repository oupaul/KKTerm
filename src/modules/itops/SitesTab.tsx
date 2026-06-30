// Sites tab — durable site target groups (docs/ITOPS.md Phase 1). The left
// panel is a Connection-tree-style navigator over the rack topology
// (Site → Server Room → Rack); the right panel drills down that hierarchy,
// ending at a single animated rack elevation. Member lists come from the
// run-time resolver (itops_resolve_site) so dynamic-filter groups show the
// Connections they currently match.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { Site, Rack, RackItem, ResolvedHost } from "../../types";
import { ConnectionIcon } from "../workspace/connections/ConnectionIcon";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { SiteDialog } from "./SiteDialog";
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
import { selectRandomRackCallouts } from "./rackInventory";
import type { DashboardBackground } from "../dashboard/types";
import {
  SITE_TREE_COLLAPSED_WIDTH,
  SITE_TREE_MAX_WIDTH,
  SITE_TREE_MIN_WIDTH,
  loadCollapsedNodeIds,
  loadSiteTreeWidth,
  saveCollapsedNodeIds,
  saveSiteTreeWidth,
} from "./siteTreeState";

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
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);

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
      if (isExpanded(nodeId.site(site.id)) && !racksBySite[site.id]) {
        void loadRacks(site.id);
      }
    }
  }, [sites, racksBySite, isExpanded, loadRacks]);

  const racks = useMemo(
    () => (activeGroup ? (racksBySite[activeGroup.id] ?? []) : []),
    [activeGroup, racksBySite],
  );
  const topology = useMemo(() => groupRackTopology(racks), [racks]);
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
                const siteTopo = groupRackTopology(siteRacks);
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
            drill={drill}
            setDrill={setDrill}
            viewBackground={viewBackground}
            roomIcons={activeGroup.roomIcons}
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
          racksBySite={racksBySite}
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
            setDrill({ serverRoom: saved.serverRoom, rackId: null });
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
  drill,
  setDrill,
  viewBackground,
  roomIcons,
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
  roomIcons?: Record<string, ItOpsCustomIcon>;
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
          <>
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
            {groupRacksByGroup(serverRoom.racks).map((g) => (
              <div className="rk-group" key={g.key}>
                {groupRacksByGroup(serverRoom.racks).length > 1 || g.key ? (
                  <div className="rk-group-h">{g.key || ungrouped}</div>
                ) : null}
                <div className="rk-row">{g.racks.map((r) => elevation(r))}</div>
              </div>
            ))}
          </>
        ) : (
          <div className="ft-cards">
            {topology.map((room) => (
              <DrillCard
                key={room.key}
                icon="room"
                customIcon={roomIcons?.[room.key]}
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
