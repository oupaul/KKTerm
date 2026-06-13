import { useTranslation } from "react-i18next";
import type { Connection } from "../../../../types";

/**
 * Minimal Add/Edit form for the local File Explorer Connection type: a name and
 * an optional starting directory. There is no host, port, or credentials.
 */
export function LocalFilesConnectionFields({
  initialConnection,
  localStartupDirectory,
  onBrowseLocalStartupDirectory,
  onLocalStartupDirectoryChange,
}: {
  initialConnection?: Connection;
  localStartupDirectory: string;
  onBrowseLocalStartupDirectory: () => void;
  onLocalStartupDirectoryChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input
          name="name"
          defaultValue={initialConnection?.name ?? ""}
          placeholder={t("connections.localFiles")}
        />
      </label>
      <label>
        <span>{t("connections.localFilesRootDirectory")}</span>
        <div className="input-with-button">
          <input
            name="localStartupDirectory"
            onChange={(event) => onLocalStartupDirectoryChange(event.currentTarget.value)}
            placeholder={t("connections.localFilesRootDirectoryPlaceholder")}
            value={localStartupDirectory}
          />
          <button
            className="toolbar-button"
            onClick={onBrowseLocalStartupDirectory}
            type="button"
          >
            {t("connections.browse")}
          </button>
        </div>
      </label>
    </>
  );
}
