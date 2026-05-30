import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Connection, SshSettings, StoredCredentialSummary } from "../../../../types";
import { defaultPortForConnectionType } from "../utils";
import { PasswordCredentialSelect, PasswordField } from "./ConnectionPasswordFields";

export function SshConnectionFields({
  authMethod,
  hasStoredConnectionPassword,
  initialConnection,
  isEditMode,
  keyPath,
  matchingPasswordCredentials,
  onAuthMethodChange,
  onBrowseKeyFile,
  onKeyPathChange,
  onOpenKeyEmailDialog,
  onPortDraftChange,
  onSelectedPasswordCredentialIdChange,
  portDraft,
  selectedPasswordCredentialId,
  sshSettings,
}: {
  authMethod: "keyFile" | "password" | "agent";
  hasStoredConnectionPassword: boolean;
  initialConnection?: Connection;
  isEditMode: boolean;
  keyPath: string;
  matchingPasswordCredentials: StoredCredentialSummary[];
  onAuthMethodChange: (authMethod: "keyFile" | "password" | "agent") => void;
  onBrowseKeyFile: () => void;
  onKeyPathChange: (keyPath: string) => void;
  onOpenKeyEmailDialog: () => void;
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
            key="port-ssh"
            name="port"
            onChange={(event) => onPortDraftChange(event.currentTarget.value)}
            value={portDraft}
            inputMode="numeric"
            min="1"
            max="65535"
            type="number"
            placeholder={String(defaultPortForConnectionType("ssh", sshSettings))}
          />
        </label>
        <label className="proxy-jump-input">
          <span>{t("connections.proxyJumpOptional")}</span>
          <input
            name="proxyJump"
            defaultValue={initialConnection?.proxyJump ?? sshSettings.defaultProxyJump ?? ""}
            placeholder={t("connections.jumpInternal")}
          />
        </label>
      </div>

      <div className="connection-auth-fields">
        <label className="auth-user-input">
          <span>{`${t("connections.user")}*`}</span>
          <input
            key="user-ssh"
            name="user"
            defaultValue={initialConnection?.user ?? sshSettings.defaultUser}
            placeholder={t("connections.admin")}
            required
          />
        </label>
        <label className="auth-mode-row">
          <span>{t("connections.auth")}*</span>
          <select
            name="authMethod"
            value={authMethod}
            required
            onChange={(event) => onAuthMethodChange(event.currentTarget.value as "keyFile" | "password" | "agent")}
          >
            <option value="keyFile">{t("connections.keyFile")}</option>
            <option value="password">{t("connections.password")}</option>
            <option value="agent">{t("connections.sshAgent")}</option>
          </select>
        </label>
        {authMethod === "password" ? (
          <>
            <PasswordField
              hasStoredSecret={isEditMode && hasStoredConnectionPassword}
              label={`${t("connections.passwordLabel")}*`}
              name="password"
              placeholder={isEditMode ? t("connections.leaveBlankPassword") : t("connections.storedInKeychain")}
              required={!isEditMode && !selectedPasswordCredentialId}
            />
            <PasswordCredentialSelect
              credentials={matchingPasswordCredentials}
              onChange={onSelectedPasswordCredentialIdChange}
              selectedCredentialId={selectedPasswordCredentialId}
            />
          </>
        ) : authMethod === "keyFile" ? (
          <label>
            <span>{t("connections.keyPath")}</span>
            <div className="input-with-button ssh-key-input-actions">
              <input
                name="keyPath"
                onChange={(event) => onKeyPathChange(event.currentTarget.value)}
                placeholder={t("connections.keyPathExample")}
                value={keyPath}
              />
              <button className="toolbar-button" onClick={onBrowseKeyFile} type="button">
                {t("connections.browse")}
              </button>
              <button className="toolbar-button" onClick={onOpenKeyEmailDialog} type="button">
                <KeyRound size={15} />
                {t("settings.generateSshKey")}
              </button>
            </div>
          </label>
        ) : null}
      </div>
      <div className="connection-session-fields">
        <label className="connection-session-toggle">
          <span>{t("connections.useTmux")}</span>
          <input
            name="useTmuxSessions"
            type="checkbox"
            defaultChecked={initialConnection?.useTmuxSessions ?? true}
          />
        </label>
      </div>
    </>
  );
}
