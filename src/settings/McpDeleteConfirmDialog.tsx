import { useTranslation } from "react-i18next";
import { DeleteConfirmationDialog } from "../app/DeleteConfirmationDialog";

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
    <DeleteConfirmationDialog
      confirmLabel={t("common.delete")}
      message={t("settings.mcpDeleteConfirmBody", { name })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={t("settings.mcpDeleteServer")}
    />
  );
}
