import { type CSSProperties, useMemo, useState } from "react";
import { Command, Shell, SquareTerminal, Terminal, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
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
  const defaultLocalShell = initialConnection?.localShell ?? localShellOptions[0]?.value ?? "";
  const [selectedLocalShell, setSelectedLocalShell] = useState(defaultLocalShell);
  const selectedShellIndex = Math.max(
    0,
    localShellOptions.findIndex((option) => (option.value ?? "") === selectedLocalShell),
  );
  const shellOptionColumns = localShellOptions.length > 2 ? 2 : Math.max(1, localShellOptions.length);
  const shellOptionRows = Math.max(1, Math.ceil(Math.max(1, localShellOptions.length) / shellOptionColumns));
  const selectedShellColumn = selectedShellIndex % shellOptionColumns;
  const selectedShellRow = Math.floor(selectedShellIndex / shellOptionColumns);
  const shellSelectorStyle = useMemo(
    () =>
      ({
        "--shell-option-count": Math.max(1, localShellOptions.length),
        "--shell-option-index": selectedShellIndex,
        "--shell-option-columns": shellOptionColumns,
        "--shell-option-rows": shellOptionRows,
        "--shell-option-column": selectedShellColumn,
        "--shell-option-row": selectedShellRow,
      }) as CSSProperties,
    [localShellOptions.length, selectedShellColumn, selectedShellIndex, selectedShellRow, shellOptionColumns, shellOptionRows],
  );

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder={t("connections.connectionName")} />
      </label>
      <div className="connection-option-fields">
        <div className="option-mode-row local-shell-mode-row">
          <Terminal className="option-glyph" size={17} aria-hidden />
          <span id="local-shell-selector-label">{t("connections.shell")}</span>
          <input name="localShell" type="hidden" value={selectedLocalShell} />
          <div
            className="local-shell-selector"
            data-local-shell={selectedLocalShell}
            role="tablist"
            aria-label={t("connections.shell")}
            aria-labelledby="local-shell-selector-label"
            style={shellSelectorStyle}
          >
            {localShellOptions.map((option) => (
              <button
                key={option.value ?? option.label}
                type="button"
                role="tab"
                aria-selected={(option.value ?? "") === selectedLocalShell}
                className={(option.value ?? "") === selectedLocalShell ? "active" : ""}
                onClick={() => setSelectedLocalShell(option.value ?? "")}
              >
                <LocalShellOptionIcon value={option.value} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <label>
        <span>{t("connections.localStartupDirectory")}</span>
        <div className="input-with-button">
          <input
            name="localStartupDirectory"
            {...technicalInputProps}
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
          {...technicalInputProps}
          defaultValue={initialConnection?.localStartupScript ?? ""}
          placeholder={t("connections.localStartupScriptPlaceholder")}
          rows={4}
        />
      </label>
    </>
  );
}

function LocalShellOptionIcon({ value }: { value?: string }) {
  const Icon = localShellOptionIcon(value);
  return <Icon size={15} aria-hidden />;
}

function localShellOptionIcon(value?: string): LucideIcon {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("powershell") || normalized.includes("pwsh")) {
    return Command;
  }
  if (normalized.includes("cmd")) {
    return SquareTerminal;
  }
  if (normalized.includes("wsl")) {
    return Shell;
  }
  return Terminal;
}
