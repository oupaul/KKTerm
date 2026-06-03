import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";

type NotesColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple" | "white";
type NotesFont = "handwriting" | "marker" | "system" | "serif" | "mono";

interface NotesConfig {
  pages: string[];
  color: NotesColor;
  font: NotesFont;
}

interface NotesWidgetSettings {
  rotationDegrees: number;
}

const DEFAULT_CONFIG: NotesConfig = {
  pages: [""],
  color: "yellow",
  font: "handwriting",
};

const DEFAULT_SETTINGS: NotesWidgetSettings = {
  rotationDegrees: -0.6,
};

const DELETE_ANIMATION_MS = 220;

const COLOR_VALUES: NotesColor[] = ["yellow", "pink", "blue", "green", "orange", "purple", "white"];
const FONT_VALUES: NotesFont[] = ["handwriting", "marker", "system", "serif", "mono"];

function storageKey(instanceId: string) {
  return `kkterm.dashboard.notes.${instanceId}.v1`;
}

function normalizeNotesConfig(value: unknown): NotesConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_CONFIG;
  }
  const candidate = value as Partial<NotesConfig> & { text?: unknown; pages?: unknown };
  const pages = Array.isArray(candidate.pages)
    ? candidate.pages.filter((page): page is string => typeof page === "string")
    : (typeof candidate.text === "string" ? [candidate.text] : []);
  return {
    pages: pages.length > 0 ? pages : [""],
    color:
      typeof candidate.color === "string" && COLOR_VALUES.includes(candidate.color as NotesColor)
        ? (candidate.color as NotesColor)
        : "yellow",
    font:
      typeof candidate.font === "string" && FONT_VALUES.includes(candidate.font as NotesFont)
        ? (candidate.font as NotesFont)
        : "handwriting",
  };
}

export function randomNotesRotationDegrees() {
  return Math.round(((Math.random() * 2.4) - 1.2) * 10) / 10;
}

export function parseNotesSettingsJson(settingsValuesJson: string): NotesWidgetSettings {
  try {
    const parsed = JSON.parse(settingsValuesJson) as Partial<NotesWidgetSettings>;
    const rotationDegrees = typeof parsed.rotationDegrees === "number"
      ? Math.max(-3, Math.min(3, parsed.rotationDegrees))
      : DEFAULT_SETTINGS.rotationDegrees;
    return { rotationDegrees };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function NotesBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeNotesConfig,
  );
  const settings = useMemo(
    () => parseNotesSettingsJson(instance.settingsValuesJson),
    [instance.settingsValuesJson],
  );
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [tearingPageIndex, setTearingPageIndex] = useState<number | null>(null);
  const activePage = config.pages[activePageIndex] ?? "";

  useEffect(() => {
    if (activePageIndex >= config.pages.length) {
      setActivePageIndex(Math.max(0, config.pages.length - 1));
    }
  }, [activePageIndex, config.pages.length]);

  function updateActivePage(text: string) {
    const pages = [...config.pages];
    pages[activePageIndex] = text;
    setConfig({ ...config, pages });
  }

  function addPage() {
    const pages = [...config.pages, ""];
    setConfig({ ...config, pages });
    setActivePageIndex(pages.length - 1);
  }

  function deletePage() {
    if (config.pages.length <= 1 || tearingPageIndex !== null) {
      return;
    }
    const pageToDelete = activePageIndex;
    setTearingPageIndex(pageToDelete);
    window.setTimeout(() => {
      setConfig({
        ...config,
        pages: config.pages.filter((_, index) => index !== pageToDelete),
      });
      setActivePageIndex(Math.max(0, pageToDelete - 1));
      setTearingPageIndex(null);
    }, DELETE_ANIMATION_MS);
  }

  return (
    <div
      className={`dw-notes dw-notes--color-${config.color} dw-notes--font-${config.font}${tearingPageIndex === activePageIndex ? " is-tearing" : ""}`}
      style={{ "--note-rotation": `${settings.rotationDegrees}deg` } as CSSProperties}
    >
      <div className="dw-notes-page-actions" role="toolbar" aria-label={t("dashboard.notesPagesToolbarLabel")}>
        <button
          type="button"
          className="secondary-button dw-notes-page-button"
          aria-label={t("dashboard.notesAddPage")}
          title={t("dashboard.notesAddPage")}
          onClick={addPage}
        >
          <Plus size={14} />
        </button>
        {config.pages.length > 1 ? (
          <button
            type="button"
            className="secondary-button dw-notes-page-button"
            aria-label={t("dashboard.notesDeletePage")}
            title={t("dashboard.notesDeletePage")}
            onClick={deletePage}
          >
            <Minus size={14} />
          </button>
        ) : null}
      </div>
      <textarea
        className="dw-notes-text"
        value={activePage}
        onChange={(e) => updateActivePage(e.target.value)}
        placeholder={t("dashboard.notesPlaceholder")}
        aria-label={t("dashboard.notesAriaLabel")}
        spellCheck={false}
      />
      <div className="dw-notes-toolbar" role="toolbar" aria-label={t("dashboard.notesToolbarLabel")}>
        <div className="dw-notes-colors" role="radiogroup" aria-label={t("dashboard.notesBackgroundColor")}>
          {COLOR_VALUES.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={config.color === color}
              aria-label={t(`dashboard.notesColor.${color}`)}
              title={t(`dashboard.notesColor.${color}`)}
              className={`dw-notes-swatch dw-notes-swatch--${color}${config.color === color ? " is-active" : ""}`}
              onClick={() => setConfig({ ...config, color })}
            />
          ))}
        </div>
        {config.pages.length > 1 ? (
          <button
            type="button"
            className="dw-notes-page-indicator"
            aria-label={t("dashboard.notesPageIndicator", { page: activePageIndex + 1, total: config.pages.length })}
            title={t("dashboard.notesPageIndicator", { page: activePageIndex + 1, total: config.pages.length })}
            onClick={() => setActivePageIndex((activePageIndex + 1) % config.pages.length)}
          >
            {`<${activePageIndex + 1}>`}
          </button>
        ) : null}
        <select
          className="dw-notes-font-select"
          value={config.font}
          onChange={(e) => setConfig({ ...config, font: e.target.value as NotesFont })}
          aria-label={t("dashboard.notesFont")}
          title={t("dashboard.notesFont")}
        >
          {FONT_VALUES.map((font) => (
            <option key={font} value={font}>
              {t(`dashboard.notesFontOption.${font}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
