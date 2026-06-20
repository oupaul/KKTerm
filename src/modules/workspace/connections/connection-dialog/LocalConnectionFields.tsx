import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Command, ListTree, Shell, SquareTerminal, Terminal, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import { invokeCommand, isTauriRuntime } from "../../../../lib/tauri";
import type { Connection } from "../../../../types";
import { resolveAvailableLocalShell, type LocalShellOption } from "../utils";
import { EnvironmentVariablesDialog } from "./EnvironmentVariablesDialog";
import { classifyEnvironmentShell } from "./environmentVariables";
import {
  buildWslDistributionShell,
  distroFromWslShell,
  isWslShell,
  osIconRefForWslDistro,
  wslShellSelectorValue,
} from "./wslLocalShell";

type WslDistroOption = {
  isDefault: boolean;
  name: string;
};

export function LocalConnectionFields({
  initialConnection,
  localShellOptions,
  localStartupDirectory,
  onWslDistroIconChange,
  onBrowseLocalStartupDirectory,
  onLocalStartupDirectoryChange,
}: {
  initialConnection?: Connection;
  localShellOptions: LocalShellOption[];
  localStartupDirectory: string;
  onWslDistroIconChange?: (iconDataUrl: string | null) => void;
  onBrowseLocalStartupDirectory: () => void;
  onLocalStartupDirectoryChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const defaultLocalShell = resolveAvailableLocalShell(wslShellSelectorValue(initialConnection?.localShell), localShellOptions);
  const [selectedLocalShell, setSelectedLocalShell] = useState(defaultLocalShell);
  const [wslDistros, setWslDistros] = useState<WslDistroOption[]>([]);
  const [selectedWslDistro, setSelectedWslDistro] = useState(distroFromWslShell(initialConnection?.localShell));
  const [connectionName, setConnectionName] = useState(initialConnection?.name ?? "");
  const [localStartupScript, setLocalStartupScript] = useState(initialConnection?.localStartupScript ?? "");
  const [environmentDialogOpen, setEnvironmentDialogOpen] = useState(false);
  useEffect(() => {
    setSelectedLocalShell((currentShell) => resolveAvailableLocalShell(wslShellSelectorValue(currentShell), localShellOptions));
  }, [localShellOptions]);
  const wslSelected = isWslShell(selectedLocalShell);
  useEffect(() => {
    if (!wslSelected || !isTauriRuntime()) {
      setWslDistros([]);
      return;
    }

    let disposed = false;
    void invokeCommand("installer_wsl_list_distros", undefined)
      .then((distros) => {
        if (!disposed) {
          setWslDistros(distros);
        }
      })
      .catch(() => {
        if (!disposed) {
          setWslDistros([]);
        }
      });
    return () => {
      disposed = true;
    };
  }, [wslSelected]);
  const submittedLocalShell =
    wslSelected && selectedWslDistro
      ? buildWslDistributionShell(selectedWslDistro)
      : selectedLocalShell;
  const environmentShellFamily = classifyEnvironmentShell(submittedLocalShell);
  useEffect(() => {
    onWslDistroIconChange?.(wslSelected ? osIconRefForWslDistro(selectedWslDistro) : null);
  }, [onWslDistroIconChange, selectedWslDistro, wslSelected]);
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
        <input
          name="name"
          onChange={(event) => setConnectionName(event.currentTarget.value)}
          placeholder={t("connections.connectionName")}
          value={connectionName}
        />
      </label>
      <div className="connection-option-fields">
        <div className="option-mode-row local-shell-mode-row">
          <Terminal className="option-glyph" size={17} aria-hidden />
          <span id="local-shell-selector-label">{t("connections.shell")}</span>
          <input name="localShell" type="hidden" value={submittedLocalShell} />
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
                onClick={() => {
                  setSelectedLocalShell(option.value ?? "");
                  if (!isWslShell(option.value)) {
                    setSelectedWslDistro("");
                  }
                }}
              >
                <LocalShellOptionIcon value={option.value} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
        {wslSelected && wslDistros.length > 0 ? (
          <label>
            <span>{t("connections.wslDistribution")}</span>
            <select
              name="wslDistro"
              onChange={(event) => setSelectedWslDistro(event.currentTarget.value)}
              value={selectedWslDistro}
            >
              <option value="">{t("connections.default")}</option>
              {wslDistros.map((distro) => (
                <option key={distro.name} value={distro.name}>
                  {distro.isDefault ? `${distro.name} (${t("connections.default")})` : distro.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
      <div className="local-startup-script-field">
        <div className="local-environment-label-row">
          <label htmlFor="local-startup-script">{t("connections.localStartupScript")}</label>
          <button
            className="toolbar-button"
            disabled={!environmentShellFamily}
            onClick={() => setEnvironmentDialogOpen(true)}
            type="button"
          >
            <ListTree size={14} aria-hidden />
            {t("connections.environmentVariables")}
          </button>
        </div>
        {!environmentShellFamily ? (
          <small className="local-environment-unsupported">{t("connections.environmentVariablesUnsupportedShell")}</small>
        ) : null}
        <textarea
          id="local-startup-script"
          name="localStartupScript"
          {...technicalInputProps}
          onChange={(event) => setLocalStartupScript(event.currentTarget.value)}
          placeholder={t("connections.localStartupScriptPlaceholder")}
          rows={4}
          value={localStartupScript}
        />
      </div>
      {environmentDialogOpen && environmentShellFamily ? (
        <EnvironmentVariablesDialog
          connectionName={connectionName}
          onApply={(script) => {
            setLocalStartupScript(script);
            setEnvironmentDialogOpen(false);
          }}
          onCancel={() => setEnvironmentDialogOpen(false)}
          shellFamily={environmentShellFamily}
          startupScript={localStartupScript}
        />
      ) : null}
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
