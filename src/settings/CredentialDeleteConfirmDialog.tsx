import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CredentialDeleteConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("settings.deleteCredential")}
        aria-modal="true"
        className="connection-dialog settings-reset-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <p className="panel-label">{t("settings.sectionCredentials")}</p>
            <h2>{t("settings.deleteCredential")}</h2>
          </div>
        </header>
        <p className="field-hint">{t("settings.deleteCredentialConfirmBody")}</p>
        <div className="dialog-actions">
          <button
            aria-label={t("settings.deleteCredential")}
            className="settings-icon-danger-button"
            onClick={onConfirm}
            type="button"
          >
            <Trash2 size={16} />
          </button>
          <button className="toolbar-button" onClick={onCancel} type="button">
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
