// Host Groups tab — list of fleet target groups plus a detail/editor pane.
// Ported from the redesign mockup (itops-hostgroups.jsx). Phase 0 renders the
// design against the placeholder fixtures in data.ts; Phase 1 wires durable
// Host Groups (see docs/ITOPS.md).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ItIcon } from "./icons";
import { TransportChip } from "./TransportChip";
import { HOST_GROUPS, GROUP_MEMBERS, type Transport } from "./data";

const TRANSPORT_ORDER: Transport[] = ["auto", "ssh", "winrm", "psexec"];

export function HostGroupsTab({ empty }: { empty: boolean }) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState("g-web");

  if (empty) {
    return (
      <div className="it-empty">
        <span className="glyph">
          <ItIcon name="group" size={30} sw={1.5} />
        </span>
        <h2>{t("itops.hostGroups.emptyTitle")}</h2>
        <p>{t("itops.hostGroups.emptyBody")}</p>
        <button type="button" className="it-btn primary">
          <span className="it-btn-ic">
            <ItIcon name="plus" size={15} />
          </span>
          {t("itops.actions.newHostGroup")}
        </button>
      </div>
    );
  }

  const group = HOST_GROUPS.find((g) => g.id === activeId) ?? HOST_GROUPS[0];
  const members = GROUP_MEMBERS;

  return (
    <div className="hg">
      {/* left list */}
      <div className="hg-list">
        <div className="hg-list-h">
          <span>{t("itops.hostGroups.heading")}</span>
          <span>{HOST_GROUPS.length}</span>
        </div>
        {HOST_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`hg-item${g.id === activeId ? " active" : ""}`}
            onClick={() => setActiveId(g.id)}
          >
            <span className="tile" style={{ background: g.color }}>
              <ItIcon name={g.icon} size={16} sw={1.7} />
            </span>
            <span className="hg-item-txt">
              <span className="nm">{g.name}</span>
              <span className="meta">{g.sub}</span>
            </span>
            {g.filter ? <span className="dyn">{t("itops.hostGroups.dynamicBadge")}</span> : null}
            <span className="cnt">{g.count}</span>
          </button>
        ))}
      </div>

      {/* detail */}
      <div className="hg-detail">
        <div className="hg-detail-head">
          <span className="tile" style={{ background: group.color }}>
            <ItIcon name={group.icon} size={22} sw={1.6} />
          </span>
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <div className="nm">{group.name}</div>
            <div className="sub">
              {t("itops.hostGroups.connectionsCount", { count: group.count })}
              {group.filter ? `  ·  ${t("itops.hostGroups.dynamicMembership")}` : ""}
            </div>
          </div>
          <button type="button" className="it-icon-btn" title={t("itops.actions.rename")}>
            <ItIcon name="edit" size={15} />
          </button>
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
                <button key={tp} type="button" className={tp === group.transport ? "on" : ""}>
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
                <div className="t">{t("itops.hostGroups.dynamicFilter")}</div>
                <div className="d">{t("itops.hostGroups.dynamicFilterHint")}</div>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {group.filter.types.map((type) => (
                  <span key={type} className="filter-pill">
                    <span className="k">{t("itops.hostGroups.filterTypeKey")}</span>
                    {type}
                  </span>
                ))}
                <span className="filter-pill">
                  <span className="k">{t("itops.hostGroups.filterFolderKey")}</span>
                  {group.filter.folder}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="it-section-label">
          <span>{t("itops.hostGroups.membersLabel")}</span>
          <span className="ct">{t("itops.hostGroups.membersCount", { count: members.length })}</span>
        </div>
        <div className="card">
          {members.map((m) => (
            <div key={m.id} className="member">
              <span className="tile">
                <ItIcon name={m.transport === "winrm" ? "windows" : "server"} size={15} sw={1.6} />
              </span>
              <div className="member-txt">
                <div className="nm">{m.name}</div>
                <div className="host">{m.host}</div>
              </div>
              <span className="os">{m.os}</span>
              <TransportChip transport={m.transport} />
              <button type="button" className="x" title={t("itops.actions.removeFromGroup")}>
                <ItIcon name="xmark" size={13} />
              </button>
            </div>
          ))}
          <button type="button" className="member-add">
            <ItIcon name="plus" size={14} />
            {t("itops.actions.addConnections")}
          </button>
        </div>
      </div>
    </div>
  );
}
