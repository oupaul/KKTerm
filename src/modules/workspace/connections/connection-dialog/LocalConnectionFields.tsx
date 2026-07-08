import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Command, Layers, Shell, SquareTerminal, Terminal, WandSparkles, type LucideIcon } from "../../../../lib/reicon";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import { invokeCommand, isTauriRuntime } from "../../../../lib/tauri";
import type { Connection } from "../../../../types";
import { resolveAvailableLocalShell, type LocalShellOption } from "../utils";
import { CliAccountDialog } from "./EnvironmentVariablesDialog";
import { classifyEnvironmentShell, retargetEnvironmentBlock } from "./environmentVariables";
import { ensurePsmuxAvailable, isPowerShellFamilyShell } from "./psmuxPreflight";
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
  const [localStartupScript, setLocalStartupScript] = useState(() => {
    const script = initialConnection?.localStartupScript ?? "";
    const family = classifyEnvironmentShell(defaultLocalShell);
    return family ? retargetEnvironmentBlock(script, family) : script;
  });
  const [cliAccountDialogOpen, setCliAccountDialogOpen] = useState(false);
  const [usePsmuxSessions, setUsePsmuxSessions] = useState(initialConnection?.usePsmuxSessions ?? false);
  const [psmuxBusy, setPsmuxBusy] = useState(false);
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
  // psmux session management is offered only for PowerShell / PowerShell 7 local
  // shells. Switching to any other shell forces the toggle back off.
  const powerShellSelected = isPowerShellFamilyShell(submittedLocalShell);
  useEffect(() => {
    if (!powerShellSelected && usePsmuxSessions) {
      setUsePsmuxSessions(false);
    }
  }, [powerShellSelected, usePsmuxSessions]);
  async function handlePsmuxToggle(next: boolean) {
    if (!next) {
      setUsePsmuxSessions(false);
      return;
    }
    setPsmuxBusy(true);
    try {
      // Enabling checks for psmux and, if missing, runs the Install Helper
      // recipe. The toggle only stays on when psmux ends up available.
      const status = await ensurePsmuxAvailable();
      setUsePsmuxSessions(status === "available");
    } finally {
      setPsmuxBusy(false);
    }
  }
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
                  const nextShell = option.value ?? "";
                  const nextFamily = classifyEnvironmentShell(nextShell);
                  setSelectedLocalShell(nextShell);
                  if (nextFamily) {
                    setLocalStartupScript((script) => retargetEnvironmentBlock(script, nextFamily));
                  }
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
        {powerShellSelected ? (
          <label className="connection-session-toggle local-psmux-toggle">
            <Layers className="option-glyph" size={17} aria-hidden />
            <span>{psmuxBusy ? t("installer.psmux.installing") : t("connections.usePsmux")}</span>
            <input
              checked={usePsmuxSessions}
              disabled={psmuxBusy}
              name="usePsmuxSessions"
              onChange={(event) => void handlePsmuxToggle(event.currentTarget.checked)}
              type="checkbox"
            />
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
            aria-label={t("connections.cliAccountAlternateProfileHint")}
            className="kk-qc-ai-btn local-cli-account-trigger"
            disabled={!environmentShellFamily}
            onClick={() => setCliAccountDialogOpen(true)}
            title={t("connections.cliAccountAlternateProfileHint")}
            type="button"
          >
            <WandSparkles size={13} aria-hidden />
          </button>
        </div>
        {!environmentShellFamily ? (
          <small className="local-environment-unsupported">{t("connections.cliAccountUnsupportedShell")}</small>
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
      {cliAccountDialogOpen && environmentShellFamily ? (
        <CliAccountDialog
          connectionName={connectionName}
          onApply={(script) => {
            setLocalStartupScript(script);
            setCliAccountDialogOpen(false);
          }}
          onCancel={() => setCliAccountDialogOpen(false)}
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
