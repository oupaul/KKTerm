import { useTranslation } from "react-i18next";
import type { Connection } from "../../../../types";
import type { LocalShellOption } from "../utils";

export function LocalConnectionFields({
  initialConnection,
  localShellOptions,
  localStartupDirectory,
  onBrowseLocalStartupDirectory,
  onLocalStartupDirectoryChange,
}: {
  initialConnection?: Connection;
  localShellOptions: LocalShellOption[];
  localStartupDirectory: string;
  onBrowseLocalStartupDirectory: () => void;
  onLocalStartupDirectoryChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder={t("connections.connectionName")} />
      </label>
      <div className="connection-option-fields">
        <label className="option-mode-row">
          <span>{t("connections.shell")}</span>
          <select name="localShell" defaultValue={initialConnection?.localShell ?? localShellOptions[0]?.value ?? ""}>
            {localShellOptions.map((option) => (
              <option value={option.value ?? ""} key={option.value ?? option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>{t("connections.localStartupDirectory")}</span>
        <div className="input-with-button">
          <input
            name="localStartupDirectory"
            onChange={(event) => onLocalStartupDirectoryChange(event.currentTarget.value)}
            placeholder={t("connections.localStartupDirectoryPlaceholder")}
            value={localStartupDirectory}
          />
          <button className="toolbar-button" onClick={onBrowseLocalStartupDirectory} type="button">
            {t("connections.browse")}
          </button>
        </div>
      </label>
      <label>
        <span>{t("connections.localStartupScript")}</span>
        <textarea
          name="localStartupScript"
          defaultValue={initialConnection?.localStartupScript ?? ""}
          placeholder={t("connections.localStartupScriptPlaceholder")}
          rows={4}
        />
      </label>
    </>
  );
}
