import { Clipboard, HardDrive, Layers, Monitor, Palette, Scaling, Settings2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  RDP_REMOTE_RESOLUTION_FIXED,
  type Connection,
  type RdpSettings,
  type SshSettings,
  type StoredCredentialSummary,
} from "../../../../types";
import { defaultPortForConnectionType } from "../utils";
import { PasswordCredentialSelect, PasswordField } from "./ConnectionPasswordFields";

export function RdpConnectionFields({
  hasStoredConnectionPassword,
  initialConnection,
  isEditMode,
  matchingPasswordCredentials,
  onPortDraftChange,
  onSelectedPasswordCredentialIdChange,
  portDraft,
  selectedPasswordCredentialId,
  sshSettings,
}: {
  hasStoredConnectionPassword: boolean;
  initialConnection?: Connection;
  isEditMode: boolean;
  matchingPasswordCredentials: StoredCredentialSummary[];
  onPortDraftChange: (port: string) => void;
  onSelectedPasswordCredentialIdChange: (credentialId: string) => void;
  portDraft: string;
  selectedPasswordCredentialId: string;
  sshSettings: SshSettings;
}) {
  const { t } = useTranslation();

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder={t("connections.connectionName")} />
      </label>
      <div className="connection-endpoint-fields">
        <label className="endpoint-host-input">
          <span>{t("connections.host")}*</span>
          <input
            name="host"
            defaultValue={initialConnection?.host ?? ""}
            placeholder={t("connections.exampleHost")}
            required
          />
        </label>
        <label className="endpoint-port-input">
          <span>{t("connections.port")}</span>
          <input
            key="port-rdp"
            name="port"
            onChange={(event) => onPortDraftChange(event.currentTarget.value)}
            value={portDraft}
            inputMode="numeric"
            min="1"
            max="65535"
            type="number"
            placeholder={String(defaultPortForConnectionType("rdp", sshSettings))}
          />
        </label>
      </div>
      <div className="connection-auth-fields">
        <label>
          <span>{`${t("connections.user")}*`}</span>
          <input
            key="user-rdp"
            name="user"
            defaultValue={initialConnection?.user ?? ""}
            placeholder={t("connections.domainAdmin")}
            required
          />
        </label>
        <PasswordField
          hasStoredSecret={isEditMode && hasStoredConnectionPassword}
          label={t("connections.password")}
          name="password"
          placeholder={isEditMode ? t("connections.leaveBlankPassword") : t("connections.storedInKeychain")}
        />
        <PasswordCredentialSelect
          credentials={matchingPasswordCredentials}
          onChange={onSelectedPasswordCredentialIdChange}
          selectedCredentialId={selectedPasswordCredentialId}
        />
      </div>
    </>
  );
}

export function RdpConnectionOptions({
  initialConnection,
  onInheritsSettingsDefaultsChange,
  rdpInheritsSettingsDefaults,
  rdpSettings,
}: {
  initialConnection?: Connection;
  onInheritsSettingsDefaultsChange: (inheritsSettingsDefaults: boolean) => void;
  rdpInheritsSettingsDefaults: boolean;
  rdpSettings: RdpSettings;
}) {
  const { t } = useTranslation();

  return (
      <fieldset className="connection-session-fields connection-specific-options">
        <legend>{t("connections.rdpOptions")}</legend>
        <div className="connection-specific-options-panel">
          <label className="connection-session-toggle">
            <Settings2 className="option-glyph" size={17} aria-hidden />
            <span>{t("connections.inheritSettingsDefaults")}</span>
            <input
              name="rdpInheritDefaults"
              type="checkbox"
              checked={rdpInheritsSettingsDefaults}
              onChange={(event) => onInheritsSettingsDefaultsChange(event.currentTarget.checked)}
            />
          </label>
          <div className="connection-option-fields">
            <label>
              <Palette className="option-glyph" size={17} aria-hidden />
              <span>{t("settings.colorDepth")}</span>
              <select
                disabled={rdpInheritsSettingsDefaults}
                name="rdpColorDepth"
                defaultValue={initialConnection?.rdpOptions?.colorDepth ?? rdpSettings.colorDepth}
              >
                <option value={32}>{t("settings.rdpColorDepth32")}</option>
                <option value={24}>{t("settings.rdpColorDepth24")}</option>
                <option value={16}>{t("settings.rdpColorDepth16")}</option>
                <option value={15}>{t("settings.rdpColorDepth15")}</option>
              </select>
            </label>
            <label>
              <Zap className="option-glyph" size={17} aria-hidden />
              <span>{t("settings.performanceFlags")}</span>
              <select
                disabled={rdpInheritsSettingsDefaults}
                name="rdpPerformanceProfile"
                defaultValue={initialConnection?.rdpOptions?.performanceProfile ?? rdpSettings.performanceProfile}
              >
                <option value="balanced">{t("settings.rdpPerformanceBalanced")}</option>
                <option value="quality">{t("settings.rdpPerformanceQuality")}</option>
                <option value="speed">{t("settings.rdpPerformanceSpeed")}</option>
              </select>
            </label>
            <label>
              <Scaling className="option-glyph" size={17} aria-hidden />
              <span>{t("settings.remoteDesktopViewMode")}</span>
              <select
                disabled={rdpInheritsSettingsDefaults}
                name="rdpViewMode"
                defaultValue={initialConnection?.rdpOptions?.viewMode ?? rdpSettings.viewMode}
              >
                <option value="fit">{t("settings.remoteDesktopViewModeFit")}</option>
                <option value="stretch">{t("settings.remoteDesktopViewModeStretch")}</option>
                <option value="actualSize">{t("settings.remoteDesktopViewModeActualSize")}</option>
                <option value="fitWidth">{t("settings.remoteDesktopViewModeFitWidth")}</option>
                <option value="fitHeight">{t("settings.remoteDesktopViewModeFitHeight")}</option>
              </select>
            </label>
            <label>
              <Monitor className="option-glyph" size={17} aria-hidden />
              <span>{t("settings.rdpRemoteResolution")}</span>
              <select
                disabled={rdpInheritsSettingsDefaults}
                name="rdpRemoteResolution"
                defaultValue={initialConnection?.rdpOptions?.remoteResolution ?? rdpSettings.remoteResolution}
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
          <div className="connection-session-fields">
            <label className="connection-session-toggle">
              <Clipboard className="option-glyph" size={17} aria-hidden />
              <span>{t("settings.rdpRedirectClipboard")}</span>
              <input
                disabled={rdpInheritsSettingsDefaults}
                name="rdpRedirectClipboard"
                type="checkbox"
                defaultChecked={initialConnection?.rdpOptions?.redirectClipboard ?? rdpSettings.redirectClipboard}
              />
            </label>
            <label className="connection-session-toggle">
              <HardDrive className="option-glyph" size={17} aria-hidden />
              <span>{t("settings.rdpRedirectDrives")}</span>
              <input
                disabled={rdpInheritsSettingsDefaults}
                name="rdpRedirectDrives"
                type="checkbox"
                defaultChecked={initialConnection?.rdpOptions?.redirectDrives ?? rdpSettings.redirectDrives}
              />
            </label>
            <label className="connection-session-toggle">
              <Layers className="option-glyph" size={17} aria-hidden />
              <span>{t("settings.bitmapCache")}</span>
              <input
                disabled={rdpInheritsSettingsDefaults}
                name="rdpBitmapCache"
                type="checkbox"
                defaultChecked={initialConnection?.rdpOptions?.bitmapCache ?? rdpSettings.bitmapCache}
              />
            </label>
          </div>
        </div>
      </fieldset>
  );
}
