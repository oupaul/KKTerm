import { useEffect, useRef, useState } from "react";
import { FolderOpen, Palette, RefreshCw, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  loadCustomFontOptions,
  normalizeAvailableAppearance,
} from "../../lib/customFonts";
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
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { AppearanceSettings as AppearanceSettingsType, ColorScheme } from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";

/** CSS font stack for an OS font family picked from the system font list. */
function appSystemFontCssValue(family: string) {
  return `"${family}", ui-sans-serif, system-ui, sans-serif`;
}

const COLOR_SCHEME_OPTIONS: { value: ColorScheme; labelKey: string }[] = [
  { value: "default", labelKey: "settings.schemeDefault" },
  { value: "dark", labelKey: "settings.schemeDark" },
  { value: "light", labelKey: "settings.schemeLight" },
  { value: "match-os", labelKey: "settings.schemeMatchOs" },
  { value: "mac", labelKey: "settings.schemeMac" },
  { value: "orange", labelKey: "settings.schemeOrange" },
  { value: "purple", labelKey: "settings.schemePurple" },
  { value: "pink", labelKey: "settings.schemePink" },
  { value: "green-kuai-kuai", labelKey: "settings.schemeGreenKuaiKuai" },
  { value: "blue-see", labelKey: "settings.schemeBlueSee" },
  { value: "blue-green-white", labelKey: "settings.schemeBlueGreenWhite" },
  { value: "confetti", labelKey: "settings.schemeConfetti" },
  { value: "bubble-tea", labelKey: "settings.schemeBubbleTea" },
  { value: "semiconductor", labelKey: "settings.schemeSemiconductor" },
];

type SchemePreviewColor = { color: string; labelKey: string };

const SCHEME_PREVIEW_COLORS: Record<ColorScheme, SchemePreviewColor[]> = {
  default: [
    { color: "#ececed", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#1d1d1f", labelKey: "settings.text" },
    { color: "#0a84ff", labelKey: "settings.accent" },
    { color: "#34c759", labelKey: "settings.green" },
    { color: "#202936", labelKey: "settings.navToolbar" },
    { color: "#d8e1ef", labelKey: "settings.toolbarText" },
  ],
  dark: [
    { color: "#1c1c1e", labelKey: "settings.appBg" },
    { color: "#28282a", labelKey: "settings.surface" },
    { color: "#f5f5f7", labelKey: "settings.text" },
    { color: "#0a84ff", labelKey: "settings.accent" },
    { color: "#32d74b", labelKey: "settings.green" },
    { color: "#202936", labelKey: "settings.navToolbar" },
    { color: "#d8e1ef", labelKey: "settings.toolbarText" },
  ],
  light: [
    { color: "#ffffff", labelKey: "settings.appBg" },
    { color: "#f5f7fa", labelKey: "settings.surface" },
    { color: "#0a1628", labelKey: "settings.text" },
    { color: "#1d4ed8", labelKey: "settings.accent" },
    { color: "#0d6b3d", labelKey: "settings.green" },
    { color: "#202936", labelKey: "settings.navToolbar" },
    { color: "#d8e1ef", labelKey: "settings.toolbarText" },
  ],
  "match-os": [
    { color: "#ffffff", labelKey: "settings.appBg" },
    { color: "#2b303b", labelKey: "settings.surface" },
    { color: "#0a1628", labelKey: "settings.text" },
    { color: "#2563eb", labelKey: "settings.accent" },
    { color: "#0d6b3d", labelKey: "settings.green" },
    { color: "#202936", labelKey: "settings.navToolbar" },
    { color: "#d8e1ef", labelKey: "settings.toolbarText" },
  ],
  mac: [
    { color: "#ececec", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#1d1d1f", labelKey: "settings.text" },
    { color: "#0071e3", labelKey: "settings.accent" },
    { color: "#34c759", labelKey: "settings.green" },
    { color: "#e4e4e8", labelKey: "settings.navToolbar" },
    { color: "#1d1d1f", labelKey: "settings.toolbarText" },
  ],
  orange: [
    { color: "#fff0d6", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#102047", labelKey: "settings.text" },
    { color: "#ff6f00", labelKey: "settings.accent" },
    { color: "#2db833", labelKey: "settings.green" },
    { color: "#ff7900", labelKey: "settings.navToolbar" },
    { color: "#ffffff", labelKey: "settings.toolbarText" },
  ],
  purple: [
    { color: "#1e1836", labelKey: "settings.appBg" },
    { color: "#2d2650", labelKey: "settings.surface" },
    { color: "#e8e4f4", labelKey: "settings.text" },
    { color: "#a78bfa", labelKey: "settings.accent" },
    { color: "#4ade80", labelKey: "settings.green" },
    { color: "#1b1536", labelKey: "settings.navToolbar" },
    { color: "#ece6ff", labelKey: "settings.toolbarText" },
  ],
  pink: [
    { color: "#fff0f5", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#2d1b3a", labelKey: "settings.text" },
    { color: "#c026d3", labelKey: "settings.accent" },
    { color: "#15803d", labelKey: "settings.green" },
    { color: "#5a2148", labelKey: "settings.navToolbar" },
    { color: "#ffe3f1", labelKey: "settings.toolbarText" },
  ],
  "green-kuai-kuai": [
    { color: "#ffffff", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#082d68", labelKey: "settings.text" },
    { color: "#d71920", labelKey: "settings.accent" },
    { color: "#62bd2f", labelKey: "settings.green" },
    { color: "#a7ec5a", labelKey: "settings.navToolbar" },
    { color: "#082d68", labelKey: "settings.toolbarText" },
  ],
  "blue-see": [
    { color: "#0c1929", labelKey: "settings.appBg" },
    { color: "#182840", labelKey: "settings.surface" },
    { color: "#d8e6f4", labelKey: "settings.text" },
    { color: "#4da6ff", labelKey: "settings.accent" },
    { color: "#3fb87b", labelKey: "settings.green" },
    { color: "#0a1525", labelKey: "settings.navToolbar" },
    { color: "#c8dcf0", labelKey: "settings.toolbarText" },
  ],
  "blue-green-white": [
    { color: "#ffffff", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#111827", labelKey: "settings.text" },
    { color: "#1fa0cb", labelKey: "settings.accent" },
    { color: "#73c82d", labelKey: "settings.green" },
    { color: "#1fa0cb", labelKey: "settings.navToolbar" },
    { color: "#ffffff", labelKey: "settings.toolbarText" },
  ],
  confetti: [
    { color: "#fef9f0", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#2d1f3a", labelKey: "settings.text" },
    { color: "#e040b0", labelKey: "settings.accent" },
    { color: "#2eaa6a", labelKey: "settings.green" },
    { color: "#3a2550", labelKey: "settings.navToolbar" },
    { color: "#f0e0f8", labelKey: "settings.toolbarText" },
  ],
  "bubble-tea": [
    { color: "#faf3e6", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#3b2216", labelKey: "settings.text" },
    { color: "#c47a38", labelKey: "settings.accent" },
    { color: "#6b8e4e", labelKey: "settings.green" },
    { color: "#3b2216", labelKey: "settings.navToolbar" },
    { color: "#f5e6d0", labelKey: "settings.toolbarText" },
  ],
  semiconductor: [
    { color: "#f4f4f4", labelKey: "settings.appBg" },
    { color: "#ffffff", labelKey: "settings.surface" },
    { color: "#111111", labelKey: "settings.text" },
    { color: "#e60012", labelKey: "settings.accent" },
    { color: "#147a3f", labelKey: "settings.green" },
    { color: "#111111", labelKey: "settings.navToolbar" },
    { color: "#ffffff", labelKey: "settings.toolbarText" },
  ],
};

export function AppearanceSettings({ onResetLayout }: { onResetLayout: () => void }) {
  const { t } = useTranslation();
  const appearanceSettings = useWorkspaceStore((state) => state.appearanceSettings);
  const setAppearanceSettings = useWorkspaceStore((state) => state.setAppearanceSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const {
    customFonts,
    systemFonts,
    refreshing: refreshingFonts,
    recommendationsSynced,
  } = useSystemFontCatalog();
  const [draft, setDraft] = useState<AppearanceSettingsType>(appearanceSettings);
  // Tracks the last persisted settings so we can revert live preview on navigate-away
  const savedRef = useRef<AppearanceSettingsType>(appearanceSettings);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(savedRef.current);

  // Revert live preview when navigating away without saving
  useEffect(() => {
    return () => {
      setAppearanceSettings(savedRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    try {
      const selectedCustomFont = customFonts.find((font) => font.cssValue === draft.appFontFamily);
      if (selectedCustomFont) {
        await loadCustomFontOptions([selectedCustomFont]);
      }
      const next: AppearanceSettingsType = {
        ...draft,
        customFontPath: selectedCustomFont?.path,
      };
      const saved = isTauriRuntime()
        ? await invokeCommand("update_appearance_settings", { request: next })
        : next;
      setAppearanceSettings(saved);
      setDraft(saved);
      savedRef.current = saved;
      showStatusBarNotice(t("settings.appearanceSaved"), { tone: "success" });
    } catch (saveError) {
      showStatusBarNotice(
        saveError instanceof Error ? saveError.message : String(saveError),
        { tone: "error" },
      );
    }
  }

  useEffect(() => {
    let disposed = false;
    if (!isTauriRuntime()) {
      return () => {
        disposed = true;
      };
    }

    void loadSharedCustomFonts()
      .then((fonts) => {
        if (disposed) return;
        const base = savedRef.current;
        const normalized = normalizeAvailableAppearance(base, fonts);
        if (JSON.stringify(normalized) !== JSON.stringify(base)) {
          savedRef.current = normalized;
          setDraft(normalized);
          setAppearanceSettings(normalized);
          invokeCommand("update_appearance_settings", { request: normalized }).catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, []);

  async function handleOpenCustomFontsFolder() {
    if (!isTauriRuntime()) {
      return;
    }
    await invokeCommand("open_custom_fonts_folder");
  }

  async function handleRefreshSystemFonts() {
    if (!isSystemFontAccessSupported()) {
      showStatusBarNotice(t("settings.systemFontsUnavailable"), { tone: "error" });
      return;
    }
    try {
      await refreshSharedFontCatalog();
      showStatusBarNotice(t("settings.systemFontsRefreshed"), { tone: "success" });
    } catch (refreshError) {
      showStatusBarNotice(
        refreshError instanceof Error ? refreshError.message : String(refreshError),
        { tone: "error" },
      );
    }
  }

  const previewColors = SCHEME_PREVIEW_COLORS[draft.colorScheme];
  const appFontOptions = getRecommendedFontOptions(
    "app-ui",
    undefined,
    recommendationsSynced ? systemFonts : undefined,
  );
  const curatedAppFontFamilies = appFontOptions.flatMap((option) => option.family ? [option.family] : []);
  const systemFontOptions = systemFontsExcluding(systemFonts, [
    ...curatedAppFontFamilies,
    ...customFonts.map((font) => font.name),
  ]).map((family) => ({ family, value: appSystemFontCssValue(family) }));
  const knownFontSelected = appFontOptions.some((option) => option.value === draft.appFontFamily);
  const customFontSelected = customFonts.some((font) => font.cssValue === draft.appFontFamily);
  const systemFontSelected = systemFontOptions.some((option) => option.value === draft.appFontFamily);

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<Palette size={18} />}
        label={t("settings.sectionAppearance")}
        title={t("settings.appearanceInterface")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.typography")}</legend>
        <div>
          <p className="field-hint">{t("settings.typographyHint")}</p>
        </div>
        <div className="form-grid appearance-font-grid">
          <label data-tutorial-id="settings.appUiFontFamily">
            <span>{t("settings.appUiFontFamily")}</span>
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
                  const selectedValue = event.currentTarget.value;
                  setDraft((s) => {
                    const next = { ...s, appFontFamily: selectedValue };
                    setAppearanceSettings(next);
                    return next;
                  });
                }}
                value={draft.appFontFamily}
              >
                {knownFontSelected || customFontSelected || systemFontSelected ? null : (
                  <option value={draft.appFontFamily}>{t("settings.customFont")}</option>
                )}
                {customFonts.length > 0 ? <optgroup label={t("settings.customFonts")}>{customFonts.map((font) => (
                  <option key={font.path} value={font.cssValue}>
                    {font.name}
                  </option>
                ))}</optgroup> : null}
                <optgroup label={t("settings.recommendedFonts")}>
                  {appFontOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.labelKey ? t(option.labelKey) : option.label}
                    </option>
                  ))}
                </optgroup>
                {systemFontOptions.length > 0 ? (
                  <optgroup label={t("settings.systemFonts")}>
                    {systemFontOptions.map((option) => (
                      <option key={option.family} value={option.value}>
                        {option.family}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <button
                aria-label={t("settings.openCustomFontsFolder")}
                className="toolbar-button"
                onClick={() => void handleOpenCustomFontsFolder()}
                title={t("settings.openCustomFontsFolder")}
                type="button"
              >
                <FolderOpen size={15} />
              </button>
            </div>
            <small className="field-hint">{t("settings.customFontsHint")}</small>
          </label>
        </div>
      </fieldset>
      <fieldset
        className="settings-subsection settings-fieldset"
        data-tutorial-id="settings.appearance.colorScheme"
      >
        <legend>{t("settings.theme")}</legend>
        <div>
          <p className="field-hint">{t("settings.themeHint")}</p>
        </div>
        <div className="form-grid appearance-font-grid">
          <label>
            <span>{t("settings.colorScheme")}</span>
            <select
              onChange={(event) => {
                const colorScheme = event.currentTarget.value as ColorScheme;
                setDraft((s) => {
                  const next = { ...s, colorScheme };
                  setAppearanceSettings(next);
                  return next;
                });
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
            {previewColors.map((previewColor) => (
              <div
                key={previewColor.labelKey}
                className="color-scheme-preview-swatch"
                style={{ background: previewColor.color }}
              >
                <span className="color-scheme-preview-swatch-label">
                  {t(previewColor.labelKey)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </fieldset>
      <div
        className="settings-reset-layout"
        data-tutorial-id="settings.resetLayout"
      >
        <div>
          <strong>{t("settings.layout")}</strong>
          <span>{t("settings.resetLayoutDescription")}</span>
        </div>
        <button className="toolbar-button" onClick={onResetLayout} type="button">
          <RotateCcw size={15} />
          {t("settings.resetLayout")}
        </button>
      </div>
    </section>
  );
}
