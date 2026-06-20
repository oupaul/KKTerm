import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Command, KeyRound, Shell, SquareTerminal, Terminal, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Actions, Btn } from "../../../../app/ui/dialog";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import { invokeCommand, isTauriRuntime } from "../../../../lib/tauri";
import type { Connection } from "../../../../types";
import { resolveAvailableLocalShell, type LocalShellOption } from "../utils";
import {
  applyCliAccountBlock,
  buildCliAccountBlock,
  classifyCliAccountShell,
  cliAccountDirectory,
  slugCliAccountLabel,
  type CliAccountTool,
} from "./cliAccountEnvironment";
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
  const [cliAccountOpen, setCliAccountOpen] = useState(false);
  const [cliAccountTool, setCliAccountTool] = useState<CliAccountTool>("claude-code");
  const [cliAccountLabel, setCliAccountLabel] = useState(initialConnection?.name ?? "");
  const [cliAccountError, setCliAccountError] = useState("");
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
  const cliAccountShellFamily = classifyCliAccountShell(submittedLocalShell);
  const cliAccountSlug = slugCliAccountLabel(cliAccountLabel);
  const cliAccountPath =
    cliAccountShellFamily && cliAccountSlug
      ? cliAccountDirectory(cliAccountTool, cliAccountSlug, cliAccountShellFamily)
      : "";
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
        <div className="local-cli-account-label-row">
          <label htmlFor="local-startup-script">{t("connections.localStartupScript")}</label>
          <button
            aria-controls="local-cli-account-panel"
            aria-expanded={cliAccountOpen}
            className="toolbar-button"
            disabled={!cliAccountShellFamily}
            onClick={() => {
              setCliAccountLabel((current) => current || connectionName);
              setCliAccountError("");
              setCliAccountOpen((current) => !current);
            }}
            type="button"
          >
            <KeyRound size={14} aria-hidden />
            {t("connections.cliAccountHelper")}
          </button>
        </div>
        {!cliAccountShellFamily ? (
          <small className="local-cli-account-unsupported">{t("connections.cliAccountUnsupportedShell")}</small>
        ) : null}
        {cliAccountOpen && cliAccountShellFamily ? (
          <div className="local-cli-account-panel" id="local-cli-account-panel">
            <p>{t("connections.cliAccountHint")}</p>
            <div className="local-cli-account-fields">
              <label>
                <span>{t("connections.cliAccountTool")}</span>
                <select
                  onChange={(event) => setCliAccountTool(event.currentTarget.value as CliAccountTool)}
                  value={cliAccountTool}
                >
                  <option value="claude-code">{t("connections.cliAccountClaudeCode")}</option>
                  <option value="codex">{t("connections.cliAccountCodex")}</option>
                </select>
              </label>
              <label>
                <span>{t("connections.cliAccountLabel")}</span>
                <input
                  {...technicalInputProps}
                  onChange={(event) => {
                    setCliAccountLabel(event.currentTarget.value);
                    setCliAccountError("");
                  }}
                  placeholder={t("connections.cliAccountLabelPlaceholder")}
                  value={cliAccountLabel}
                />
              </label>
            </div>
            <div className="local-cli-account-path">
              <span>{t("connections.cliAccountDirectory")}</span>
              <code>{cliAccountPath || "—"}</code>
            </div>
            {cliAccountError ? <small className="field-error">{cliAccountError}</small> : null}
            <div className="local-cli-account-actions">
              <Actions
                cancel={
                  <Btn onClick={() => setCliAccountOpen(false)} sm>
                    {t("common.cancel")}
                  </Btn>
                }
                primary={
                  <Btn
                    icon="check"
                    kind="primary"
                    onClick={() => {
                      if (!cliAccountSlug) {
                        setCliAccountError(t("connections.cliAccountInvalidLabel"));
                        return;
                      }
                      const block = buildCliAccountBlock(cliAccountTool, cliAccountLabel, cliAccountShellFamily);
                      setLocalStartupScript((current) => applyCliAccountBlock(current, block));
                      setCliAccountOpen(false);
                    }}
                    sm
                  >
                    {t("connections.cliAccountApply")}
                  </Btn>
                }
              />
            </div>
          </div>
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
