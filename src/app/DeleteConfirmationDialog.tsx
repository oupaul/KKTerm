import { ConfirmDialog } from "./ConfirmDialog";

export function DeleteConfirmationDialog({
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <ConfirmDialog
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      message={message}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      tone="danger"
    />
  );
}
