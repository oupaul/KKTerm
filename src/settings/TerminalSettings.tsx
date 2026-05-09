import { useEffect, useState } from "react";
import { Save, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import type { TerminalCursorStyle, TerminalSettings as TerminalSettingsType } from "../types";
import { SettingsSectionHeader } from "./shared";

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

  return {
    ...settings,
    fontFamily: settings.fontFamily.trim(),
    fontSize: Math.round(settings.fontSize),
    lineHeight: Number(settings.lineHeight.toFixed(2)),
    scrollbackLines: Math.round(settings.scrollbackLines),
    defaultShell: settings.defaultShell.trim(),
  };
}

export function TerminalSettings() {
  const { t } = useTranslation();
  const terminalSettings = useWorkspaceStore((state) => state.terminalSettings);
  const setTerminalSettings = useWorkspaceStore((state) => state.setTerminalSettings);
  const [draft, setDraft] = useState(terminalSettings);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(terminalSettings);

  useEffect(() => {
    setDraft(terminalSettings);
  }, [terminalSettings]);

  async function handleSave() {
    try {
      setError("");
      setStatus("");
      const nextSettings = normalizeTerminalSettingsDraft(draft, t);
      const saved = isTauriRuntime()
        ? await invokeCommand("update_terminal_settings", { request: nextSettings })
        : nextSettings;
      setTerminalSettings(saved);
      setDraft(saved);
      setStatus(t("settings.terminalSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        actions={
          <button
            className="toolbar-button"
            disabled={!hasChanges}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save size={15} />
            {t("settings.save")}
          </button>
        }
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
          <label>
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
          <label>
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
          <label>
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
          <label>
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
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.terminalClipboard")}</legend>
        <div>
          <p className="field-hint">{t("settings.terminalClipboardHint")}</p>
        </div>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <input
              checked={draft.copyOnSelect}
              onChange={(event) => {
                const copyOnSelect = event.currentTarget.checked;
                setDraft((settings) => ({
                  ...settings,
                  copyOnSelect,
                }));
              }}
              type="checkbox"
            />
            <span>
              <strong>{t("settings.copyOnSelect")}</strong>
            </span>
          </label>
          <label className="settings-toggle-row">
            <input
              checked={draft.allowOsc52Clipboard}
              onChange={(event) => {
                const allowOsc52Clipboard = event.currentTarget.checked;
                setDraft((settings) => ({
                  ...settings,
                  allowOsc52Clipboard,
                }));
              }}
              type="checkbox"
            />
            <span>
              <strong>{t("settings.allowLocalOsc52Clipboard")}</strong>
            </span>
          </label>
          <label className="settings-toggle-row">
            <input
              checked={draft.confirmMultilinePaste}
              onChange={(event) => {
                const confirmMultilinePaste = event.currentTarget.checked;
                setDraft((settings) => ({
                  ...settings,
                  confirmMultilinePaste,
                }));
              }}
              type="checkbox"
            />
            <span>
              <strong>{t("settings.confirmMultilinePaste")}</strong>
            </span>
          </label>
        </div>
      </fieldset>

      {status ? <p className="settings-status success">{status}</p> : null}
      {error ? <p className="settings-status error">{error}</p> : null}
    </section>
  );
}
