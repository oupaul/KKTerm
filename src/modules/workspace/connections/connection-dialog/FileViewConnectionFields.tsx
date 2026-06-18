import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";

/**
 * Add/Edit form for the Document Connection type (`fileView`): a name and the
 * target file path. There is no host, port, or credentials — the viewer opens a
 * single local file. The file path is persisted in the Connection's
 * `localStartupDirectory` slot.
 */
export function FileViewConnectionFields({
  filePath,
  openExternal,
  nameValue,
  onBrowseFilePath,
  onFilePathChange,
  onNameChange,
  onOpenExternalChange,
}: {
  filePath: string;
  openExternal: boolean;
  nameValue: string;
  onBrowseFilePath: () => void;
  onFilePathChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onOpenExternalChange: (value: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input
          name="name"
          onChange={(event) => onNameChange(event.currentTarget.value)}
          placeholder={t("connections.fileView")}
          value={nameValue}
        />
      </label>
      <label>
        <span>{t("connections.fileViewPath")}</span>
        <div className="input-with-button">
          <input
            name="fileViewPath"
            {...technicalInputProps}
            onChange={(event) => onFilePathChange(event.currentTarget.value)}
            placeholder={t("connections.fileViewPathPlaceholder")}
            value={filePath}
          />
          <button
            className="toolbar-button"
            onClick={onBrowseFilePath}
            type="button"
          >
            {t("connections.browse")}
          </button>
        </div>
      </label>
      <label className="checkbox-row">
        <input
          checked={openExternal}
          name="fileViewOpenExternal"
          onChange={(event) => onOpenExternalChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>{t("connections.fileViewOpenExternal")}</span>
      </label>
      <p className="field-hint">{t("connections.fileViewOpenExternalHint")}</p>
    </>
  );
}
