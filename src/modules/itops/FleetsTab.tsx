// Fleets tab — durable fleet target groups (docs/ITOPS.md Phase 1). The
// list and detail are backed by the itops_* commands via useItOpsStore; the
// detail's member list is the run-time resolver output (itops_resolve_fleet)
// so dynamic-filter groups show the Connections they currently match.

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmSheet } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { Fleet, ItopsTransport, ResolvedHost } from "../../types";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { TransportChip } from "./TransportChip";
import { FleetDialog } from "./FleetDialog";
import { RackElevation } from "./RackElevation";
import { RackDialog } from "./RackDialog";
import { RackItemDialog } from "./RackItemDialog";
import { useItOpsStore } from "./state";
import type { Rack, RackItem } from "../../types";

type FleetView = "members" | "racks";

// Group a Fleet's racks by region, then area, preserving stored order, so the
// Rack View can render region → area sections of the virtual datacenter.
function groupRacksByRegionArea<T extends { region: string; area: string }>(
  racks: T[],
): { region: string; areas: { area: string; racks: T[] }[] }[] {
  const regions: { region: string; areas: { area: string; racks: T[] }[] }[] = [];
  for (const rack of racks) {
    let region = regions.find((entry) => entry.region === rack.region);
    if (!region) {
      region = { region: rack.region, areas: [] };
      regions.push(region);
    }
    let area = region.areas.find((entry) => entry.area === rack.area);
    if (!area) {
      area = { area: rack.area, racks: [] };
      region.areas.push(area);
    }
    area.racks.push(rack);
  }
  return regions;
}

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
  const [view, setView] = useState<FleetView>("members");
  const [members, setMembers] = useState<ResolvedHost[]>([]);
  const [dialog, setDialog] = useState<{ group: Fleet | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Fleet | null>(null);
  const [rackDialog, setRackDialog] = useState<{ rack: Rack | null } | null>(null);
  const [itemDialog, setItemDialog] = useState<{
    rack: Rack;
    item: RackItem | null;
    startU?: number;
  } | null>(null);
  const [pendingRackDelete, setPendingRackDelete] = useState<Rack | null>(null);
  const deleteRack = useItOpsStore((state) => state.deleteRack);

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

  // Load the active Fleet's racks when the Rack View is shown (or the Fleet
  // changes while it's open). Cached per Fleet in the store.
  useEffect(() => {
    if (view === "racks" && activeGroup) {
      void loadRacks(activeGroup.id);
    }
  }, [view, activeGroup, loadRacks]);

  const racks = activeGroup ? (racksByFleet[activeGroup.id] ?? []) : [];
  const rackRegions = useMemo(() => groupRacksByRegionArea(racks), [racks]);

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

  return (
    <div className="hg">
      {/* left list */}
      <div className="hg-list">
        <div className="hg-list-h">
          <span>{t("itops.fleets.heading")}</span>
          <span>{fleets.length}</span>
        </div>
        {fleets.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`hg-item${group.id === activeGroup?.id ? " active" : ""}`}
            onClick={() => setActiveId(group.id)}
          >
            <span className="tile" style={{ background: groupColor(group.id) }}>
              <ItIcon name={groupIcon(group)} size={16} sw={1.7} />
            </span>
            <span className="hg-item-txt">
              <span className="nm">{group.name}</span>
              <span className="meta">
                {group.filter
                  ? t("itops.fleets.dynamicMembership")
                  : t("itops.fleets.connectionsCount", { count: group.memberIds.length })}
              </span>
            </span>
            {group.filter ? <span className="dyn">{t("itops.fleets.dynamicBadge")}</span> : null}
            <span className="cnt">{group.memberIds.length}</span>
          </button>
        ))}
      </div>

      {/* detail */}
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
                    className={tp === activeGroup.transport ? "on" : ""}
                    onClick={() => {
                      if (tp !== activeGroup.transport) {
                        void applyUpdate(activeGroup, { transport: tp });
                      }
                    }}
                  >
                    {tp === "auto" ? t("itops.transport.auto") : tp.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {activeGroup.filter ? (
              <div className="hg-opt">
                <span className="ic">
                  <ItIcon name="filter" size={16} />
                </span>
                <div className="hg-opt-txt">
                  <div className="t">{t("itops.fleets.dynamicFilter")}</div>
                  <div className="d">{t("itops.fleets.dynamicFilterHint")}</div>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {activeGroup.filter.types.map((type) => (
                    <span key={type} className="filter-pill">
                      <span className="k">{t("itops.fleets.filterTypeKey")}</span>
                      {type}
                    </span>
                  ))}
                  {activeGroup.filter.folderId ? (
                    <span className="filter-pill">
                      <span className="k">{t("itops.fleets.filterFolderKey")}</span>
                      {activeGroup.filter.folderId}
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
                  {activeGroup.memberIds.includes(member.connectionId) ? (
                    <button
                      type="button"
                      className="x"
                      title={t("itops.actions.removeFromGroup")}
                      onClick={() =>
                        void applyUpdate(activeGroup, {
                          memberIds: activeGroup.memberIds.filter(
                            (id) => id !== member.connectionId,
                          ),
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
            <button
              type="button"
              className="member-add"
              onClick={() => setDialog({ group: activeGroup })}
            >
              <ItIcon name="plus" size={14} />
              {t("itops.actions.addConnections")}
            </button>
          </div>
          </>
          ) : (
            <>
              <div className="it-section-label">
                <span>{t("itops.racks.heading")}</span>
                <span className="ct">{t("itops.racks.rackCount", { count: racks.length })}</span>
                <span style={{ flex: "1 1 auto" }} />
                <button
                  type="button"
                  className="it-btn sm"
                  onClick={() => setRackDialog({ rack: null })}
                >
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
              ) : (
                <div className="rk-canvas">
                  {rackRegions.map((region) => (
                    <div className="rk-region" key={region.region || "_"}>
                      {region.region ? <div className="rk-region-h">{region.region}</div> : null}
                      {region.areas.map((area) => (
                        <div className="rk-area" key={area.area || "_"}>
                          {area.area ? <div className="rk-area-h">{area.area}</div> : null}
                          <div className="rk-row">
                            {area.racks.map((rack) => (
                              <RackElevation
                                key={rack.id}
                                rack={rack}
                                onSlotClick={(startU) => setItemDialog({ rack, item: null, startU })}
                                onItemClick={(item) => setItemDialog({ rack, item })}
                                onEditRack={(target) => setRackDialog({ rack: target })}
                                onDeleteRack={(target) => setPendingRackDelete(target)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
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
