// Create an Automation (docs/ITOPS.md Phase 3–4): a performance-counter trigger
// plus an ordered IT Ops action list (notify / popup / email / webhook / run a
// Batch Run). Built from the shared dialog primitives. Richer triggers land in
// Phase 5; editing an existing Automation's actions is a later refinement.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Select, Sheet, TextArea, TextInput } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type {
  AutomationAction,
  NotifyLevel,
} from "../../types";
import type { PerformanceMetric, WatchdogConfig } from "../../watchdog/types";
import { ItIcon } from "./icons";
import { useItOpsStore } from "./state";

const METRICS: PerformanceMetric[] = [
  "cpuPercent",
  "ramPercent",
  "commitPercent",
  "diskFreePercent",
  "diskUsedPercent",
  "networkDownBytesPerSec",
  "networkUpBytesPerSec",
  "appWorkingSetBytes",
  "appPrivateBytes",
  "handleCount",
  "processCount",
  "threadCount",
];

type Op = "gt" | "lt" | "gte" | "lte";
const OPS: { value: Op; label: string }[] = [
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
];

type ActionKind = AutomationAction["kind"];
const ACTION_KINDS: ActionKind[] = ["notify", "popup", "email", "webhook", "runBatch"];
const NOTIFY_LEVELS: NotifyLevel[] = ["inApp", "toast", "sound"];
const HTTP_METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];

function defaultAction(kind: ActionKind, firstGroupId: string): AutomationAction {
  switch (kind) {
    case "notify":
      return { kind: "notify", level: "toast" };
    case "popup":
      return { kind: "popup", title: "", body: "" };
    case "email":
      return { kind: "email", to: [], subject: "", body: "" };
    case "webhook":
      return { kind: "webhook", url: "", method: "POST", body: null };
    case "runBatch":
      return { kind: "runBatch", hostGroupId: firstGroupId, task: { kind: "script", body: "" } };
  }
}

export function AutomationDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const hostGroups = useItOpsStore((state) => state.hostGroups);
  const createAutomation = useItOpsStore((state) => state.createAutomation);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const firstGroupId = hostGroups[0]?.id ?? "";

  const [name, setName] = useState("");
  const [metric, setMetric] = useState<PerformanceMetric>("diskUsedPercent");
  const [op, setOp] = useState<Op>("gt");
  const [threshold, setThreshold] = useState("85");
  const [pollSeconds, setPollSeconds] = useState("60");
  const [actions, setActions] = useState<AutomationAction[]>([{ kind: "notify", level: "toast" }]);
  const [busy, setBusy] = useState(false);

  const thresholdNum = Number(threshold);
  const pollNum = Number(pollSeconds);
  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(thresholdNum) &&
    Number.isFinite(pollNum) &&
    pollNum >= 1 &&
    !busy;

  function updateAction(index: number, next: AutomationAction) {
    setActions((current) => current.map((action, i) => (i === index ? next : action)));
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setBusy(true);
    const config: WatchdogConfig = {
      name: name.trim(),
      target: { kind: "performanceCounter", metric },
      trigger: { predicate: { op, value: thresholdNum } },
      pollMs: Math.max(500, Math.round(pollNum * 1000)),
      stop: { kind: "untilCanceled" },
      notification: "inAppPlusToast",
      action: { kind: "notify" },
    };
    try {
      const saved = await createAutomation(name.trim(), config, actions, true);
      showStatusBarNotice(t("itops.automations.savedNotice", { name: saved.name }), {
        tone: "success",
      });
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose}>
      <Sheet
        width={600}
        height={680}
        title={t("itops.actions.newAutomation")}
        ariaLabel={t("itops.actions.newAutomation")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" onClick={() => void handleSave()} disabled={!canSave}>
                {t("itops.actions.create")}
              </Btn>
            }
          />
        }
      >
        <Field label={t("itops.automations.nameLabel")} req>
          <TextInput
            value={name}
            placeholder={t("itops.automations.namePlaceholder")}
            onChange={(event) => setName(event.currentTarget.value)}
            autoFocus
          />
        </Field>
        <Field label={t("itops.automations.metricLabel")} req>
          <Select
            value={metric}
            onChange={(event) => setMetric(event.currentTarget.value as PerformanceMetric)}
            options={METRICS.map((value) => ({ value, label: value }))}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t("itops.automations.conditionLabel")} req>
            <Select value={op} onChange={(event) => setOp(event.currentTarget.value as Op)} options={OPS} />
          </Field>
          <Field label={t("itops.automations.thresholdLabel")} req>
            <TextInput
              value={threshold}
              inputMode="decimal"
              onChange={(event) => setThreshold(event.currentTarget.value)}
            />
          </Field>
        </div>
        <Field label={t("itops.automations.pollLabel")} req>
          <TextInput
            value={pollSeconds}
            inputMode="numeric"
            onChange={(event) => setPollSeconds(event.currentTarget.value)}
          />
        </Field>

        <Field label={t("itops.automations.actionsLabel")}>
          <div className="au-act-list">
            {actions.length === 0 ? (
              <div className="hg-dlg-empty">{t("itops.automations.noActionsHint")}</div>
            ) : null}
            {actions.map((action, index) => (
              <div key={index} className="au-act">
                <div className="au-act-head">
                  <Select
                    value={action.kind}
                    onChange={(event) =>
                      updateAction(index, defaultAction(event.currentTarget.value as ActionKind, firstGroupId))
                    }
                    options={ACTION_KINDS.map((kind) => ({
                      value: kind,
                      label: t(`itops.automations.action${kind.charAt(0).toUpperCase()}${kind.slice(1)}`),
                    }))}
                  />
                  <button
                    type="button"
                    className="au-act-rm"
                    aria-label={t("itops.actions.delete")}
                    title={t("itops.actions.delete")}
                    onClick={() => setActions((current) => current.filter((_, i) => i !== index))}
                  >
                    <ItIcon name="xmark" size={13} />
                  </button>
                </div>
                <ActionFields action={action} onChange={(next) => updateAction(index, next)} />
              </div>
            ))}
            <button
              type="button"
              className="au-act-add"
              onClick={() => setActions((current) => [...current, defaultAction("notify", firstGroupId)])}
            >
              <ItIcon name="plus" size={14} />
              {t("itops.actions.addAction")}
            </button>
          </div>
        </Field>
      </Sheet>
    </DialogShell>
  );
}

function ActionFields({
  action,
  onChange,
}: {
  action: AutomationAction;
  onChange: (next: AutomationAction) => void;
}) {
  const { t } = useTranslation();
  const hostGroups = useItOpsStore((state) => state.hostGroups);

  switch (action.kind) {
    case "notify":
      return (
        <Select
          value={action.level}
          onChange={(event) =>
            onChange({ kind: "notify", level: event.currentTarget.value as NotifyLevel })
          }
          options={NOTIFY_LEVELS.map((level) => ({
            value: level,
            label: t(`itops.automations.level${level.charAt(0).toUpperCase()}${level.slice(1)}`),
          }))}
        />
      );
    case "popup":
      return (
        <>
          <TextInput
            value={action.title}
            placeholder={t("itops.automations.popupTitle")}
            onChange={(event) => onChange({ ...action, title: event.currentTarget.value })}
          />
          <TextInput
            value={action.body}
            placeholder={t("itops.automations.popupBody")}
            onChange={(event) => onChange({ ...action, body: event.currentTarget.value })}
          />
        </>
      );
    case "email":
      return (
        <>
          <TextInput
            value={action.to.join(", ")}
            placeholder={t("itops.automations.emailTo")}
            onChange={(event) =>
              onChange({
                ...action,
                to: event.currentTarget.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter((value) => value.length > 0),
              })
            }
          />
          <TextInput
            value={action.subject}
            placeholder={t("itops.automations.emailSubject")}
            onChange={(event) => onChange({ ...action, subject: event.currentTarget.value })}
          />
          <TextArea
            value={action.body}
            rows={3}
            placeholder={t("itops.automations.popupBody")}
            onChange={(event) => onChange({ ...action, body: event.currentTarget.value })}
          />
        </>
      );
    case "webhook":
      return (
        <>
          <div className="au-act-grid">
            <TextInput
              value={action.url}
              placeholder={t("itops.automations.webhookUrl")}
              onChange={(event) => onChange({ ...action, url: event.currentTarget.value })}
            />
            <Select
              value={action.method}
              onChange={(event) => onChange({ ...action, method: event.currentTarget.value })}
              options={HTTP_METHODS.map((method) => ({ value: method, label: method }))}
            />
          </div>
          <TextArea
            value={action.body ?? ""}
            rows={2}
            placeholder={t("itops.automations.webhookBody")}
            onChange={(event) =>
              onChange({ ...action, body: event.currentTarget.value || null })
            }
          />
        </>
      );
    case "runBatch":
      return (
        <>
          <Select
            value={action.hostGroupId}
            onChange={(event) => onChange({ ...action, hostGroupId: event.currentTarget.value })}
            options={hostGroups.map((group) => ({ value: group.id, label: group.name }))}
          />
          <TextArea
            value={action.task.body}
            rows={3}
            spellCheck={false}
            placeholder={t("itops.batchRuns.scriptPlaceholder")}
            onChange={(event) =>
              onChange({ ...action, task: { kind: "script", body: event.currentTarget.value } })
            }
          />
        </>
      );
  }
}
