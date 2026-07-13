import { Monitor } from "../../lib/reicon";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { isWindowsPlatform } from "../../lib/platform";
import { useWorkspaceStore } from "../../store";
import {
  RDP_REMOTE_RESOLUTION_FIXED,
  type RdpColorDepth,
  type RdpPerformanceProfile,
  type RemoteDesktopViewMode,
  type RdpRemoteResolution,
  type RdpSettings as RdpSettingsModel,
} from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";
import { RdpLocalResourceSelector } from "../workspace/connections/remote-desktop/RdpLocalResourceSelector";

export function RdpSettings() {
  const { t } = useTranslation();
  const rdpSettings = useWorkspaceStore((state) => state.rdpSettings);
  const setRdpSettings = useWorkspaceStore((state) => state.setRdpSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<RdpSettingsModel>(() => normalizeRdpResolutionSettings(rdpSettings));
  const usesWindowsDriveMapping = isWindowsPlatform();
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(rdpSettings);

  useEffect(() => {
    setDraft(normalizeRdpResolutionSettings(rdpSettings));
  }, [rdpSettings]);

  async function handleSave() {
    if (!usesWindowsDriveMapping && draft.redirectDrives && !draft.sharedLocalFolder?.trim()) {
      showStatusBarNotice(t("settings.rdpSharedFolderRequired"), { tone: "error" });
      return;
    }
    try {
      const saved = isTauriRuntime()
        ? await invokeCommand("update_rdp_settings", { request: draft })
        : draft;
      setRdpSettings(saved);
      setDraft(saved);
      showStatusBarNotice(t("settings.rdpSettingsSaved"), { tone: "success" });
    } catch (saveError) {
      showStatusBarNotice(saveError instanceof Error ? saveError.message : String(saveError), { tone: "error" });
    }
  }

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<Monitor size={18} />}
        label={t("settings.sectionRdp")}
        title={t("settings.qualityDefaults")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.display")}</legend>
        <div className="form-grid two-columns">
          <label data-tutorial-id="settings.rdpColorDepth">
            <span>{t("settings.colorDepth")}</span>
            <select
              value={draft.colorDepth}
              onChange={(event) => {
                const colorDepth = Number(event.currentTarget.value) as RdpColorDepth;
                setDraft((settings) => ({
                  ...settings,
                  colorDepth,
                }));
              }}
            >
              <option value={32}>{t("settings.rdpColorDepth32")}</option>
              <option value={24}>{t("settings.rdpColorDepth24")}</option>
              <option value={16}>{t("settings.rdpColorDepth16")}</option>
              <option value={15}>{t("settings.rdpColorDepth15")}</option>
            </select>
          </label>
          <label data-tutorial-id="settings.rdpPerformanceProfile">
            <span>{t("settings.performanceFlags")}</span>
            <select
              value={draft.performanceProfile}
              onChange={(event) => {
                const performanceProfile = event.currentTarget.value as RdpPerformanceProfile;
                setDraft((settings) => ({
                  ...settings,
                  performanceProfile,
                }));
              }}
            >
              <option value="balanced">{t("settings.rdpPerformanceBalanced")}</option>
              <option value="quality">{t("settings.rdpPerformanceQuality")}</option>
              <option value="speed">{t("settings.rdpPerformanceSpeed")}</option>
            </select>
          </label>
          <label>
            <span>{t("settings.remoteDesktopViewMode")}</span>
            <select
              value={draft.viewMode}
              onChange={(event) =>
                setDraft((settings) => ({
                  ...settings,
                  viewMode: event.currentTarget.value as RemoteDesktopViewMode,
                }))
              }
            >
              <option value="fit">{t("settings.remoteDesktopViewModeFit")}</option>
              <option value="stretch">{t("settings.remoteDesktopViewModeStretch")}</option>
              <option value="actualSize">{t("settings.remoteDesktopViewModeActualSize")}</option>
              <option value="fitWidth">{t("settings.remoteDesktopViewModeFitWidth")}</option>
              <option value="fitHeight">{t("settings.remoteDesktopViewModeFitHeight")}</option>
            </select>
          </label>
          <label data-tutorial-id="settings.rdpRemoteResolution">
            <span>{t("settings.rdpRemoteResolution")}</span>
            <select
              value={draft.remoteResolution}
              onChange={(event) => {
                const remoteResolution = event.currentTarget.value as RdpRemoteResolution;
                setDraft((settings) => ({
                  ...settings,
                  remoteResolution,
                }));
              }}
            >
              <option value="automatic">{t("settings.rdpRemoteResolutionAutomatic")}</option>
              {RDP_REMOTE_RESOLUTION_FIXED.map((value) => (
                <option key={value} value={value}>
                  {value.replace("x", "×")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.networkPerformance")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.redirectClipboard}
              onChange={(checked) => setDraft((settings) => ({ ...settings, redirectClipboard: checked }))}
            />
            <span>
              <strong>{t("settings.rdpRedirectClipboard")}</strong>
              <small>{t("settings.rdpRedirectClipboardHint")}</small>
            </span>
          </label>
          <div className="settings-rdp-local-resource">
            <label className="settings-toggle-row">
              <ToggleSwitch
                checked={draft.redirectDrives}
                onChange={(checked) => setDraft((settings) => ({ ...settings, redirectDrives: checked }))}
              />
              <span>
                <strong>
                  {t(usesWindowsDriveMapping ? "settings.rdpRedirectDrives" : "settings.rdpShareLocalFolder")}
                </strong>
                <small>
                  {t(usesWindowsDriveMapping ? "settings.rdpRedirectDrivesHint" : "settings.rdpShareLocalFolderHint")}
                </small>
              </span>
            </label>
            {draft.redirectDrives ? (
              <RdpLocalResourceSelector
                driveSelection={draft.driveSelection}
                sharedLocalFolder={draft.sharedLocalFolder}
                onDriveSelectionChange={(driveSelection) =>
                  setDraft((settings) => ({ ...settings, driveSelection }))
                }
                onSharedLocalFolderChange={(sharedLocalFolder) =>
                  setDraft((settings) => ({ ...settings, sharedLocalFolder }))
                }
              />
            ) : null}
          </div>
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.bitmapCache}
              onChange={(checked) => setDraft((settings) => ({ ...settings, bitmapCache: checked }))}
            />
            <span>
              <strong>{t("settings.bitmapCache")}</strong>
              <small>{t("settings.rdpBitmapCacheHint")}</small>
            </span>
          </label>
        </div>
      </fieldset>
    </section>
  );
}

function normalizeRdpResolutionSettings(settings: RdpSettingsModel): RdpSettingsModel {
  if (isVisibleRdpRemoteResolution(settings.remoteResolution)) {
    return settings;
  }
  return {
    ...settings,
    remoteResolution: "automatic",
  };
}

function isVisibleRdpRemoteResolution(value: string): value is RdpRemoteResolution {
  return value === "automatic" || RDP_REMOTE_RESOLUTION_FIXED.includes(value as never);
}
