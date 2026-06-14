import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import type { Connection } from "../../../../types";
import { PasswordField } from "./ConnectionPasswordFields";

export function UrlConnectionFields({
  hasStoredUrlPassword,
  initialConnection,
  isEditMode,
}: {
  hasStoredUrlPassword: boolean;
  initialConnection?: Connection;
  isEditMode: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder={t("connections.connectionName")} />
      </label>
      <div className="connection-endpoint-fields">
        <label className="endpoint-wide-input">
          <span>{t("connections.url")}*</span>
          <input
            name="url"
            {...technicalInputProps}
            defaultValue={initialConnection?.url ?? ""}
            placeholder={t("connections.urlPlaceholder")}
            required
          />
        </label>
      </div>
      <div className="connection-auth-fields">
        <label>
          <span>{t("connections.credentialUser")}</span>
          <input
            name="urlCredentialUsername"
            {...technicalInputProps}
            defaultValue={initialConnection?.urlCredentialUsername ?? ""}
            placeholder={t("connections.optionalUsername")}
          />
        </label>
        <PasswordField
          hasStoredSecret={isEditMode && hasStoredUrlPassword}
          label={t("connections.password")}
          name="urlPassword"
          placeholder={isEditMode ? t("connections.leaveBlankPassword") : t("connections.storedInKeychain")}
        />
      </div>
      <div className="connection-option-fields">
        <label>
          <Database className="option-glyph" size={17} aria-hidden />
          <span>{t("connections.dataPartition")}</span>
          <input
            name="dataPartition"
            {...technicalInputProps}
            defaultValue={initialConnection?.dataPartition ?? ""}
            placeholder={t("connections.default")}
          />
        </label>
      </div>
    </>
  );
}
