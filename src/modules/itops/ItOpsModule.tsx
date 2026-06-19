// IT Ops Module shell: header, three tabs (Host Groups, Batch Runs,
// Automations) and the content router. Ported from the redesign mockup
// (itops-app.jsx). Phase 0 renders the full design against placeholder
// fixtures; later phases swap the tab bodies onto real backend data.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ItIcon, type ItIconName } from "./icons";
import { HostGroupsTab } from "./HostGroupsTab";
import { BatchRunsTab } from "./BatchRunsTab";
import { AutomationsTab } from "./AutomationsTab";
import { AUTOMATIONS, HOST_GROUPS, RUN_HOSTS } from "./data";

type TabId = "groups" | "runs" | "autos";

const TABS: { id: TabId; labelKey: string; icon: ItIconName }[] = [
  { id: "groups", labelKey: "itops.tabs.groups", icon: "group" },
  { id: "runs", labelKey: "itops.tabs.runs", icon: "run" },
  { id: "autos", labelKey: "itops.tabs.autos", icon: "auto" },
];

const PRIMARY: Record<TabId, { labelKey: string; icon: ItIconName; size: number }> = {
  groups: { labelKey: "itops.actions.newHostGroup", icon: "plus", size: 15 },
  runs: { labelKey: "itops.actions.newBatchRun", icon: "run", size: 13 },
  autos: { labelKey: "itops.actions.newAutomation", icon: "plus", size: 15 },
};

export function ItOpsModule({ onOpenAssistant }: { onOpenAssistant?: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>("groups");

  const prim = PRIMARY[tab];
  const runningCount = RUN_HOSTS.filter(
    (r) => r.live.status === "running" || r.live.status === "pending",
  ).length;

  return (
    <div className="it">
      {/* header */}
      <div className="it-head">
        <span className="it-head-tile">
          <ItIcon name="ops" size={20} sw={1.7} />
        </span>
        <div className="it-head-txt">
          <h1>{t("itops.title")}</h1>
          <p>{t("itops.subtitle")}</p>
        </div>
        <span className="it-head-sp" />
        <button
          type="button"
          className="it-icon-btn accent"
          title={t("itops.askAssistant")}
          aria-label={t("itops.askAssistant")}
          onClick={onOpenAssistant}
        >
          <ItIcon name="bot" size={17} />
        </button>
        <button type="button" className="it-btn primary">
          <span className="it-btn-ic">
            <ItIcon name={prim.icon} size={prim.size} />
          </span>
          {t(prim.labelKey)}
        </button>
      </div>

      {/* tabs */}
      <div className="it-tabs">
        {TABS.map((tabDef) => {
          const active = tabDef.id === tab;
          const badge =
            tabDef.id === "groups"
              ? HOST_GROUPS.length
              : tabDef.id === "autos"
                ? AUTOMATIONS.length
                : null;
          return (
            <button
              key={tabDef.id}
              type="button"
              className={`it-tab${active ? " active" : ""}`}
              onClick={() => setTab(tabDef.id)}
            >
              <span className="it-tab-ic">
                <ItIcon name={tabDef.icon} size={15} sw={1.7} />
              </span>
              {t(tabDef.labelKey)}
              {badge !== null ? <span className="it-tab-badge">{badge}</span> : null}
              {tabDef.id === "runs" && runningCount > 0 ? (
                <span className="it-tab-badge live">{runningCount}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* content */}
      <div className="it-content">
        {tab === "groups" ? <HostGroupsTab empty={false} /> : null}
        {tab === "runs" ? <BatchRunsTab empty={false} /> : null}
        {tab === "autos" ? <AutomationsTab empty={false} /> : null}
      </div>
    </div>
  );
}
