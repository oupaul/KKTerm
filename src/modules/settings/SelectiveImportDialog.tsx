import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Group,
  GRow,
  Select,
  Sheet,
  TextInput,
  type DialogIconName,
} from "../../app/ui/dialog";
import { useDashboardStore } from "../dashboard/state/dashboardStore";
import { invokeCommand, selectSelectiveImportFile } from "../../lib/tauri";
import type { SelectiveManifest } from "../../types";
import { useWorkspaceStore } from "../../store";

const SEGMENT_ICONS: Record<string, DialogIconName> = {
  connections: "server",
  workspaces: "package",
  dashboards: "dashboard",
  settings: "gear",
  mcpServers: "cloud",
};

type SegmentAction = "skip" | "add" | "replace";

export function SelectiveImportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((s) => s.showStatusBarNotice);
  const closeAllTabs = useWorkspaceStore((s) => s.closeAllTabs);
  const loadDashboard = useDashboardStore((s) => s.load);
  const [path, setPath] = useState<string | null>(null);
  const [manifest, setManifest] = useState<SelectiveManifest | null>(null);
  const [actions, setActions] = useState<Record<string, SegmentAction>>({});
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleChooseFile() {
    setBusy(true);
    try {
      const chosen = await selectSelectiveImportFile({
        title: t("settings.selectiveImport"),
        filterName: t("settings.selectiveBackupFilter"),
      });
      if (!chosen) {
        setBusy(false);
        return;
      }
      const inspected = await invokeCommand("inspect_selective_database", { path: chosen });
      const initial: Record<string, SegmentAction> = {};
      for (const segment of inspected.segments) {
        initial[segment] = "add";
      }
      if (inspected.encrypted) {
        initial.credentials = "add";
      }
      setPath(chosen);
      setManifest(inspected);
      setActions(initial);
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
    setBusy(false);
  }

  async function handleImport() {
    if (!path || !manifest || busy) return;
    setBusy(true);
    try {
      const result = await invokeCommand("import_selective_database", {
        path,
        actions,
        passphrase: manifest.encrypted ? passphrase : null,
      });
      const importedSettings = result.applied.includes("settings");
      const importedConnections = result.applied.includes("connections");
      if (importedConnections) {
        window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      }
      if (result.applied.includes("dashboards")) {
        await loadDashboard();
      }
      showStatusBarNotice(t("settings.selectiveImportComplete", { count: result.applied.length }), {
        tone: "success",
      });
      onClose();
      // Settings rows feed many in-memory stores; a reload is the safe way to
      // re-read them all, mirroring the full settings import.
      if (importedSettings) {
        closeAllTabs();
        window.setTimeout(() => window.location.reload(), 250);
      }
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
      setBusy(false);
    }
  }

  const actionOptions = [
    { value: "skip", label: t("settings.importActionSkip") },
    { value: "add", label: t("settings.importActionAdd") },
    { value: "replace", label: t("settings.importActionReplace") },
  ];
  const passphraseNeeded = Boolean(manifest?.encrypted) && actions.credentials !== "skip";
  const canImport = Boolean(manifest) && !busy && (!passphraseNeeded || passphrase.length > 0);

  return (
    <DialogShell onBackdrop={onClose}>
      <Sheet
        width={540}
        title={t("settings.selectiveImport")}
        footer={
          <Actions
            primary={
              <Btn
                kind="primary"
                icon="upload"
                onClick={() => void handleImport()}
                disabled={!canImport}
              >
                {t("settings.selectiveImport")}
              </Btn>
            }
            cancel={<Btn onClick={onClose}>{t("common.cancel")}</Btn>}
          />
        }
      >
        {!manifest ? (
          <Field label={t("settings.selectiveImportFileHint")}>
            <Btn icon="folder" onClick={() => void handleChooseFile()} disabled={busy}>
              {t("settings.selectiveImportChooseFile")}
            </Btn>
          </Field>
        ) : (
          <>
            <Group title={t("settings.selectiveImportActionsHint")}>
              {manifest.segments.map((segment) => (
                <GRow
                  key={segment}
                  icon={SEGMENT_ICONS[segment] ?? "package"}
                  label={t(`settings.segment_${segment}`)}
                  control={
                    <Select
                      options={actionOptions}
                      value={actions[segment] ?? "add"}
                      onChange={(event) =>
                        setActions((prev) => ({ ...prev, [segment]: event.currentTarget.value as SegmentAction }))
                      }
                    />
                  }
                />
              ))}
              {manifest.encrypted && (
                <GRow
                  icon="key"
                  label={t("settings.segment_credentials")}
                  desc={t("settings.includeCredentialsHint")}
                  control={
                    <Select
                      options={actionOptions}
                      value={actions.credentials ?? "add"}
                      onChange={(event) =>
                        setActions((prev) => ({ ...prev, credentials: event.currentTarget.value as SegmentAction }))
                      }
                    />
                  }
                />
              )}
            </Group>
            {passphraseNeeded && (
              <Field label={t("settings.importPassphrase")} req>
                <TextInput
                  type="password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.currentTarget.value)}
                />
              </Field>
            )}
            <p className="kk-dlg-warn">{t("settings.selectiveImportWarning")}</p>
          </>
        )}
      </Sheet>
    </DialogShell>
  );
}
