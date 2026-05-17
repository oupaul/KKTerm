import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../registry/builtInRegistry";
import { useWidgetConfig } from "./widgetLocalStorage";

type NotesColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple" | "white";
type NotesFont = "handwriting" | "marker" | "system" | "serif" | "mono";

interface NotesConfig {
  text: string;
  color: NotesColor;
  font: NotesFont;
}

const DEFAULT_CONFIG: NotesConfig = {
  text: "",
  color: "yellow",
  font: "handwriting",
};

const COLOR_VALUES: NotesColor[] = ["yellow", "pink", "blue", "green", "orange", "purple", "white"];
const FONT_VALUES: NotesFont[] = ["handwriting", "marker", "system", "serif", "mono"];

function storageKey(instanceId: string) {
  return `kkterm.dashboard.notes.${instanceId}.v1`;
}

function normalizeNotesConfig(value: unknown): NotesConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_CONFIG;
  }
  const candidate = value as Partial<NotesConfig>;
  return {
    text: typeof candidate.text === "string" ? candidate.text : "",
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

export function NotesBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeNotesConfig,
  );

  return (
    <div className={`dw-notes dw-notes--color-${config.color} dw-notes--font-${config.font}`}>
      <textarea
        className="dw-notes-text"
        value={config.text}
        onChange={(e) => setConfig({ ...config, text: e.target.value })}
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
