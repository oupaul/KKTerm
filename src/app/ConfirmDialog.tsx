import { ConfirmSheet } from "./ui/dialog";

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
  return (
    <ConfirmSheet
      tone={tone === "danger" ? "danger" : "info"}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      confirmIcon={tone === "danger" ? "trash" : undefined}
      cancelLabel={cancelLabel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
