import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ariaPressed } from "../../../lib/aria";

// Apple system hues, matching the connection-dialog redesign palette verbatim.
const CONNECTION_ICON_BACKGROUND_COLORS = [
  { name: "blue", color: "#0a84ff" },
  { name: "indigo", color: "#5e5ce6" },
  { name: "purple", color: "#bf5af2" },
  { name: "red", color: "#ff375f" },
  { name: "amber", color: "#ff9f0a" },
  { name: "green", color: "#34c759" },
  { name: "teal", color: "#30b0c7" },
  { name: "gray", color: "#8e8e93" },
  { name: "white", color: "#ffffff" },
];

export function ConnectionIconBackgroundPicker({
  color,
  onChange,
}: {
  color?: string | null;
  onChange: (color: string | null) => void;
}) {
  const { t } = useTranslation();
  const currentColor = color ?? null;

  return (
    <div className="connection-swatches" role="group" aria-label={t("connections.iconBackground")}>
      <button
        aria-label={t("connections.transparentIconBackground")}
        className={currentColor === null ? "connection-swatch none selected" : "connection-swatch none"}
        onClick={() => onChange(null)}
        type="button"
        {...ariaPressed(currentColor === null)}
      />
      {CONNECTION_ICON_BACKGROUND_COLORS.map((accent) => {
        const selected = currentColor?.toLowerCase() === accent.color.toLowerCase();
        return (
          <button
            aria-label={t("connections.selectIconBackground", { color: accent.name })}
            className={selected ? "connection-swatch selected" : "connection-swatch"}
            key={accent.name}
            onClick={() => onChange(accent.color)}
            style={{ "--connection-swatch": accent.color } as CSSProperties}
            type="button"
            {...ariaPressed(selected)}
          />
        );
      })}
    </div>
  );
}
