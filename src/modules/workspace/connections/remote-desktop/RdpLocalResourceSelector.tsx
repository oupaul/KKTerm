import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, GRow, Group, Sheet } from "../../../../app/ui/dialog";
import { currentPlatform, isWindowsPlatform } from "../../../../lib/platform";
import {
  invokeCommand,
  isTauriRuntime,
  selectRdpSharedFolder,
  type LocalDrivePlace,
} from "../../../../lib/tauri";
import type { RdpDriveSelection } from "../../../../types";
import { normalizeRdpDrive, normalizeRdpDriveSelection, rdpDriveSelectionSummary } from "./rdpLocalResources";
import "./rdpLocalResources.css";

export function RdpLocalResourceSelector({
  disabled,
  driveSelection,
  sharedLocalFolder,
  onDriveSelectionChange,
  onSharedLocalFolderChange,
}: {
  disabled?: boolean;
  driveSelection: RdpDriveSelection;
  sharedLocalFolder?: string;
  onDriveSelectionChange: (selection: RdpDriveSelection) => void;
  onSharedLocalFolderChange: (path: string) => void;
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const normalizedSelection = normalizeRdpDriveSelection(driveSelection);

  if (!isWindowsPlatform()) {
    if (currentPlatform() === "unknown") {
      return null;
    }
    return (
      <div className="rdp-local-resource-summary">
        <span className={sharedLocalFolder ? "" : "empty"} title={sharedLocalFolder || undefined}>
          {sharedLocalFolder || t("settings.rdpNoFolderSelected")}
        </span>
        <button
          className="secondary-button"
          disabled={disabled}
          onClick={() => {
            void selectRdpSharedFolder({
              defaultPath: sharedLocalFolder,
              title: t("settings.rdpChooseSharedFolderTitle"),
            }).then((path) => {
              if (path) {
                onSharedLocalFolderChange(path);
              }
            }).catch(() => undefined);
          }}
          type="button"
        >
          {t("settings.rdpChooseFolder")}
        </button>
      </div>
    );
  }

  const selectedSummary = rdpDriveSelectionSummary(normalizedSelection);
  const summary = normalizedSelection.mode === "all"
    ? t("settings.rdpAllLocalDrives")
    : selectedSummary || t("settings.rdpNoLocalDrives");
  return (
    <>
      <div className="rdp-local-resource-summary">
        <span>{summary}</span>
        <button
          className="secondary-button"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
          type="button"
        >
          {t("settings.rdpChooseDrives")}
        </button>
      </div>
      {pickerOpen ? (
        <RdpDrivePickerSheet
          selection={normalizedSelection}
          onCancel={() => setPickerOpen(false)}
          onSave={(selection) => {
            onDriveSelectionChange(selection);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function RdpDrivePickerSheet({
  selection,
  onCancel,
  onSave,
}: {
  selection: RdpDriveSelection;
  onCancel: () => void;
  onSave: (selection: RdpDriveSelection) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<RdpDriveSelection>(() => normalizeRdpDriveSelection(selection));
  const [selectedDrives, setSelectedDrives] = useState(() => {
    const normalized = normalizeRdpDriveSelection(selection);
    return normalized.mode === "selected" ? normalized.drives : [];
  });
  const [availableDrives, setAvailableDrives] = useState<LocalDrivePlace[]>([]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    let disposed = false;
    void invokeCommand("list_local_places")
      .then((places) => {
        if (!disposed) {
          setAvailableDrives(places.drives);
        }
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  const driveRows = useMemo(() => {
    const available = new Map<string, LocalDrivePlace>();
    for (const drive of availableDrives) {
      const id = normalizeRdpDrive(drive.path);
      if (id) {
        available.set(id, drive);
      }
    }
    const saved = draft.mode === "selected" ? draft.drives : [];
    return Array.from(new Set([...available.keys(), ...saved])).sort().map((id) => ({
      id,
      available: available.has(id),
    }));
  }, [availableDrives, draft]);

  const selected = draft.mode === "selected" ? new Set(draft.drives) : new Set<string>();
  const saveDisabled = draft.mode === "selected" && draft.drives.length === 0;

  return (
    <DialogShell onBackdrop={onCancel}>
      <Sheet
        title={t("settings.rdpChooseDrivesTitle")}
        width={440}
        footer={
          <Actions
            cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" icon="check" disabled={saveDisabled} onClick={() => onSave(draft)}>
                {t("common.save")}
              </Btn>
            }
          />
        }
      >
        <Group>
          <GRow
            label={t("settings.rdpAllLocalDrives")}
            control={
              <input
                aria-label={t("settings.rdpAllLocalDrives")}
                checked={draft.mode === "all"}
                name="rdp-drive-mode"
                onChange={() => setDraft({ mode: "all" })}
                type="radio"
              />
            }
          />
          <GRow
            label={t("settings.rdpSelectedDrives")}
            control={
              <input
                aria-label={t("settings.rdpSelectedDrives")}
                checked={draft.mode === "selected"}
                name="rdp-drive-mode"
                onChange={() => setDraft({ mode: "selected", drives: selectedDrives })}
                type="radio"
              />
            }
          />
        </Group>
        {draft.mode === "selected" ? (
          <Group title={t("settings.rdpSelectedDrives")}>
            {driveRows.length > 0 ? driveRows.map((drive) => (
              <GRow
                key={drive.id}
                label={drive.available ? drive.id : t("settings.rdpUnavailableDrive", { drive: drive.id })}
                control={
                  <input
                    aria-label={drive.id}
                    checked={selected.has(drive.id)}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.currentTarget.checked) {
                        next.add(drive.id);
                      } else {
                        next.delete(drive.id);
                      }
                      const drives = Array.from(next).sort();
                      setSelectedDrives(drives);
                      setDraft({ mode: "selected", drives });
                    }}
                    type="checkbox"
                  />
                }
              />
            )) : <p className="rdp-drive-empty">{t("settings.rdpNoLocalDrives")}</p>}
          </Group>
        ) : null}
      </Sheet>
    </DialogShell>
  );
}
