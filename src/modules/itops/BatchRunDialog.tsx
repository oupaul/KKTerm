// Launch a Batch Run: pick a Host Group, then either a one-shot script body or
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
import type { BatchTask, PlaybookStep } from "../../types";
import { useWorkspaceStore } from "../../store";
import { useItOpsStore } from "./state";

type TaskMode = "script" | "playbook";

function emptyStep(): PlaybookStep {
  return { name: "", send: "", expect: "", timeoutSeconds: null };
}

export function BatchRunDialog({
  defaultGroupId,
  onClose,
  onStarted,
}: {
  defaultGroupId?: string | null;
  onClose: () => void;
  onStarted: () => void;
}) {
  const { t } = useTranslation();
  const hostGroups = useItOpsStore((state) => state.hostGroups);
  const startBatchRun = useItOpsStore((state) => state.startBatchRun);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);

  const [groupId, setGroupId] = useState(defaultGroupId ?? hostGroups[0]?.id ?? "");
  const [mode, setMode] = useState<TaskMode>("script");
  const [body, setBody] = useState("");
  const [playbookName, setPlaybookName] = useState("");
  const [steps, setSteps] = useState<PlaybookStep[]>([emptyStep()]);
  const [busy, setBusy] = useState(false);

  const hasGroups = hostGroups.length > 0;
  // Drop only fully-blank steps. A step with an empty `send` but a set `expect`
  // is valid (e.g. wait for the initial prompt before the first command).
  const filledSteps = steps.filter(
    (step) => step.send.trim().length > 0 || (step.expect ?? "").trim().length > 0,
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

  function buildTask(): BatchTask {
    if (mode === "script") {
      return { kind: "script", body };
    }
    return {
      kind: "playbook",
      name: playbookName.trim(),
      steps: filledSteps.map((step) => ({
        name: step.name.trim(),
        send: step.send,
        expect: step.expect && step.expect.trim().length > 0 ? step.expect : null,
        timeoutSeconds: step.timeoutSeconds ?? null,
      })),
    };
  }

  async function handleRun() {
    if (!canRun) {
      return;
    }
    setBusy(true);
    try {
      await startBatchRun(groupId, buildTask());
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
            <Field label={t("itops.batchRuns.hostGroupLabel")} req>
              <Select
                value={groupId}
                onChange={(event) => setGroupId(event.currentTarget.value)}
                options={hostGroups.map((group) => ({ value: group.id, label: group.name }))}
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
                    <Field label={t("itops.batchRuns.stepSendLabel")} req>
                      <TextInput
                        value={step.send}
                        mono
                        spellCheck={false}
                        placeholder={t("itops.batchRuns.stepSendPlaceholder")}
                        onChange={(event) => updateStep(index, { send: event.currentTarget.value })}
                      />
                    </Field>
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
