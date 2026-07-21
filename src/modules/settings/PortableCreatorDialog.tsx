import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Group,
  GRow,
  Sheet,
  Switch,
  TextInput,
} from "../../app/ui/dialog";
import {
  invokeCommand,
  openFilesystemPath,
  selectPortableDestination,
} from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { CreatedPortableCopy } from "../../types";
import { EXPORT_SEGMENTS } from "./SelectiveExportDialog";

type WizardStep = "content" | "destination" | "complete";

export function PortableCreatorDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [step, setStep] = useState<WizardStep>("content");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(EXPORT_SEGMENTS.map((segment) => [segment.id, true])),
  );
  const [destination, setDestination] = useState("");
  const [created, setCreated] = useState<CreatedPortableCopy | null>(null);
  const [busy, setBusy] = useState(false);

  const chosenSegments = EXPORT_SEGMENTS
    .filter((segment) => selected[segment.id])
    .map((segment) => segment.id);

  function setSegment(id: string, enabled: boolean) {
    setSelected((previous) => ({
      ...previous,
      [id]: enabled,
      ...(id === "connections" && enabled ? { workspaces: true } : {}),
    }));
  }

  async function chooseDestination() {
    const path = await selectPortableDestination({
      title: t("settings.portableCreatorChooseFolder"),
    });
    if (path) {
      setDestination(path);
    }
  }

  async function createCopy() {
    if (!destination || chosenSegments.length === 0 || busy) return;
    setBusy(true);
    try {
      const result = await invokeCommand("create_portable_copy", {
        request: { destination, segments: chosenSegments },
      });
      setCreated(result);
      setStep("complete");
      showStatusBarNotice(
        t("settings.portableCreatorCreatedNotice", { path: result.destination }),
        { tone: "success" },
      );
    } catch (error) {
      showStatusBarNotice(
        t("settings.portableCreatorFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { tone: "error" },
      );
    } finally {
      setBusy(false);
    }
  }

  async function launchCopy() {
    if (!created) return;
    try {
      await invokeCommand("launch_portable_copy", { destination: created.destination });
      onClose();
    } catch (error) {
      showStatusBarNotice(
        t("settings.portableCreatorLaunchFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { tone: "error" },
      );
    }
  }

  async function openCreatedFolder() {
    if (!created) return;
    try {
      await openFilesystemPath(created.destination);
    } catch (error) {
      showStatusBarNotice(
        t("settings.portableCreatorOpenFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { tone: "error" },
      );
    }
  }

  const title = step === "complete"
    ? t("settings.portableCreatorCompleteTitle")
    : t("settings.portableCreatorTitle");

  return (
    <DialogShell onBackdrop={busy ? undefined : onClose}>
      <Sheet
        width={560}
        title={title}
        footer={step === "content" ? (
          <Actions
            primary={
              <Btn
                kind="primary"
                icon="chevright"
                disabled={chosenSegments.length === 0}
                onClick={() => setStep("destination")}
              >
                {t("settings.portableCreatorNext")}
              </Btn>
            }
            cancel={<Btn onClick={onClose}>{t("common.cancel")}</Btn>}
          />
        ) : step === "destination" ? (
          <Actions
            extraLeft={<Btn onClick={() => setStep("content")}>{t("common.back")}</Btn>}
            primary={
              <Btn
                kind="primary"
                icon="copy"
                disabled={!destination || busy}
                onClick={() => void createCopy()}
              >
                {busy
                  ? t("settings.portableCreatorCreating")
                  : t("settings.portableCreatorCreate")}
              </Btn>
            }
            cancel={<Btn disabled={busy} onClick={onClose}>{t("common.cancel")}</Btn>}
          />
        ) : (
          <Actions
            extraLeft={
              <Btn icon="folder" onClick={() => void openCreatedFolder()}>
                {t("settings.portableCreatorOpenFolder")}
              </Btn>
            }
            primary={
              <Btn kind="primary" icon="send" onClick={() => void launchCopy()}>
                {t("settings.portableCreatorLaunch")}
              </Btn>
            }
            cancel={<Btn onClick={onClose}>{t("common.close")}</Btn>}
          />
        )}
      >
        {step === "content" ? (
          <>
            <p className="kk-dlg-step">{t("settings.portableCreatorStepContent")}</p>
            <p className="kk-dlg-note">{t("settings.portableCreatorIntro")}</p>
            <Group title={t("settings.portableCreatorChooseData")}>
              {EXPORT_SEGMENTS.map((segment) => (
                <GRow
                  key={segment.id}
                  icon={segment.icon}
                  label={t(`settings.segment_${segment.id}`)}
                  desc={segment.id === "connections"
                    ? t("settings.portableCreatorConnectionsDesc")
                    : t(`settings.segmentDesc_${segment.id}`)}
                  control={
                    <Switch
                      on={Boolean(selected[segment.id])}
                      disabled={segment.id === "workspaces" && Boolean(selected.connections)}
                      ariaLabel={t(`settings.segment_${segment.id}`)}
                      onChange={(enabled) => setSegment(segment.id, enabled)}
                    />
                  }
                />
              ))}
            </Group>
            <p className="kk-dlg-warn">{t("settings.portableCreatorCredentialsExcluded")}</p>
          </>
        ) : step === "destination" ? (
          <>
            <p className="kk-dlg-step">{t("settings.portableCreatorStepDestination")}</p>
            <p className="kk-dlg-note">{t("settings.portableCreatorDestinationHint")}</p>
            <Field label={t("settings.portableCreatorDestinationLabel")}>
              <div className="portable-creator-path-row">
                <TextInput mono readOnly value={destination} />
                <Btn icon="folder" onClick={() => void chooseDestination()}>
                  {t("settings.portableCreatorChooseFolder")}
                </Btn>
              </div>
            </Field>
          </>
        ) : (
          <>
            <p className="kk-dlg-note">{t("settings.portableCreatorCompleteBody")}</p>
            <Field label={t("settings.portableCreatorDestinationLabel")}>
              <TextInput mono readOnly value={created?.destination ?? ""} />
            </Field>
          </>
        )}
      </Sheet>
    </DialogShell>
  );
}
