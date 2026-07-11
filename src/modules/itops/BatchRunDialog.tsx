// Launch a Batch Run: pick a Site, then either a one-shot script body or
// an interactive Playbook (an ordered expect-style step sequence run over a
// single shell — docs/ITOPS.md). Built from the shared dialog primitives.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Group,
  Segmented,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from "../../app/ui/dialog";
import type { BatchTask, PlaybookStep, RunScope } from "../../types";
import { useWorkspaceStore } from "../../store";
import { useItOpsStore } from "./state";

type TaskMode = "script" | "playbook";

function scopeIsSet(scope?: RunScope | null): scope is RunScope {
  return !!scope && !!(scope.rackId || scope.serverRoom || scope.hostIds?.length);
}

function emptyStep(): PlaybookStep {
  return { name: "", send: "", expect: "", timeoutSeconds: null };
}

export function BatchRunDialog({
  defaultGroupId,
  defaultScope,
  defaultTask,
  onClose,
  onStarted,
}: {
  defaultGroupId?: string | null;
  defaultScope?: RunScope | null;
  defaultTask?: BatchTask | null;
  onClose: () => void;
  onStarted: () => void;
}) {
  const { t } = useTranslation();
  const sites = useItOpsStore((state) => state.sites);
  const tasks = useItOpsStore((state) => state.tasks);
  const racksBySite = useItOpsStore((state) => state.racksBySite);
  const startBatchRun = useItOpsStore((state) => state.startBatchRun);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);

  const [groupId, setGroupId] = useState(defaultGroupId ?? sites[0]?.id ?? "");
  // A scoped run targets only the placed hosts in the matching racks; the scope
  // is fixed for the launch (it came from a rack/region/area "Run" affordance).
  const scope = scopeIsSet(defaultScope) ? defaultScope : null;
  const scopeLabel = (() => {
    if (!scope) return "";
    if (scope.hostIds?.length) {
      return t("itops.batchRuns.scopeSelectedHosts", { count: scope.hostIds.length });
    }
    if (scope.rackId) {
      const rack = (racksBySite[groupId] ?? []).find((entry) => entry.id === scope.rackId);
      return t("itops.batchRuns.scopeRack", { name: rack?.name ?? scope.rackId });
    }
    return t("itops.batchRuns.scopeServerRoom", { name: scope.serverRoom ?? "" });
  })();
  const [mode, setMode] = useState<TaskMode>(defaultTask?.kind ?? "script");
  const [body, setBody] = useState(defaultTask?.kind === "script" ? defaultTask.body : "");
  const [playbookName, setPlaybookName] = useState(
    defaultTask?.kind === "playbook" ? defaultTask.name : "",
  );
  const [steps, setSteps] = useState<PlaybookStep[]>(
    defaultTask?.kind === "playbook" ? defaultTask.steps : [emptyStep()],
  );
  const [busy, setBusy] = useState(false);
  const [taskSourceId, setTaskSourceId] = useState(() => {
    if (!defaultTask) return "";
    return tasks.find((entry) => JSON.stringify(entry.task) === JSON.stringify(defaultTask))?.id ?? "";
  });

  const hasGroups = sites.length > 0;
  // Drop only fully-blank steps. A step with an empty `send` but a set `expect`
  // is valid (e.g. wait for the initial prompt before the first command).
  const filledSteps = steps.filter(
    (step) => step.kind === "sudo" || (step.kind === "ai" && !!step.aiInstruction?.trim()) || step.send.trim().length > 0 || (step.expect ?? "").trim().length > 0,
  );
  const taskReady =
    mode === "script"
      ? body.trim().length > 0
      : playbookName.trim().length > 0 && filledSteps.length > 0;
  const canRun = hasGroups && groupId.length > 0 && taskReady && !busy;

  function updateStep(index: number, patch: Partial<PlaybookStep>) {
    setSteps((current) =>
      current.map((step, position) => (position === index ? { ...step, ...patch } : step)),
    );
  }

  function selectTaskSource(id: string) {
    setTaskSourceId(id);
    const selected = tasks.find((entry) => entry.id === id);
    if (!selected) return;
    setMode(selected.task.kind);
    if (selected.task.kind === "script") {
      setBody(selected.task.body);
      return;
    }
    setPlaybookName(selected.task.name);
    setSteps(selected.task.steps);
  }

  function buildTask(): BatchTask {
    if (mode === "script") {
      return { kind: "script", body };
    }
    return {
      kind: "playbook",
      name: playbookName.trim(),
      steps: filledSteps.map((step) => ({
        id: step.id,
        kind: step.kind,
        name: step.name.trim(),
        send: step.send,
        expect: step.expect && step.expect.trim().length > 0 ? step.expect : null,
        timeoutSeconds: step.timeoutSeconds ?? null,
        secretOwnerId: step.secretOwnerId ?? null,
        aiInstruction: step.aiInstruction ?? null,
      })),
    };
  }

  async function handleRun() {
    if (!canRun) {
      return;
    }
    setBusy(true);
    try {
      await startBatchRun(groupId, buildTask(), scope);
      showStatusBarNotice(t("itops.batchRuns.startedNotice"), { tone: "success" });
      onStarted();
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
        width={580}
        title={t("itops.batchRuns.launchTitle")}
        ariaLabel={t("itops.batchRuns.launchTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" icon="bolt" onClick={() => void handleRun()} disabled={!canRun}>
                {t("itops.actions.run")}
              </Btn>
            }
          />
        }
      >
        {hasGroups ? (
          <>
            <Field label={t("itops.batchRuns.siteLabel")} req>
              <Select
                value={groupId}
                disabled={!!scope}
                onChange={(event) => setGroupId(event.currentTarget.value)}
                options={sites.map((group) => ({ value: group.id, label: group.name }))}
              />
            </Field>
            {scope ? <div className="it-scope-note">{scopeLabel}</div> : null}
            <Field label={t("itops.batchRuns.taskSourceLabel")}>
              <Select
                value={taskSourceId}
                onChange={(event) => selectTaskSource(event.currentTarget.value)}
                options={[
                  { value: "", label: t("itops.batchRuns.adHocTask") },
                  ...tasks.map((entry) => ({ value: entry.id, label: entry.name })),
                ]}
              />
            </Field>
            <Field label={t("itops.batchRuns.taskTypeLabel")}>
              <Segmented
                value={mode}
                onChange={(value) => setMode(value as TaskMode)}
                options={[
                  { value: "script", label: t("itops.batchRuns.taskTypeScript") },
                  { value: "playbook", label: t("itops.batchRuns.taskTypePlaybook") },
                ]}
              />
            </Field>

            {mode === "script" ? (
              <Field label={t("itops.batchRuns.scriptLabel")} req>
                <TextArea
                  value={body}
                  rows={6}
                  spellCheck={false}
                  placeholder={t("itops.batchRuns.scriptPlaceholder")}
                  onChange={(event) => setBody(event.currentTarget.value)}
                />
              </Field>
            ) : (
              <>
                <Field label={t("itops.batchRuns.playbookNameLabel")} req>
                  <TextInput
                    value={playbookName}
                    placeholder={t("itops.batchRuns.playbookNamePlaceholder")}
                    onChange={(event) => setPlaybookName(event.currentTarget.value)}
                  />
                </Field>
                {steps.map((step, index) => (
                  <Group
                    key={index}
                    title={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span>{t("itops.batchRuns.stepHeading", { number: index + 1 })}</span>
                        {steps.length > 1 ? (
                          <Btn sm onClick={() => setSteps((c) => c.filter((_, p) => p !== index))}>
                            {t("itops.batchRuns.removeStep")}
                          </Btn>
                        ) : null}
                      </div>
                    }
                  >
                    <Field label={t("itops.batchRuns.stepNameLabel")}>
                      <TextInput
                        value={step.name}
                        placeholder={t("itops.batchRuns.stepNamePlaceholder")}
                        onChange={(event) => updateStep(index, { name: event.currentTarget.value })}
                      />
                    </Field>
                    {step.kind === "sudo" ? (
                      <div className="it-scope-note">{t("itops.tasks.credentialStoredDetail")}</div>
                    ) : step.kind === "ai" ? (
                      <div className="it-scope-note">{step.aiInstruction}</div>
                    ) : (
                      <Field label={t("itops.batchRuns.stepSendLabel")} req>
                        <TextInput
                          value={step.send}
                          mono
                          spellCheck={false}
                          placeholder={t("itops.batchRuns.stepSendPlaceholder")}
                          onChange={(event) => updateStep(index, { send: event.currentTarget.value })}
                        />
                      </Field>
                    )}
                    {step.kind !== "ai" ? (
                      <Field
                        label={t("itops.batchRuns.stepExpectLabel")}
                        hint={t("itops.batchRuns.stepExpectHint")}
                      >
                        <TextInput
                          value={step.expect ?? ""}
                          mono
                          spellCheck={false}
                          placeholder={t("itops.batchRuns.stepExpectPlaceholder")}
                          onChange={(event) =>
                            updateStep(index, { expect: event.currentTarget.value })
                          }
                        />
                      </Field>
                    ) : null}
                    <Field label={t("itops.batchRuns.stepTimeoutLabel")}>
                      <TextInput
                        type="number"
                        min={1}
                        value={step.timeoutSeconds == null ? "" : String(step.timeoutSeconds)}
                        placeholder={t("itops.batchRuns.stepTimeoutPlaceholder")}
                        onChange={(event) => {
                          const raw = event.currentTarget.value;
                          const next = raw === "" ? null : Number(raw);
                          updateStep(index, {
                            timeoutSeconds: next != null && Number.isFinite(next) ? next : null,
                          });
                        }}
                      />
                    </Field>
                  </Group>
                ))}
                <Btn sm icon="plus" onClick={() => setSteps((current) => [...current, emptyStep()])}>
                  {t("itops.batchRuns.addStep")}
                </Btn>
              </>
            )}
          </>
        ) : (
          <div className="hg-dlg-empty">{t("itops.batchRuns.noGroups")}</div>
        )}
      </Sheet>
    </DialogShell>
  );
}
