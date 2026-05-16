import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function McpDeleteConfirmDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("settings.mcpDeleteServer")}
        aria-modal="true"
        className="connection-dialog settings-reset-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <p className="panel-label">{t("settings.mcpServersTitle")}</p>
            <h2>{t("settings.mcpDeleteServer")}</h2>
          </div>
        </header>
        <p className="field-hint">
          {t("settings.mcpDeleteConfirmBody", { name })}
        </p>
        <div className="dialog-actions">
          <button
            aria-label={t("settings.mcpDeleteServer")}
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
