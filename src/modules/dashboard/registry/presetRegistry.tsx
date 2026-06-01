import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WidgetPreset } from "../types";

export interface PresetChromeProps {
  title: string;
  icon: ReactNode;
  body: ReactNode;
  controls?: ReactNode;
  editMode: boolean;
  glass?: boolean;
  hideTitle?: boolean;
  /** When provided, the title becomes inline-editable via double-click. */
  onTitleCommit?: (next: string | null) => void;
}

/**
 * Widget title that turns into an inline text field on double-click. Committing
 * an empty value clears the custom title and reverts to the default. Used by the
 * panel and hero presets, whose chrome shows a title bar.
 */
function EditableTitle({
  title,
  className,
  onTitleCommit,
}: {
  title: string;
  className: string;
  onTitleCommit?: (next: string | null) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipBlur = useRef(false);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    input?.focus();
    input?.select();
  }, [editing]);

  if (!onTitleCommit) {
    return <h3 className={className}>{title}</h3>;
  }

  function commit(value: string) {
    const trimmed = value.trim();
    onTitleCommit!(trimmed.length === 0 ? null : trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        aria-label={t("dashboard.titleLabel")}
        className={`${className} dw-title-input`}
        defaultValue={title}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          if (skipBlur.current) {
            skipBlur.current = false;
            setEditing(false);
            return;
          }
          commit(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(e.currentTarget.value);
          } else if (e.key === "Escape") {
            e.preventDefault();
            skipBlur.current = true;
            e.currentTarget.blur();
          }
        }}
      />
    );
  }

  return (
    <h3
      className={className}
      title={t("dashboard.renameTitleHint")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {title}
    </h3>
  );
}

function PanelChrome({ title, icon, body, controls, editMode, onTitleCommit }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-panel">
      <div className={`dw-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-icon">{icon}</span>
        <EditableTitle title={title} className="dw-title" onTitleCommit={onTitleCommit} />
        {controls}
      </div>
      <div className="dw-body">{body}</div>
    </div>
  );
}

function AmbientChrome({ title, body, controls, editMode, glass, hideTitle }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-ambient${glass ? " dw-preset-ambient--glass" : ""}${editMode ? " drag-handle" : ""}`}>
      {hideTitle ? controls : (
        <div className="dw-ambient-label">
          <span className="dw-dot" />
          {title}
          {controls}
        </div>
      )}
      {body}
    </div>
  );
}

function HeroChrome({ title, icon, body, controls, editMode, onTitleCommit }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-hero">
      <div className={`dw-hero-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-hero-icon">{icon}</span>
        <EditableTitle title={title} className="dw-hero-title" onTitleCommit={onTitleCommit} />
        {controls}
      </div>
      <div className="dw-hero-body">{body}</div>
    </div>
  );
}

export const PRESET_RENDERERS: Record<WidgetPreset, (p: PresetChromeProps) => ReactElement> = {
  panel: PanelChrome,
  ambient: AmbientChrome,
  hero: HeroChrome,
};
