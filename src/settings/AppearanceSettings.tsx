import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { defaultAppearanceSettings } from "../sample-data";
import { useWorkspaceStore } from "../store";
import type { AppearanceSettings as AppearanceSettingsType, ColorScheme } from "../types";

const APP_UI_FONT_OPTIONS = [
  {
    labelKey: "settings.satoshiDefault",
    value: defaultAppearanceSettings.appFontFamily,
  },
  {
    labelKey: "settings.jfOpenHuninn",
    value: '"JF Open Huninn", "Microsoft JhengHei UI", "Microsoft YaHei UI", "Segoe UI", sans-serif',
  },
  {
    labelKey: "settings.segoeUi",
    value: '"Segoe UI", ui-sans-serif, system-ui, sans-serif',
  },
  {
    labelKey: "settings.arial",
    value: 'Arial, "Segoe UI", sans-serif',
  },
  {
    labelKey: "settings.microsoftJhengHeiUi",
    value: '"Microsoft JhengHei UI", "Segoe UI", sans-serif',
  },
  {
    labelKey: "settings.microsoftYaHeiUi",
    value: '"Microsoft YaHei UI", "Segoe UI", sans-serif',
  },
  {
    labelKey: "settings.yuGothicUi",
    value: '"Yu Gothic UI", "Segoe UI", sans-serif',
  },
  {
    labelKey: "settings.malgunGothic",
    value: '"Malgun Gothic", "Segoe UI", sans-serif',
  },
  {
    labelKey: "settings.tahoma",
    value: 'Tahoma, "Segoe UI", sans-serif',
  },
  {
    labelKey: "settings.consolas",
    value: 'Consolas, "Segoe UI", sans-serif',
  },
] as const;

const COLOR_SCHEME_OPTIONS: { value: ColorScheme; labelKey: string }[] = [
  { value: "default", labelKey: "settings.schemeDefault" },
  { value: "dark", labelKey: "settings.schemeDark" },
  { value: "light", labelKey: "settings.schemeLight" },
  { value: "mac", labelKey: "settings.schemeMac" },
  { value: "orange", labelKey: "settings.schemeOrange" },
  { value: "purple", labelKey: "settings.schemePurple" },
  { value: "pink", labelKey: "settings.schemePink" },
];

const SCHEME_PREVIEW_LABELS = ["settings.appBg", "settings.surface", "settings.text", "settings.accent", "settings.green"] as const;

const SCHEME_PREVIEW_COLORS: Record<ColorScheme, string[]> = {
  default: ["#eef1f5", "#ffffff", "#17202b", "#2563eb", "#15915f"],
  dark: ["#1a1d24", "#2b303b", "#e4e7ee", "#4b8bff", "#3fb87b"],
  light: ["#ffffff", "#f5f7fa", "#0a1628", "#1d4ed8", "#0d6b3d"],
  mac: ["#ececec", "#ffffff", "#1d1d1f", "#0071e3", "#34c759"],
  orange: ["#fff5ec", "#ffffff", "#1a1a1a", "#e87a00", "#2d8a4e"],
  purple: ["#1e1836", "#2d2650", "#e8e4f4", "#a78bfa", "#4ade80"],
  pink: ["#fff0f5", "#ffffff", "#2d1b3a", "#c026d3", "#15803d"],
};

function normalizeAppearanceSettingsDraft(settings: AppearanceSettingsType): AppearanceSettingsType {
  if (!settings.appFontFamily.trim()) {
    throw new Error("App UI font family is required.");
  }

  return {
    ...settings,
    appFontFamily: settings.appFontFamily.trim(),
  };
}

export function AppearanceSettings({ onResetLayout }: { onResetLayout: () => void }) {
  const { t } = useTranslation();
  const appearanceSettings = useWorkspaceStore((state) => state.appearanceSettings);
  const setAppearanceSettings = useWorkspaceStore((state) => state.setAppearanceSettings);
  const [draft, setDraft] = useState(appearanceSettings);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(appearanceSettings);

  useEffect(() => {
    setDraft(appearanceSettings);
  }, [appearanceSettings]);

  async function handleSave() {
    try {
      setError("");
      setStatus("");
      const nextSettings = normalizeAppearanceSettingsDraft(draft);
      const saved = isTauriRuntime()
        ? await invokeCommand("update_appearance_settings", { request: nextSettings })
        : nextSettings;
      setAppearanceSettings(saved);
      setDraft(saved);
      setStatus(t("settings.appearanceSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const previewColors = SCHEME_PREVIEW_COLORS[draft.colorScheme];

  return (
    <section className="settings-card settings-section">
      <div className="settings-section-header">
        <div>
          <p className="panel-label">{t("settings.sectionAppearance")}</p>
          <h2>{t("settings.appearanceInterface")}</h2>
        </div>
        <div className="settings-header-actions">
          <button
            className="toolbar-button"
            disabled={!hasChanges}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save size={15} />
            {t("settings.save")}
          </button>
        </div>
      </div>
      <div className="form-grid appearance-font-grid">
        <label>
          <span>{t("settings.appUiFontFamily")}</span>
          <select
            onChange={(event) => {
              const appFontFamily = event.currentTarget.value;
              setDraft((settings) => ({
                ...settings,
                appFontFamily,
              }));
            }}
            value={draft.appFontFamily}
          >
            {APP_UI_FONT_OPTIONS.some((option) => option.value === draft.appFontFamily) ? null : (
              <option value={draft.appFontFamily}>{t("settings.customFont")}</option>
            )}
            {APP_UI_FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("settings.colorScheme")}</span>
          <select
            onChange={(event) => {
              const colorScheme = event.currentTarget.value as ColorScheme;
              setDraft((settings) => ({
                ...settings,
                colorScheme,
              }));
            }}
            value={draft.colorScheme}
          >
            {COLOR_SCHEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="color-scheme-preview" aria-label={t("settings.colorSchemePreview")}>
        <span className="color-scheme-preview-label">{t("settings.colorSchemePreview")}</span>
        <div className="color-scheme-preview-swatches">
          {previewColors.map((color, i) => (
            <div
              key={i}
              className="color-scheme-preview-swatch"
              style={{ background: color }}
            >
              <span className="color-scheme-preview-swatch-label">
                {t(SCHEME_PREVIEW_LABELS[i])}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="settings-reset-layout">
        <div>
          <strong>{t("settings.layout")}</strong>
          <span>{t("settings.resetLayoutDescription")}</span>
        </div>
        <button className="toolbar-button" onClick={onResetLayout} type="button">
          <RotateCcw size={15} />
          {t("settings.resetLayout")}
        </button>
      </div>
      {status ? (
        <p className="settings-status success">{status}</p>
      ) : null}
      {error ? <p className="settings-status error">{error}</p> : null}
    </section>
  );
}
