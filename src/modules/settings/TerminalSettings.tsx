import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { TerminalCursorStyle, TerminalSettings as TerminalSettingsType } from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

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

  return {
    ...settings,
    fontFamily: settings.fontFamily.trim(),
    fontSize: Math.round(settings.fontSize),
    lineHeight: Number(settings.lineHeight.toFixed(2)),
    scrollbackLines: Math.round(settings.scrollbackLines),
    defaultTransparency: Math.round(settings.defaultTransparency),
    useRandomDynamicBackground: settings.useRandomDynamicBackground ?? false,
    defaultShell: settings.defaultShell.trim(),
  };
}

export function TerminalSettings() {
  const { t } = useTranslation();
  const terminalSettings = useWorkspaceStore((state) => state.terminalSettings);
  const setTerminalSettings = useWorkspaceStore((state) => state.setTerminalSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState(terminalSettings);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(terminalSettings);

  useEffect(() => {
    setDraft(terminalSettings);
  }, [terminalSettings]);

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
            <input
              onChange={(event) => {
                const fontFamily = event.currentTarget.value;
                setDraft((settings) => ({
                  ...settings,
                  fontFamily,
                }));
              }}
              value={draft.fontFamily}
            />
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
              <option value="powershell.exe">{t("settings.powerShell")}</option>
              <option value="cmd.exe">{t("settings.commandPrompt")}</option>
              <option value="wsl.exe">{t("settings.wsl")}</option>
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
