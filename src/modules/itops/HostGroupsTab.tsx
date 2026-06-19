// Host Groups tab — durable fleet target groups (docs/ITOPS.md Phase 1). The
// list and detail are backed by the itops_* commands via useItOpsStore; the
// detail's member list is the run-time resolver output (itops_resolve_host_group)
// so dynamic-filter groups show the Connections they currently match.

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmSheet } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { HostGroup, ItopsTransport, ResolvedHost } from "../../types";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { TransportChip } from "./TransportChip";
import { HostGroupDialog } from "./HostGroupDialog";
import { useItOpsStore } from "./state";

const TRANSPORT_ORDER: ItopsTransport[] = ["auto", "ssh", "winrm", "psexec"];
const TILE_COLORS = [
  IT_ACCENTS.green,
  IT_ACCENTS.indigo,
  IT_ACCENTS.blue,
  IT_ACCENTS.teal,
  IT_ACCENTS.orange,
  IT_ACCENTS.purple,
];

// A stable per-group tile colour (Host Groups don't store one); hashing the id
// keeps a group's colour steady across reloads without a durable field.
function groupColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return TILE_COLORS[hash % TILE_COLORS.length];
}

function groupIcon(group: HostGroup): ItIconName {
  return group.filter ? "filter" : "group";
}

export function HostGroupsTab() {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const hostGroups = useItOpsStore((state) => state.hostGroups);
  const loaded = useItOpsStore((state) => state.loaded);
  const updateHostGroup = useItOpsStore((state) => state.updateHostGroup);
  const removeHostGroup = useItOpsStore((state) => state.removeHostGroup);
  const resolveHostGroup = useItOpsStore((state) => state.resolveHostGroup);
  const newGroupRequest = useItOpsStore((state) => state.newGroupRequest);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<ResolvedHost[]>([]);
  const [dialog, setDialog] = useState<{ group: HostGroup | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HostGroup | null>(null);

  const activeGroup = useMemo(
    () => hostGroups.find((group) => group.id === activeId) ?? hostGroups[0] ?? null,
    [hostGroups, activeId],
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
    if (hostGroups.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!hostGroups.some((group) => group.id === activeId)) {
      setActiveId(hostGroups[0].id);
    }
  }, [hostGroups, activeId]);

  // Resolve the active group's members whenever the group (or its definition)
  // changes. The group object identity changes after an edit, re-running this.
  useEffect(() => {
    let disposed = false;
    if (!activeGroup) {
      setMembers([]);
      return;
    }
    void resolveHostGroup(activeGroup.id)
      .then((resolved) => {
        if (!disposed) setMembers(resolved);
      })
      .catch(() => {
        if (!disposed) setMembers([]);
      });
    return () => {
      disposed = true;
    };
  }, [activeGroup, resolveHostGroup]);

  async function applyUpdate(
    group: HostGroup,
    changes: Partial<Pick<HostGroup, "transport" | "memberIds">>,
  ) {
    try {
      await updateHostGroup(group.id, {
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const group = pendingDelete;
    setPendingDelete(null);
    try {
      await removeHostGroup(group.id);
      showStatusBarNotice(t("itops.hostGroups.deletedNotice", { name: group.name }), {
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  if (loaded && hostGroups.length === 0) {
    return (
      <>
        <div className="it-empty">
          <span className="glyph">
            <ItIcon name="group" size={30} sw={1.5} />
          </span>
          <h2>{t("itops.hostGroups.emptyTitle")}</h2>
          <p>{t("itops.hostGroups.emptyBody")}</p>
          <button type="button" className="it-btn primary" onClick={() => setDialog({ group: null })}>
            <span className="it-btn-ic">
              <ItIcon name="plus" size={15} />
            </span>
            {t("itops.actions.newHostGroup")}
          </button>
        </div>
        {dialog ? (
          <HostGroupDialog
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
          <span>{t("itops.hostGroups.heading")}</span>
          <span>{hostGroups.length}</span>
        </div>
        {hostGroups.map((group) => (
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
                  ? t("itops.hostGroups.dynamicMembership")
                  : t("itops.hostGroups.connectionsCount", { count: group.memberIds.length })}
              </span>
            </span>
            {group.filter ? <span className="dyn">{t("itops.hostGroups.dynamicBadge")}</span> : null}
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
                {t("itops.hostGroups.connectionsCount", { count: members.length })}
                {activeGroup.filter ? `  ·  ${t("itops.hostGroups.dynamicMembership")}` : ""}
              </div>
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
            {/* Run task lands with Phase 2 (Batch Runs); shown for continuity. */}
            <button type="button" className="it-btn">
              <span className="it-btn-ic">
                <ItIcon name="run" size={13} />
              </span>
              {t("itops.actions.runTask")}
            </button>
          </div>

          <div className="it-section-label">{t("itops.hostGroups.transportDefaultLabel")}</div>
          <div className="card">
            <div className="hg-opt">
              <span className="ic">
                <ItIcon name="link" size={16} />
              </span>
              <div className="hg-opt-txt">
                <div className="t">{t("itops.hostGroups.perHostTransport")}</div>
                <div className="d">{t("itops.hostGroups.perHostTransportHint")}</div>
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
                  <div className="t">{t("itops.hostGroups.dynamicFilter")}</div>
                  <div className="d">{t("itops.hostGroups.dynamicFilterHint")}</div>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {activeGroup.filter.types.map((type) => (
                    <span key={type} className="filter-pill">
                      <span className="k">{t("itops.hostGroups.filterTypeKey")}</span>
                      {type}
                    </span>
                  ))}
                  {activeGroup.filter.folderId ? (
                    <span className="filter-pill">
                      <span className="k">{t("itops.hostGroups.filterFolderKey")}</span>
                      {activeGroup.filter.folderId}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="it-section-label">
            <span>{t("itops.hostGroups.membersLabel")}</span>
            <span className="ct">{t("itops.hostGroups.membersCount", { count: members.length })}</span>
          </div>
          <div className="card">
            {members.length === 0 ? (
              <div className="hg-dlg-empty">{t("itops.hostGroups.noMembers")}</div>
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
                    <span className="dyn">{t("itops.hostGroups.dynamicBadge")}</span>
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
        </div>
      ) : null}

      {dialog ? (
        <HostGroupDialog
          group={dialog.group}
          onClose={() => setDialog(null)}
          onSaved={(saved) => setActiveId(saved.id)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmSheet
          tone="danger"
          title={t("itops.hostGroups.deleteTitle")}
          message={t("itops.hostGroups.deleteBody", { name: pendingDelete.name })}
          confirmLabel={t("itops.actions.delete")}
          confirmIcon="trash"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}
