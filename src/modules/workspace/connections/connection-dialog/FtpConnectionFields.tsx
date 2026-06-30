import {
  Activity,
  ArrowLeftRight,
  Eye,
  FileType,
  Fingerprint,
  KeyRound,
  Lock,
  LockKeyhole,
  Network,
  ShieldOff,
  Timer,
  Type,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import type { Connection, SshSettings, StoredCredentialSummary } from "../../../../types";
import { defaultPortForConnectionType } from "../utils";
import { PasswordCredentialSelect, PasswordField } from "./ConnectionPasswordFields";

export function FtpConnectionFields({
  authMethod,
  hasStoredConnectionPassword,
  hasStoredConnectionPassphrase,
  initialConnection,
  isEditMode,
  keyPassphraseDraft,
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
  ftpProtocol,
  sshSettings,
}: {
  authMethod: "keyFile" | "password" | "agent";
  hasStoredConnectionPassword: boolean;
  hasStoredConnectionPassphrase: boolean;
  initialConnection?: Connection;
  isEditMode: boolean;
  keyPassphraseDraft: string;
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
  ftpProtocol: "ftp" | "ftps" | "sftp";
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
            {...technicalInputProps}
            defaultValue={initialConnection?.host ?? ""}
            placeholder={t("connections.exampleHost")}
            required
          />
        </label>
        <label className="endpoint-port-input">
          <span>{t("connections.port")}</span>
          <input
            key="port-ftp"
            name="port"
            onChange={(event) => onPortDraftChange(event.currentTarget.value)}
            value={portDraft}
            inputMode="numeric"
            min="1"
            max="65535"
            type="number"
            placeholder={String(defaultPortForConnectionType("ftp", sshSettings))}
          />
        </label>
      </div>
      <div className="connection-auth-fields">
        <label>
          <span>{`${t("connections.user")}*`}</span>
          <input
            key="user-ftp"
            name="user"
            {...technicalInputProps}
            defaultValue={initialConnection?.user ?? ""}
            placeholder={t("connections.admin")}
            required
          />
        </label>
        {ftpProtocol === "sftp" ? (
          <div className="auth-mode-row">
            <span id="ftp-sftp-auth-method-label">{t("connections.auth")}*</span>
            <input name="authMethod" type="hidden" value={authMethod} />
            <div
              className="auth-method-selector"
              data-auth-method={authMethod}
              role="tablist"
              aria-label={t("connections.auth")}
              aria-labelledby="ftp-sftp-auth-method-label"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMethod === "keyFile"}
                className={authMethod === "keyFile" ? "active" : ""}
                onClick={() => onAuthMethodChange("keyFile")}
              >
                <KeyRound size={15} aria-hidden />
                <span>{t("connections.keyFile")}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMethod === "password"}
                className={authMethod === "password" ? "active" : ""}
                onClick={() => onAuthMethodChange("password")}
              >
                <LockKeyhole size={15} aria-hidden />
                <span>{t("connections.password")}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMethod === "agent"}
                className={authMethod === "agent" ? "active" : ""}
                onClick={() => onAuthMethodChange("agent")}
              >
                <Fingerprint size={15} aria-hidden />
                <span>{t("connections.sshAgent")}</span>
              </button>
            </div>
          </div>
        ) : null}
        {ftpProtocol === "sftp" && authMethod === "keyFile" ? (
          <>
            <label>
              <span>{t("connections.keyPath")}</span>
              <div className="input-with-button ssh-key-input-actions">
                <input
                  name="keyPath"
                  {...technicalInputProps}
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
            <PasswordField
              hasStoredSecret={isEditMode && hasStoredConnectionPassphrase}
              initialValue={keyPassphraseDraft}
              label={t("connections.keyPassphraseOptional")}
              name="keyPassphrase"
              placeholder={isEditMode ? t("connections.leaveBlankPassphrase") : t("connections.keyPassphraseHint")}
            />
          </>
        ) : ftpProtocol !== "sftp" || authMethod === "password" ? (
          <>
            <PasswordField
              hasStoredSecret={isEditMode && hasStoredConnectionPassword}
              label={ftpProtocol === "sftp" ? t("connections.passwordLabel") : t("connections.password")}
              name="password"
              placeholder={isEditMode ? t("connections.leaveBlankPassword") : t("connections.storedInKeychain")}
            />
            <PasswordCredentialSelect
              credentials={matchingPasswordCredentials}
              onChange={onSelectedPasswordCredentialIdChange}
              selectedCredentialId={selectedPasswordCredentialId}
            />
          </>
        ) : null}
      </div>
    </>
  );
}

export function FtpConnectionOptions({
  ftpProtocol,
  initialConnection,
  onFtpProtocolChange,
}: {
  ftpProtocol: "ftp" | "ftps" | "sftp";
  initialConnection?: Connection;
  onFtpProtocolChange: (protocol: "ftp" | "ftps" | "sftp") => void;
}) {
  const { t } = useTranslation();

  return (
      <fieldset className="connection-session-fields connection-specific-options">
        <legend>{t("connections.ftpOptions")}</legend>
        <div className="connection-specific-options-panel">
          <div className="connection-option-fields">
            <div className="ftp-protocol-row">
              <Network className="option-glyph" size={17} aria-hidden />
              <span id="ftp-protocol-label">{t("connections.ftpProtocol")}</span>
              <input name="ftpProtocol" type="hidden" value={ftpProtocol} />
              <div
                className="ftp-protocol-selector"
                data-ftp-protocol={ftpProtocol}
                role="tablist"
                aria-label={t("connections.ftpProtocol")}
                aria-labelledby="ftp-protocol-label"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={ftpProtocol === "sftp"}
                  className={ftpProtocol === "sftp" ? "active" : ""}
                  onClick={() => onFtpProtocolChange("sftp")}
                >
                  <span>{t("connections.ftpProtocolSftp")}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={ftpProtocol === "ftps"}
                  className={ftpProtocol === "ftps" ? "active" : ""}
                  onClick={() => onFtpProtocolChange("ftps")}
                >
                  <span>{t("connections.ftpProtocolFtps")}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={ftpProtocol === "ftp"}
                  className={ftpProtocol === "ftp" ? "active" : ""}
                  onClick={() => onFtpProtocolChange("ftp")}
                >
                  <span>{t("connections.ftpProtocolFtp")}</span>
                </button>
              </div>
            </div>
            <label>
              <ArrowLeftRight className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpMode")}</span>
              <select name="ftpMode" defaultValue={initialConnection?.ftpOptions?.mode ?? "passive"}>
                <option value="passive">{t("connections.ftpModePassive")}</option>
                <option value="active">{t("connections.ftpModeActive")}</option>
              </select>
            </label>
            <label>
              <Lock className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpTlsMode")}</span>
              <select name="ftpTlsMode" defaultValue={initialConnection?.ftpOptions?.tlsMode ?? "explicit"}>
                <option value="explicit">{t("connections.ftpTlsExplicit")}</option>
                <option value="implicit">{t("connections.ftpTlsImplicit")}</option>
              </select>
            </label>
            <label>
              <FileType className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpTransferType")}</span>
              <select name="ftpTransferType" defaultValue={initialConnection?.ftpOptions?.transferType ?? "binary"}>
                <option value="binary">{t("connections.ftpTransferBinary")}</option>
                <option value="ascii">{t("connections.ftpTransferAscii")}</option>
              </select>
            </label>
            <label>
              <Timer className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpConnectTimeoutSecs")}</span>
              <input
                name="ftpConnectTimeoutSecs"
                defaultValue={initialConnection?.ftpOptions?.connectTimeoutSecs ?? 30}
                inputMode="numeric"
                min="1"
                max="600"
                type="number"
              />
            </label>
            <label>
              <Activity className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpKeepaliveSecs")}</span>
              <input
                name="ftpKeepaliveSecs"
                defaultValue={initialConnection?.ftpOptions?.keepaliveSecs ?? 0}
                inputMode="numeric"
                min="0"
                max="3600"
                type="number"
                placeholder="0"
              />
            </label>
          </div>
          <div className="connection-session-fields">
            <label className="connection-session-toggle">
              <Type className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpUtf8")}</span>
              <input name="ftpUtf8" type="checkbox" defaultChecked={initialConnection?.ftpOptions?.utf8 ?? true} />
            </label>
            <label className="connection-session-toggle">
              <Eye className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpShowHidden")}</span>
              <input
                name="ftpShowHidden"
                type="checkbox"
                defaultChecked={initialConnection?.ftpOptions?.showHidden ?? false}
              />
            </label>
            <label className="connection-session-toggle">
              <ShieldOff className="option-glyph" size={17} aria-hidden />
              <span>{t("connections.ftpIgnoreCertErrors")}</span>
              <input
                name="ftpIgnoreCertErrors"
                type="checkbox"
                defaultChecked={initialConnection?.ftpOptions?.ignoreCertErrors ?? false}
              />
            </label>
          </div>
        </div>
      </fieldset>
  );
}
