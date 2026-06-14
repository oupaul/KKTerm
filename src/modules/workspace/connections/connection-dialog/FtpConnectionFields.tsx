import { Activity, ArrowLeftRight, Eye, FileType, Lock, Network, ShieldOff, Timer, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import type { Connection, SshSettings, StoredCredentialSummary } from "../../../../types";
import { defaultPortForConnectionType } from "../utils";
import { PasswordCredentialSelect, PasswordField } from "./ConnectionPasswordFields";

export function FtpConnectionFields({
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
