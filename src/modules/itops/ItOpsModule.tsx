// IT Ops Module shell. The visible module is Fleet-first; Batch Run and
// Automation runtime plumbing stays mounted so existing backend events and
// programmatic run requests keep working while the tab UI is hidden.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { Actions, Btn, DialogShell, Sheet } from "../../app/ui/dialog";
import { ModuleHeader, ModuleHeaderTitle, ModuleIconTile } from "../../app/ModuleHeader";
import { isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { RunEvent, RunScope } from "../../types";
import { ItIcon } from "./icons";
import { FleetsTab } from "./FleetsTab";
import { BatchRunDialog } from "./BatchRunDialog";
import { useItOpsStore } from "./state";

type AutomationActionEvent = {
  kind: string;
  automationName?: string;
  title?: string;
  body?: string;
};

export function ItOpsModule({ fleetTreeCollapsed }: { fleetTreeCollapsed: boolean }) {
  const { t } = useTranslation();
  const [batchDialogGroupId, setBatchDialogGroupId] = useState<string | null | undefined>(
    undefined,
  );
  const [batchDialogScope, setBatchDialogScope] = useState<RunScope | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [automationPopup, setAutomationPopup] = useState<{ title: string; body: string } | null>(
    null,
  );

  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const loadFleets = useItOpsStore((state) => state.loadFleets);
  const loadRunHistory = useItOpsStore((state) => state.loadRunHistory);
  const loadAutomations = useItOpsStore((state) => state.loadAutomations);
  const applyRunEvent = useItOpsStore((state) => state.applyRunEvent);
  const newRunRequest = useItOpsStore((state) => state.newRunRequest);
  const pendingRunGroupId = useItOpsStore((state) => state.pendingRunGroupId);
  const pendingRunScope = useItOpsStore((state) => state.pendingRunScope);

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

  function openBatchRunDialog(groupId?: string | null, scope?: RunScope | null) {
    setBatchDialogGroupId(groupId);
    setBatchDialogScope(scope ?? null);
    setBatchDialogOpen(true);
  }

  // Hidden Batch Run affordances can still request a run; open the launcher
  // preselected to that group (and scope) without showing the old tab bar.
  const seenNewRunRequest = useRef(newRunRequest);
  useEffect(() => {
    if (newRunRequest !== seenNewRunRequest.current) {
      seenNewRunRequest.current = newRunRequest;
      openBatchRunDialog(pendingRunGroupId, pendingRunScope);
    }
  }, [newRunRequest, pendingRunGroupId, pendingRunScope]);

  return (
    <div className="it">
      <div className="it-content">
        <FleetsTab
          treeCollapsed={fleetTreeCollapsed}
          renderSidebarHeader={({ collapsed }) => (
            <ModuleHeader className="it-head it-side-head">
              <ModuleIconTile className="it-head-tile" module="itops">
                <ItIcon name="ops" size={20} sw={1.7} />
              </ModuleIconTile>
              {collapsed ? null : (
                <div className="it-head-txt">
                  <ModuleHeaderTitle>{t("itops.title")}</ModuleHeaderTitle>
                </div>
              )}
            </ModuleHeader>
          )}
        />
      </div>

      {batchDialogOpen ? (
        <BatchRunDialog
          defaultGroupId={batchDialogGroupId}
          defaultScope={batchDialogScope}
          onClose={() => setBatchDialogOpen(false)}
          onStarted={() => setBatchDialogOpen(false)}
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
