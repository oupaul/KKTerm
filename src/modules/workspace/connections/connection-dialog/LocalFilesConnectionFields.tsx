import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";

/**
 * Minimal Add/Edit form for the local File Explorer Connection type: a name and
 * an optional starting directory. There is no host, port, or credentials.
 */
export function LocalFilesConnectionFields({
  localStartupDirectory,
  nameValue,
  onBrowseLocalStartupDirectory,
  onLocalStartupDirectoryChange,
  onNameChange,
}: {
  localStartupDirectory: string;
  nameValue: string;
  onBrowseLocalStartupDirectory: () => void;
  onLocalStartupDirectoryChange: (value: string) => void;
  onNameChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input
          name="name"
          onChange={(event) => onNameChange(event.currentTarget.value)}
          placeholder={t("connections.localFiles")}
          value={nameValue}
        />
      </label>
      <label>
        <span>{t("connections.localFilesRootDirectory")}</span>
        <div className="input-with-button">
          <input
            name="localStartupDirectory"
            {...technicalInputProps}
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
