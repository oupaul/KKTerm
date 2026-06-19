import { useEffect, useState } from "react";
import { FolderOpen, Plus, RefreshCw, Terminal, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import {
  isSystemFontAccessSupported,
  systemFontsExcluding,
} from "../../lib/systemFonts";
import {
  getRecommendedFontOptions,
  loadSharedCustomFonts,
  refreshSharedFontCatalog,
  useSystemFontCatalog,
} from "../../lib/fontCatalog";
import { defaultTerminalSettings } from "../../app-defaults";
import { currentPlatform } from "../../lib/platform";
import { useWorkspaceStore } from "../../store";
import type { TerminalCursorStyle, TerminalSettings as TerminalSettingsType } from "../../types";
import { localShellOptionsForPlatform, resolveAvailableLocalShell } from "../workspace/connections/utils";
import { customShellPresetsForPlatform, findCustomShellPreset } from "./customShellPresets";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

/** CSS font stack for a font family picked from the custom or system font list. */
function terminalFontCssValue(family: string) {
  return `"${family}", monospace`;
}

function normalizeTerminalSettingsDraft(settings: TerminalSettingsType, t: TFunction): TerminalSettingsType {
  if (!settings.fontFamily.trim()) {
    throw new Error(t("settings.fontFamilyRequired"));
  }
  if (!settings.defaultShell.trim()) {
    throw new Error(t("settings.defaultShellRequired"));
  }
  if (!Number.isFinite(settings.fontSize) || settings.fontSize < 8 || settings.fontSize > 32) {
    throw new Error(t("settings.fontSizeRange"));
  }
  if (!Number.isFinite(settings.lineHeight) || settings.lineHeight < 1 || settings.lineHeight > 2) {
    throw new Error(t("settings.lineHeightRange"));
  }
  if (
    !Number.isFinite(settings.scrollbackLines) ||
    settings.scrollbackLines < 100 ||
    settings.scrollbackLines > 100_000
  ) {
    throw new Error(t("settings.scrollbackRange"));
  }
  if (
    !Number.isFinite(settings.defaultTransparency) ||
    settings.defaultTransparency < 0 ||
    settings.defaultTransparency > 100
  ) {
    throw new Error(t("settings.defaultTransparencyRange"));
  }

  const customShells = (settings.customShells ?? [])
    .map((shell) => ({
      id: shell.id.trim() || makeCustomShellId(),
      name: shell.name.trim(),
      commandLine: shell.commandLine.trim(),
    }))
    .filter((shell) => shell.name && shell.commandLine);

  return {
    ...settings,
    fontFamily: settings.fontFamily.trim(),
    fontSize: Math.round(settings.fontSize),
    lineHeight: Number(settings.lineHeight.toFixed(2)),
    scrollbackLines: Math.round(settings.scrollbackLines),
    defaultTransparency: Math.round(settings.defaultTransparency),
    useRandomDynamicBackground: settings.useRandomDynamicBackground ?? false,
    defaultShell: resolveAvailableLocalShell(settings.defaultShell, localShellOptionsForPlatform(customShells)),
    customShells,
  };
}

function makeCustomShellId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-shell-${crypto.randomUUID()}`;
  }
  return `custom-shell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function TerminalSettings() {
  const { t } = useTranslation();
  const terminalSettings = useWorkspaceStore((state) => state.terminalSettings);
  const setTerminalSettings = useWorkspaceStore((state) => state.setTerminalSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState(terminalSettings);
  const {
    customFonts,
    systemFonts,
    refreshing: refreshingFonts,
    recommendationsSynced,
  } = useSystemFontCatalog();
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(terminalSettings);
  const defaultShellOptions = localShellOptionsForPlatform(draft.customShells);
  const customShellPresets = customShellPresetsForPlatform(currentPlatform());
  const defaultShellSelectOptions = defaultShellOptions.some((option) => (option.value ?? "") === draft.defaultShell)
    ? defaultShellOptions
    : [
        ...defaultShellOptions,
        {
          label: draft.defaultShell,
          value: draft.defaultShell,
        },
      ];

  useEffect(() => {
    setDraft(terminalSettings);
  }, [terminalSettings]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    // Listing also registers each custom font with the WebView, so the family
    // names suggested below resolve in the terminal once selected.
    void loadSharedCustomFonts()
      .catch(() => undefined);
  }, []);

  async function handleOpenCustomFontsFolder() {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      await invokeCommand("open_custom_fonts_folder");
    } catch (err) {
      showStatusBarNotice(err instanceof Error ? err.message : String(err), { tone: "error" });
    }
  }

  async function handleRefreshSystemFonts() {
    if (!isSystemFontAccessSupported()) {
      showStatusBarNotice(t("settings.systemFontsUnavailable"), { tone: "error" });
      return;
    }
    try {
      await refreshSharedFontCatalog();
      showStatusBarNotice(t("settings.systemFontsRefreshed"), { tone: "success" });
    } catch (err) {
      showStatusBarNotice(err instanceof Error ? err.message : String(err), { tone: "error" });
    }
  }

  async function handleSave() {
    try {
      const nextSettings = normalizeTerminalSettingsDraft(draft, t);
      const saved = isTauriRuntime()
        ? await invokeCommand("update_terminal_settings", { request: nextSettings })
        : nextSettings;
      setTerminalSettings(saved);
      setDraft(saved);
      showStatusBarNotice(t("settings.terminalSaved"), { tone: "success" });
    } catch (err) {
      showStatusBarNotice(err instanceof Error ? err.message : String(err), { tone: "error" });
    }
  }

  function handleAddCustomShell() {
    setDraft((settings) => ({
      ...settings,
      customShells: [
        ...(settings.customShells ?? []),
        {
          id: makeCustomShellId(),
          name: "",
          commandLine: "",
        },
      ],
    }));
  }

  function handleUpdateCustomShell(shellId: string, field: "name" | "commandLine", value: string) {
    setDraft((settings) => ({
      ...settings,
      customShells: (settings.customShells ?? []).map((shell) =>
        shell.id === shellId ? { ...shell, [field]: value } : shell,
      ),
    }));
  }

  function handleCustomShellNameChange(shellId: string, name: string) {
    const preset = findCustomShellPreset(name, currentPlatform());
    setDraft((settings) => ({
      ...settings,
      customShells: (settings.customShells ?? []).map((shell) =>
        shell.id === shellId
          ? {
              ...shell,
              name,
              commandLine: preset?.commandLine ?? shell.commandLine,
            }
          : shell,
      ),
    }));
  }

  function handleRemoveCustomShell(shellId: string) {
    setDraft((settings) => {
      const removedShell = settings.customShells?.find((shell) => shell.id === shellId);
      const customShells = (settings.customShells ?? []).filter((shell) => shell.id !== shellId);
      const defaultShell =
        removedShell?.commandLine.trim() && settings.defaultShell === removedShell.commandLine.trim()
          ? resolveAvailableLocalShell(undefined, localShellOptionsForPlatform(customShells))
          : settings.defaultShell;
      return {
        ...settings,
        customShells,
        defaultShell,
      };
    });
  }

  const customFontTerminalOptions = customFonts.map((font) => ({
    key: font.path,
    label: font.name,
    value: terminalFontCssValue(font.name),
  }));
  const terminalFontOptions = getRecommendedFontOptions(
    "terminal",
    undefined,
    recommendationsSynced ? systemFonts : undefined,
  );
  const curatedTerminalFontFamilies = terminalFontOptions.flatMap((option) => option.family ? [option.family] : []);
  const systemFontTerminalOptions = systemFontsExcluding(systemFonts, [
    ...curatedTerminalFontFamilies,
    ...customFonts.map((font) => font.name),
  ]).map((family) => ({ family, value: terminalFontCssValue(family) }));
  const defaultTerminalFontValue = defaultTerminalSettings.fontFamily;
  const terminalFontMatched =
    draft.fontFamily === defaultTerminalFontValue ||
    terminalFontOptions.some((option) => option.value === draft.fontFamily) ||
    customFontTerminalOptions.some((option) => option.value === draft.fontFamily) ||
    systemFontTerminalOptions.some((option) => option.value === draft.fontFamily);

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<Terminal size={18} />}
        label={t("settings.sectionTerminal")}
        title={t("settings.terminalBehavior")}
      />

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.terminalText")}</legend>
        <div>
          <p className="field-hint">{t("settings.terminalTextHint")}</p>
        </div>
        <div className="form-grid three-columns">
          <label data-tutorial-id="settings.terminalFontFamily">
            <span>{t("settings.fontFamily")}</span>
            <div className="input-with-button font-input-with-button">
              <button
                aria-label={t("settings.refreshSystemFonts")}
                className="toolbar-button"
                disabled={refreshingFonts}
                onClick={() => void handleRefreshSystemFonts()}
                title={t("settings.refreshSystemFonts")}
                type="button"
              >
                <RefreshCw className={refreshingFonts ? "spin" : undefined} size={15} />
              </button>
              <select
                onChange={(event) => {
                  const fontFamily = event.currentTarget.value;
                  setDraft((settings) => ({
                    ...settings,
                    fontFamily,
                  }));
                }}
                value={draft.fontFamily}
              >
                {terminalFontMatched ? null : (
                  <option value={draft.fontFamily}>{draft.fontFamily}</option>
                )}
                {customFontTerminalOptions.length > 0 ? (
                  <optgroup label={t("settings.customFonts")}>
                    {customFontTerminalOptions.map((option) => (
                      <option key={option.key} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label={t("settings.recommendedFonts")}>
                  {terminalFontOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.labelKey ? t(option.labelKey) : option.label}
                    </option>
                  ))}
                </optgroup>
                {systemFontTerminalOptions.length > 0 ? (
                  <optgroup label={t("settings.systemFonts")}>
                    {systemFontTerminalOptions.map((option) => (
                      <option key={option.family} value={option.value}>
                        {option.family}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              {isTauriRuntime() ? (
                <button
                  aria-label={t("settings.openCustomFontsFolder")}
                  className="toolbar-button"
                  onClick={() => void handleOpenCustomFontsFolder()}
                  title={t("settings.openCustomFontsFolder")}
                  type="button"
                >
                  <FolderOpen size={15} />
                </button>
              ) : null}
            </div>
            <small className="field-hint">{t("settings.customFontsHint")}</small>
          </label>
          <label data-tutorial-id="settings.terminalFontSize">
            <span>{t("settings.fontSize")}</span>
            <input
              inputMode="numeric"
              max={32}
              min={8}
              onChange={(event) => {
                const fontSize = Number(event.currentTarget.value);
                setDraft((settings) => ({
                  ...settings,
                  fontSize,
                }));
              }}
              type="number"
              value={draft.fontSize}
            />
          </label>
          <label>
            <span>{t("settings.lineHeight")}</span>
            <input
              max={2}
              min={1}
              onChange={(event) => {
                const lineHeight = Number(event.currentTarget.value);
                setDraft((settings) => ({
                  ...settings,
                  lineHeight,
                }));
              }}
              step={0.05}
              type="number"
              value={draft.lineHeight}
            />
          </label>
        </div>
        <div className="form-grid three-columns">
          <label>
            <span>{t("settings.cursorStyle")}</span>
            <select
              onChange={(event) => {
                const cursorStyle = event.currentTarget.value as TerminalCursorStyle;
                setDraft((settings) => ({
                  ...settings,
                  cursorStyle,
                }));
              }}
              value={draft.cursorStyle}
            >
              <option value="block">{t("settings.block")}</option>
              <option value="bar">{t("settings.bar")}</option>
              <option value="underline">{t("settings.underline")}</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.terminalSession")}</legend>
        <div>
          <p className="field-hint">{t("settings.terminalSessionHint")}</p>
        </div>
        <div className="form-grid three-columns">
          <label data-tutorial-id="settings.defaultShell">
            <span>{t("settings.defaultShell")}</span>
            <select
              onChange={(event) => {
                const defaultShell = event.currentTarget.value;
                setDraft((settings) => ({
                  ...settings,
                  defaultShell,
                }));
              }}
              value={draft.defaultShell}
            >
              {defaultShellSelectOptions.map((option) => (
                <option key={option.value ?? option.label} value={option.value ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label data-tutorial-id="settings.scrollbackLines">
            <span>{t("settings.scrollbackLines")}</span>
            <input
              inputMode="numeric"
              max={100000}
              min={100}
              onChange={(event) => {
                const scrollbackLines = Number(event.currentTarget.value);
                setDraft((settings) => ({
                  ...settings,
                  scrollbackLines,
                }));
              }}
              step={100}
              type="number"
              value={draft.scrollbackLines}
            />
            <small className="field-hint">{t("settings.scrollbackHint")}</small>
          </label>
          <label>
            <span>{t("settings.defaultTransparency")}</span>
            <input
              inputMode="numeric"
              max={100}
              min={0}
              onChange={(event) => {
                const defaultTransparency = Number(event.currentTarget.value);
                setDraft((settings) => ({
                  ...settings,
                  defaultTransparency,
                }));
              }}
              type="number"
              value={draft.defaultTransparency}
            />
            <small className="field-hint">{t("settings.defaultTransparencyHint")}</small>
          </label>
        </div>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.useRandomDynamicBackground}
              onChange={(checked) =>
                setDraft((settings) => ({ ...settings, useRandomDynamicBackground: checked }))
              }
            />
            <span>
              <strong>{t("settings.randomDynamicBackgroundOnCreate")}</strong>
              <small>{t("settings.randomDynamicBackgroundOnCreateHint")}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.customShells")}</legend>
        <div>
          <p className="field-hint">{t("settings.customShellsHint")}</p>
        </div>
        <div className="settings-toggle-list">
          <datalist id="terminal-custom-shell-presets">
            {customShellPresets.map((preset) => (
              <option key={preset.name} value={preset.name} />
            ))}
          </datalist>
          {(draft.customShells ?? []).map((shell) => (
            <div className="settings-custom-shell-row" key={shell.id}>
              <Terminal size={16} aria-hidden />
              <div className="settings-custom-shell-fields">
                <label>
                  <span>{t("settings.customShellName")}</span>
                  <input
                    list="terminal-custom-shell-presets"
                    onChange={(event) => handleCustomShellNameChange(shell.id, event.currentTarget.value)}
                    placeholder={t("settings.customShellNamePlaceholder")}
                    value={shell.name}
                  />
                </label>
                <label>
                  <span>{t("settings.customShellCommandLine")}</span>
                  <input
                    onChange={(event) => handleUpdateCustomShell(shell.id, "commandLine", event.currentTarget.value)}
                    placeholder={t("settings.customShellCommandLinePlaceholder")}
                    value={shell.commandLine}
                  />
                </label>
              </div>
              <button
                aria-label={t("settings.removeCustomShell", { name: shell.name || t("settings.customShell") })}
                className="toolbar-button"
                onClick={() => handleRemoveCustomShell(shell.id)}
                title={t("settings.removeCustomShell", { name: shell.name || t("settings.customShell") })}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button className="toolbar-button" onClick={handleAddCustomShell} type="button">
            <Plus size={15} />
            {t("settings.addCustomShell")}
          </button>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.terminalClipboard")}</legend>
        <div>
          <p className="field-hint">{t("settings.terminalClipboardHint")}</p>
        </div>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.copyOnSelect}
              onChange={(checked) =>
                setDraft((settings) => ({ ...settings, copyOnSelect: checked }))
              }
            />
            <span>
              <strong>{t("settings.copyOnSelect")}</strong>
            </span>
          </label>
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.allowOsc52Clipboard}
              onChange={(checked) =>
                setDraft((settings) => ({ ...settings, allowOsc52Clipboard: checked }))
              }
            />
            <span>
              <strong>{t("settings.allowLocalOsc52Clipboard")}</strong>
            </span>
          </label>
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.confirmMultilinePaste}
              onChange={(checked) =>
                setDraft((settings) => ({ ...settings, confirmMultilinePaste: checked }))
              }
            />
            <span>
              <strong>{t("settings.confirmMultilinePaste")}</strong>
            </span>
          </label>
        </div>
      </fieldset>

    </section>
  );
}
