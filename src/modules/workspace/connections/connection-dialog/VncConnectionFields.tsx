import { useTranslation } from "react-i18next";
import type { Connection, SshSettings, StoredCredentialSummary, VncSettings } from "../../../../types";
import { defaultPortForConnectionType } from "../utils";
import { PasswordCredentialSelect, PasswordField } from "./ConnectionPasswordFields";

export function VncConnectionFields({
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
            key="port-vnc"
            name="port"
            onChange={(event) => onPortDraftChange(event.currentTarget.value)}
            value={portDraft}
            inputMode="numeric"
            min="1"
            max="65535"
            type="number"
            placeholder={String(defaultPortForConnectionType("vnc", sshSettings))}
          />
        </label>
      </div>
      <div className="connection-auth-fields">
        <label>
          <span>{t("connections.user")}</span>
          <input
            key="user-vnc"
            name="user"
            defaultValue={initialConnection?.user ?? ""}
            placeholder={t("connections.optionalUsername")}
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

export function VncConnectionOptions({
  initialConnection,
  onInheritsSettingsDefaultsChange,
  vncInheritsSettingsDefaults,
  vncSettings,
}: {
  initialConnection?: Connection;
  onInheritsSettingsDefaultsChange: (inheritsSettingsDefaults: boolean) => void;
  vncInheritsSettingsDefaults: boolean;
  vncSettings: VncSettings;
}) {
  const { t } = useTranslation();

  return (
      <fieldset className="connection-session-fields connection-specific-options">
        <legend>{t("connections.vncOptions")}</legend>
        <div className="connection-specific-options-panel">
          <label className="connection-session-toggle">
            <span>{t("connections.inheritSettingsDefaults")}</span>
            <input
              name="vncInheritDefaults"
              type="checkbox"
              checked={vncInheritsSettingsDefaults}
              onChange={(event) => onInheritsSettingsDefaultsChange(event.currentTarget.checked)}
            />
          </label>
          <div className="connection-option-fields">
            <label>
              <span>{t("settings.preferredEncoding")}</span>
              <select
                disabled={vncInheritsSettingsDefaults}
                name="vncPreferredEncoding"
                defaultValue={initialConnection?.vncOptions?.preferredEncoding ?? vncSettings.preferredEncoding}
              >
                <option value="tight">{t("settings.vncEncodingTight")}</option>
                <option value="zrle">{t("settings.vncEncodingZrle")}</option>
                <option value="raw">{t("settings.vncEncodingRaw")}</option>
              </select>
            </label>
            <label>
              <span>{t("settings.colorLevel")}</span>
              <select
                disabled={vncInheritsSettingsDefaults}
                name="vncColorLevel"
                defaultValue={initialConnection?.vncOptions?.colorLevel ?? vncSettings.colorLevel}
              >
                <option value="full">{t("settings.vncColorFull")}</option>
                <option value="256">{t("settings.vncColor256")}</option>
                <option value="64">{t("settings.vncColor64")}</option>
                <option value="8">{t("settings.vncColor8")}</option>
              </select>
            </label>
          </div>
          <div className="connection-session-fields">
            <label className="connection-session-toggle">
              <span>{t("settings.vncSharedSession")}</span>
              <input
                disabled={vncInheritsSettingsDefaults}
                name="vncSharedSession"
                type="checkbox"
                defaultChecked={initialConnection?.vncOptions?.sharedSession ?? vncSettings.sharedSession}
              />
            </label>
            <label className="connection-session-toggle">
              <span>{t("settings.vncViewOnly")}</span>
              <input
                disabled={vncInheritsSettingsDefaults}
                name="vncViewOnly"
                type="checkbox"
                defaultChecked={initialConnection?.vncOptions?.viewOnly ?? vncSettings.viewOnly}
              />
            </label>
          </div>
        </div>
      </fieldset>
  );
}
