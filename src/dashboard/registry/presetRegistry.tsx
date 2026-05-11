import type { ReactElement, ReactNode } from "react";
import type { WidgetPreset } from "../types";

export interface PresetChromeProps {
  title: string;
  icon: ReactNode;
  body: ReactNode;
  controls?: ReactNode;
  editMode: boolean;
}

function PanelChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-panel">
      <div className={`dw-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-icon">{icon}</span>
        <h3 className="dw-title">{title}</h3>
        {controls}
      </div>
      <div className="dw-body">{body}</div>
    </div>
  );
}

function AmbientChrome({ title, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-ambient${editMode ? " drag-handle" : ""}`}>
      <div className="dw-ambient-label">
        <span className="dw-dot" />
        {title}
        {controls}
      </div>
      {body}
    </div>
  );
}

function GlassChrome({ title, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-glass${editMode ? " drag-handle" : ""}`}>
      <div className="dw-ambient-label">
        <span className="dw-dot" />
        {title}
        {controls}
      </div>
      {body}
    </div>
  );
}

function TileChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-tile${editMode ? " drag-handle" : ""}`}>
      <div className="dw-tile-head">
        <span className="dw-tile-label">{title}</span>
        <span className="dw-tile-icon">{icon}</span>
        {controls}
      </div>
      <div className="dw-tile-body">{body}</div>
    </div>
  );
}

function HeroChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-hero">
      <div className={`dw-hero-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-hero-icon">{icon}</span>
        <h3 className="dw-hero-title">{title}</h3>
        {controls}
      </div>
      <div className="dw-hero-body">{body}</div>
    </div>
  );
}

function MonoChrome({ title, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-mono">
      <div className={`dw-mono-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-mono-lights"><span/><span/><span/></span>
        <span className="dw-mono-title">{title}</span>
        {controls}
      </div>
      <div className="dw-mono-body">{body}</div>
    </div>
  );
}

function StackChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-stack">
      <div className={`dw-stack-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-icon">{icon}</span>
        <h3 className="dw-title">{title}</h3>
        {controls}
      </div>
      <div className="dw-stack-body">{body}</div>
    </div>
  );
}

function ActionChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-action${editMode ? " drag-handle" : ""}`}>
      <span className="dw-action-icon">{icon}</span>
      <div className="dw-action-body">
        <h3 className="dw-action-title">{title}</h3>
        {body}
      </div>
      {controls}
    </div>
  );
}

function BandChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-band${editMode ? " drag-handle" : ""}`}>
      <span className="dw-band-icon">{icon}</span>
      <div className="dw-band-body">
        <h3 className="dw-band-title">{title}</h3>
        {body}
      </div>
      {controls}
    </div>
  );
}

export const PRESET_RENDERERS: Record<WidgetPreset, (p: PresetChromeProps) => ReactElement> = {
  panel: PanelChrome,
  ambient: AmbientChrome,
  glass: GlassChrome,
  tile: TileChrome,
  hero: HeroChrome,
  mono: MonoChrome,
  stack: StackChrome,
  action: ActionChrome,
  band: BandChrome,
};
