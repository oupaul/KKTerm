import { useTranslation } from "react-i18next";
import { DeleteConfirmationDialog } from "../app/DeleteConfirmationDialog";

export function CredentialDeleteConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <DeleteConfirmationDialog
      confirmLabel={t("common.delete")}
      message={t("settings.deleteCredentialConfirmBody")}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={t("settings.deleteCredential")}
    />
  );
}
