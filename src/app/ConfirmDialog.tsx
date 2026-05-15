import { useTranslation } from "react-i18next";

export function ConfirmDialog({
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
  tone = "default",
}: {
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  const { t } = useTranslation();

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={title}
        aria-modal="true"
        className="connection-dialog app-confirm-dialog"
        role="alertdialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <h2>{title}</h2>
          </div>
        </header>
        <p className="field-hint app-confirm-message">{message}</p>
        <div className="dialog-actions">
          <button
            className={`secondary-button${tone === "danger" ? " danger" : ""}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
          <button className="toolbar-button" onClick={onCancel} type="button">
            {cancelLabel ?? t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
