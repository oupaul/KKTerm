// Installer Helper confirm dialog. Reuses the global dialog-backdrop
// styles so it visually matches ConfirmDialog and the other app-owned
// modals (see AGENTS.md "App-owned popup dialogs" rules).
//
// Unlike the generic ConfirmDialog, this one accepts a structured `items`
// list to render bullet-list bodies for prerequisite plans and dependent
// warnings — those flows are unreadable as a single string.

import { useTranslation } from "react-i18next";

export interface InstallerConfirmDialogProps {
  title: string;
  body?: string;
  items?: string[];
  footer?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function InstallerConfirmDialog({
  title,
  body,
  items,
  footer,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onConfirm,
  onCancel,
}: InstallerConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={title}
        aria-modal="true"
        className="connection-dialog app-confirm-dialog installer-confirm-dialog"
        role="alertdialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <h2>{title}</h2>
          </div>
        </header>
        {body ? (
          <p className="field-hint app-confirm-message">{body}</p>
        ) : null}
        {items && items.length > 0 ? (
          <ul className="installer-confirm-items">
            {items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        ) : null}
        {footer ? (
          <p className="field-hint app-confirm-message installer-confirm-footer">
            {footer}
          </p>
        ) : null}
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
