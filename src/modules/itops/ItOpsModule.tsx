// IT Ops Module shell: header, three tabs (Fleets, Batch Runs,
// Automations) and the content router. All three tabs are backed by real
// commands (Phases 1–4). The module also surfaces live Batch Run progress and
// Automation actions (notify/popup) streamed from the backend.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { Actions, Btn, DialogShell, Sheet } from "../../app/ui/dialog";
import {
  ModuleHeader,
  ModuleHeaderDivider,
  ModuleHeaderTitle,
  ModuleIconTile,
} from "../../app/ModuleHeader";
import { isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { RunEvent } from "../../types";
import { ItIcon, type ItIconName } from "./icons";
import { FleetsTab } from "./FleetsTab";
import { BatchRunsTab } from "./BatchRunsTab";
import { BatchRunDialog } from "./BatchRunDialog";
import { AutomationsTab } from "./AutomationsTab";
import { useItOpsStore } from "./state";

type AutomationActionEvent = {
  kind: string;
  automationName?: string;
  title?: string;
  body?: string;
};

type TabId = "groups" | "runs" | "autos";

const TABS: { id: TabId; labelKey: string; icon: ItIconName }[] = [
  { id: "groups", labelKey: "itops.tabs.fleets", icon: "group" },
  { id: "runs", labelKey: "itops.tabs.runs", icon: "run" },
  { id: "autos", labelKey: "itops.tabs.autos", icon: "auto" },
];

const PRIMARY: Record<TabId, { labelKey: string; icon: ItIconName; size: number }> = {
  groups: { labelKey: "itops.actions.newFleet", icon: "plus", size: 15 },
  runs: { labelKey: "itops.actions.newBatchRun", icon: "run", size: 13 },
  autos: { labelKey: "itops.actions.newAutomation", icon: "plus", size: 15 },
};

export function ItOpsModule() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>("groups");
  const [batchDialogGroupId, setBatchDialogGroupId] = useState<string | null | undefined>(
    undefined,
  );
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [automationPopup, setAutomationPopup] = useState<{ title: string; body: string } | null>(
    null,
  );

  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const fleetCount = useItOpsStore((state) => state.fleets.length);
  const automationCount = useItOpsStore((state) => state.automations.length);
  const loadFleets = useItOpsStore((state) => state.loadFleets);
  const requestNewFleet = useItOpsStore((state) => state.requestNewFleet);
  const requestNewAutomation = useItOpsStore((state) => state.requestNewAutomation);
  const loadRunHistory = useItOpsStore((state) => state.loadRunHistory);
  const loadAutomations = useItOpsStore((state) => state.loadAutomations);
  const applyRunEvent = useItOpsStore((state) => state.applyRunEvent);
  const activeRun = useItOpsStore((state) => state.activeRun);
  const newRunRequest = useItOpsStore((state) => state.newRunRequest);
  const pendingRunGroupId = useItOpsStore((state) => state.pendingRunGroupId);

  useEffect(() => {
    void loadFleets();
    void loadRunHistory();
    void loadAutomations();
  }, [loadFleets, loadRunHistory, loadAutomations]);

  // Stream live Batch Run progress into the store.
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    const unlisten = listen<RunEvent>("itops://run", (event) => applyRunEvent(event.payload));
    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, [applyRunEvent]);

  // Surface Automation notify/popup actions (docs/ITOPS.md Phase 4).
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    const unlisten = listen<AutomationActionEvent>("itops://automation", (event) => {
      const payload = event.payload;
      if (payload.kind === "popup") {
        setAutomationPopup({ title: payload.title ?? "", body: payload.body ?? "" });
      } else if (payload.kind === "notify") {
        showStatusBarNotice(
          t("itops.automations.triggeredNotice", { name: payload.automationName ?? "" }),
          { tone: "warning" },
        );
      }
    });
    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, [showStatusBarNotice, t]);

  function openBatchRunDialog(groupId?: string | null) {
    setBatchDialogGroupId(groupId);
    setBatchDialogOpen(true);
  }

  // The "Run task" / "Re-run" affordances request a run; switch to the Batch
  // Runs tab and open the launcher preselected to that group.
  const seenNewRunRequest = useRef(newRunRequest);
  useEffect(() => {
    if (newRunRequest !== seenNewRunRequest.current) {
      seenNewRunRequest.current = newRunRequest;
      setTab("runs");
      openBatchRunDialog(pendingRunGroupId);
    }
  }, [newRunRequest, pendingRunGroupId]);

  const prim = PRIMARY[tab];
  const runningCount = activeRun
    ? activeRun.hosts.filter((host) => host.status === "running" || host.status === "pending")
        .length
    : 0;

  function handlePrimary() {
    if (tab === "groups") {
      requestNewFleet();
    } else if (tab === "runs") {
      openBatchRunDialog();
    } else {
      requestNewAutomation();
    }
  }

  return (
    <div className="it">
      {/* header */}
      <ModuleHeader className="it-head">
        <ModuleIconTile className="it-head-tile" module="itops">
          <ItIcon name="ops" size={20} sw={1.7} />
        </ModuleIconTile>
        <div className="it-head-txt">
          <ModuleHeaderTitle>{t("itops.title")}</ModuleHeaderTitle>
        </div>
        <ModuleHeaderDivider />
        <div className="it-tabs" data-tutorial-id="itops.tabs">
          {TABS.map((tabDef) => {
            const active = tabDef.id === tab;
            const badge =
              tabDef.id === "groups"
                ? fleetCount
                : tabDef.id === "autos"
                  ? automationCount
                  : null;
            return (
              <button
                key={tabDef.id}
                type="button"
                className={`it-tab${active ? " active" : ""}`}
                data-tutorial-id={
                  tabDef.id === "groups"
                    ? "itops.groups"
                    : tabDef.id === "runs"
                      ? "itops.runs"
                      : "itops.autos"
                }
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
        <span className="it-head-sp" />
        <button
          type="button"
          className="it-btn primary"
          data-tutorial-id="itops.primaryAction"
          onClick={handlePrimary}
        >
          <span className="it-btn-ic">
            <ItIcon name={prim.icon} size={prim.size} />
          </span>
          {t(prim.labelKey)}
        </button>
      </ModuleHeader>

      {/* content */}
      <div className="it-content">
        {tab === "groups" ? <FleetsTab /> : null}
        {tab === "runs" ? <BatchRunsTab onNewBatchRun={() => openBatchRunDialog()} /> : null}
        {tab === "autos" ? <AutomationsTab /> : null}
      </div>

      {batchDialogOpen ? (
        <BatchRunDialog
          defaultGroupId={batchDialogGroupId}
          onClose={() => setBatchDialogOpen(false)}
          onStarted={() => setTab("runs")}
        />
      ) : null}
      {automationPopup ? (
        <DialogShell onBackdrop={() => setAutomationPopup(null)}>
          <Sheet
            width={420}
            title={automationPopup.title}
            ariaLabel={automationPopup.title}
            footer={
              <Actions
                primary={
                  <Btn kind="primary" onClick={() => setAutomationPopup(null)}>
                    {t("watchdog.close")}
                  </Btn>
                }
              />
            }
          >
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{automationPopup.body}</p>
          </Sheet>
        </DialogShell>
      ) : null}
    </div>
  );
}
