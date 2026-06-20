// Automations tab — durable trigger→condition→action rules backed by the
// itops_automations table (docs/ITOPS.md Phase 3). Each Automation is the
// persistent definition of a Watchdog; enabling one arms a live Watchdog that
// re-arms on launch. The live firing detail stays on the app-wide Watchdog
// Status Bar indicator. The Phase 3 create dialog covers the common
// performance-counter rule; richer triggers/actions land in Phases 4–5.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmSheet } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { Automation, AutomationAction } from "../../types";
import type { WatchdogConfig } from "../../watchdog/types";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { AutomationDialog } from "./AutomationDialog";
import { useItOpsStore } from "./state";

function triggerIcon(config: WatchdogConfig): ItIconName {
  switch (config.target.kind) {
    case "performanceCounter":
      return "gauge";
    case "schedule":
      return "calendar";
    case "ping":
    case "tcpReachable":
    case "sshSessionOutputSilence":
      return "pulse";
    default:
      return "gauge";
  }
}

function triggerColor(config: WatchdogConfig): string {
  switch (config.target.kind) {
    case "performanceCounter":
      return IT_ACCENTS.orange;
    case "schedule":
      return IT_ACCENTS.indigo;
    case "ping":
    case "tcpReachable":
      return IT_ACCENTS.teal;
    case "sshSessionOutputSilence":
      return IT_ACCENTS.indigo;
    default:
      return IT_ACCENTS.graphite;
  }
}

// Technical labels (metric ids, hosts, cron, predicate symbols) — not
// translatable chrome, matching how the existing Watchdog UI surfaces config.
function triggerLabel(config: WatchdogConfig): string {
  const target = config.target;
  if (target.kind === "performanceCounter") return target.metric;
  if (target.kind === "schedule") return target.cron;
  if (target.kind === "ping") return target.host;
  if (target.kind === "tcpReachable") return `${target.host}:${target.port}`;
  return target.kind;
}

const OP_SYMBOL: Record<string, string> = {
  gt: ">",
  lt: "<",
  gte: "≥",
  lte: "≤",
  eq: "=",
  ne: "≠",
};

function conditionLabel(config: WatchdogConfig): string | null {
  // A schedule fires on time, not on a sampled value — no condition to show.
  if (config.target.kind === "schedule") return null;
  const predicate = config.trigger.predicate;
  if (predicate.op === "contains") return `contains: ${predicate.value}`;
  if (predicate.op === "silenceFor") return `silenceFor ${predicate.ms}ms`;
  return `${OP_SYMBOL[predicate.op] ?? predicate.op} ${predicate.value}`;
}

const ACTION_ICON: Record<AutomationAction["kind"], ItIconName> = {
  notify: "bell",
  popup: "popup",
  email: "mail",
  webhook: "webhook",
  runBatch: "run",
};

const ACTION_COLOR: Record<AutomationAction["kind"], string> = {
  notify: IT_ACCENTS.blue,
  popup: IT_ACCENTS.teal,
  email: IT_ACCENTS.green,
  webhook: IT_ACCENTS.indigo,
  runBatch: IT_ACCENTS.orange,
};

export function AutomationsTab() {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const automations = useItOpsStore((state) => state.automations);
  const loaded = useItOpsStore((state) => state.automationsLoaded);
  const setAutomationEnabled = useItOpsStore((state) => state.setAutomationEnabled);
  const removeAutomation = useItOpsStore((state) => state.removeAutomation);
  const newAutomationRequest = useItOpsStore((state) => state.newAutomationRequest);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Automation | null>(null);

  // Open the create dialog when the module header's primary button signals.
  const seenRequest = useRef(newAutomationRequest);
  useEffect(() => {
    if (newAutomationRequest !== seenRequest.current) {
      seenRequest.current = newAutomationRequest;
      setDialogOpen(true);
    }
  }, [newAutomationRequest]);

  async function toggle(automation: Automation) {
    try {
      await setAutomationEnabled(automation.id, !automation.enabled);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const automation = pendingDelete;
    setPendingDelete(null);
    try {
      await removeAutomation(automation.id);
      showStatusBarNotice(t("itops.automations.deletedNotice", { name: automation.name }), {
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  const dialog = dialogOpen ? (
    <AutomationDialog onClose={() => setDialogOpen(false)} onSaved={() => {}} />
  ) : null;

  if (loaded && automations.length === 0) {
    return (
      <div className="it-empty">
        <span className="glyph">
          <ItIcon name="auto" size={28} sw={1.6} />
        </span>
        <h2>{t("itops.automations.emptyTitle")}</h2>
        <p>{t("itops.automations.emptyBody")}</p>
        <button type="button" className="it-btn primary" onClick={() => setDialogOpen(true)}>
          <span className="it-btn-ic">
            <ItIcon name="plus" size={15} />
          </span>
          {t("itops.actions.newAutomation")}
        </button>
        {dialog}
      </div>
    );
  }

  return (
    <div className="au">
      <div className="au-list">
        {automations.map((automation) => (
          <div key={automation.id} className={`au-row${automation.enabled ? "" : " off"}`}>
            <span className="tile" style={{ background: triggerColor(automation.config) }}>
              <ItIcon name={triggerIcon(automation.config)} size={17} sw={1.6} />
            </span>
            <div className="au-main">
              <span className="nm">{automation.name}</span>
              <span className="au-flow">
                <span>{triggerLabel(automation.config)}</span>
                {conditionLabel(automation.config) ? (
                  <>
                    <span className="arrow">
                      <ItIcon name="chevR" size={12} />
                    </span>
                    <span className="cond">{conditionLabel(automation.config)}</span>
                  </>
                ) : null}
                <span className="arrow">
                  <ItIcon name="arrow" size={13} />
                </span>
                <span className="au-acts">
                  {automation.actions.map((action, index) => (
                    <span key={index} className="a" style={{ background: ACTION_COLOR[action.kind] }}>
                      <ItIcon name={ACTION_ICON[action.kind]} size={12} sw={1.7} />
                    </span>
                  ))}
                </span>
              </span>
            </div>
            <div className="au-side">
              <button
                type="button"
                className="au-toggle"
                data-on={automation.enabled ? "1" : "0"}
                title={automation.enabled ? t("itops.automations.armed") : t("itops.automations.disabled")}
                aria-label={automation.enabled ? t("itops.automations.armed") : t("itops.automations.disabled")}
                onClick={() => void toggle(automation)}
              >
                <i />
              </button>
              <span className={`au-fired${automation.enabled ? " armed" : ""}`}>
                {automation.enabled ? t("itops.automations.armed") : t("itops.automations.disabled")}
              </span>
            </div>
            <button
              type="button"
              className="au-del"
              title={t("itops.actions.delete")}
              aria-label={t("itops.actions.delete")}
              onClick={() => setPendingDelete(automation)}
            >
              <ItIcon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>

      {dialog}
      {pendingDelete ? (
        <ConfirmSheet
          tone="danger"
          title={t("itops.automations.deleteTitle")}
          message={t("itops.automations.deleteBody", { name: pendingDelete.name })}
          confirmLabel={t("itops.actions.delete")}
          confirmIcon="trash"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}
