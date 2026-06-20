// Launch a Batch Run: pick a Host Group and a script body, then fan it out over
// SSH (docs/ITOPS.md Phase 2). Built from the shared dialog primitives.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Select, Sheet, TextArea } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import { useItOpsStore } from "./state";

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
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const hasGroups = hostGroups.length > 0;
  const canRun = hasGroups && groupId.length > 0 && body.trim().length > 0 && !busy;

  async function handleRun() {
    if (!canRun) {
      return;
    }
    setBusy(true);
    try {
      await startBatchRun(groupId, body);
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
            <Field label={t("itops.batchRuns.scriptLabel")} req>
              <TextArea
                value={body}
                rows={6}
                spellCheck={false}
                placeholder={t("itops.batchRuns.scriptPlaceholder")}
                onChange={(event) => setBody(event.currentTarget.value)}
              />
            </Field>
          </>
        ) : (
          <div className="hg-dlg-empty">{t("itops.batchRuns.noGroups")}</div>
        )}
      </Sheet>
    </DialogShell>
  );
}
