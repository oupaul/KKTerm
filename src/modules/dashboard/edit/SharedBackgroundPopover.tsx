import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isTauriRuntime, openExternalUrl } from "../../../lib/tauri";
import { BACKGROUND_PRESETS } from "../registry/backgroundPresets";
import { DYNAMIC_BACKGROUNDS } from "../registry/dynamicBackgrounds";
import { importBackgroundImage } from "../state/persistence";
import { BACKGROUND_FITS, type BackgroundFit, type DashboardBackground } from "../types";

type Mode = "default" | "preset" | "media" | "dynamic";
type MediaBackground = Extract<DashboardBackground, { kind: "image" | "video" }>;

function modeOf(background: DashboardBackground | null): Mode {
  if (!background) return "default";
  if (background.kind === "preset") return "preset";
  if (background.kind === "dynamic") return "dynamic";
  return "media";
}

function isMediaBackground(background: DashboardBackground | null): background is MediaBackground {
  return background?.kind === "image" || background?.kind === "video";
}

function mediaKindForFile(file: string): "image" | "video" {
  return /\.(mp4|webm|mov|m4v|ogv)$/i.test(file) ? "video" : "image";
}

export interface SharedBackgroundPopoverProps {
  background: DashboardBackground | null;
  titleKey: string;
  defaultHintKey: string;
  className?: string;
  onBackgroundChange: (background: DashboardBackground | null) => void | Promise<void>;
  onLoadBackgroundImage: (file: string) => void | Promise<void>;
  onClose: () => void;
}

export function SharedBackgroundPopover({
  background,
  titleKey,
  defaultHintKey,
  className = "",
  onBackgroundChange,
  onLoadBackgroundImage,
  onClose,
}: SharedBackgroundPopoverProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>(modeOf(background));
  const [importError, setImportError] = useState("");
  const mediaBackground = isMediaBackground(background) ? background : null;

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function applyDefault() {
    setMode("default");
    void onBackgroundChange(null);
  }

  function applyPreset(presetId: string) {
    setMode("preset");
    void onBackgroundChange({ kind: "preset", preset: presetId });
  }

  function applyDynamic(dynamicId: string) {
    setMode("dynamic");
    void onBackgroundChange({ kind: "dynamic", dynamic: dynamicId });
  }

  function applyMediaPatch(patch: Partial<Omit<MediaBackground, "kind">>) {
    const base: MediaBackground = mediaBackground ?? { kind: "image", file: "", fit: "fill", dim: 0 };
    if (!base.file && !patch.file) return;
    void onBackgroundChange({ ...base, ...patch });
  }

  async function chooseMedia() {
    setImportError("");
    try {
      let sourcePath: string | null = null;
      if (isTauriRuntime()) {
        const selected = await openDialog({
          directory: false,
          multiple: false,
          title: t("dashboard.backgroundChooseMedia"),
          filters: [{
            name: t("dashboard.backgroundMediaFilter"),
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "mp4", "webm", "mov", "m4v", "ogv"],
          }],
        });
        sourcePath = typeof selected === "string" ? selected : null;
      } else {
        sourcePath = "preview-media.png";
      }
      if (!sourcePath) return;
      const file = await importBackgroundImage(sourcePath);
      await onLoadBackgroundImage(file);
      setMode("media");
      const base = mediaBackground ?? { fit: "fill" as BackgroundFit, dim: 0 };
      void onBackgroundChange({ kind: mediaKindForFile(file), file, fit: base.fit, dim: base.dim });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div ref={ref} className={["dw-bg-popover", className].filter(Boolean).join(" ")}>
      <header className="dw-bg-popover-head">{t(titleKey)}</header>

      <div className="dw-bg-seg">
        <button className={mode === "default" ? "active" : ""} onClick={applyDefault} type="button">
          {t("dashboard.backgroundModeDefault")}
        </button>
        <button className={mode === "preset" ? "active" : ""} onClick={() => setMode("preset")} type="button">
          {t("dashboard.backgroundModePreset")}
        </button>
        <button className={mode === "media" ? "active" : ""} onClick={() => setMode("media")} type="button">
          {t("dashboard.backgroundModeMedia")}
        </button>
        <button className={mode === "dynamic" ? "active" : ""} onClick={() => setMode("dynamic")} type="button">
          {t("dashboard.backgroundModeDynamic")}
        </button>
      </div>

      {mode === "default" && <p className="dw-muted">{t(defaultHintKey)}</p>}

      {mode === "preset" && (
        <div className="dw-bg-preset-grid">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={background?.kind === "preset" && background.preset === preset.id ? "active" : ""}
              style={{ background: preset.css }}
              title={t(preset.labelKey)}
              aria-label={t(preset.labelKey)}
              onClick={() => applyPreset(preset.id)}
              type="button"
            />
          ))}
        </div>
      )}

      {mode === "dynamic" && (
        <div className="dw-bg-dynamic">
          <div className="dw-bg-dynamic-grid">
            {DYNAMIC_BACKGROUNDS.map((backgroundOption) => (
              <button
                key={backgroundOption.id}
                className={background?.kind === "dynamic" && background.dynamic === backgroundOption.id ? "active" : ""}
                onClick={() => applyDynamic(backgroundOption.id)}
                type="button"
              >
                {t(backgroundOption.labelKey)}
              </button>
            ))}
          </div>
          <p className="dw-warning-text">{t("dashboard.backgroundDynamicHint")}</p>
        </div>
      )}

      {mode === "media" && (
        <div className="dw-bg-image">
          <div className="dw-bg-image-actions">
            <button className="dw-secondary-button" onClick={() => { void chooseMedia(); }} type="button">
              {t("dashboard.backgroundChooseMedia")}
            </button>
            {mediaBackground && (
              <button className="dw-secondary-button" onClick={applyDefault} type="button">
                {t("dashboard.backgroundRemoveImage")}
              </button>
            )}
          </div>
          <p className="dw-muted">
            {t("dashboard.backgroundMediaSourcePrefix")}{" "}
            <a
              href="https://pixabay.com/videos/search/wallpaper"
              onClick={(event) => {
                event.preventDefault();
                void openExternalUrl("https://pixabay.com/videos/search/wallpaper");
              }}
            >
              {t("dashboard.backgroundMediaSourceLink")}
            </a>
          </p>
          {importError && <small className="dw-muted">{importError}</small>}
          {mediaBackground && (
            <>
              <label className="dw-field">
                <span>{t("dashboard.backgroundFitLabel")}</span>
                <select
                  value={mediaBackground.fit}
                  onChange={(event) => applyMediaPatch({ fit: event.target.value as BackgroundFit })}
                >
                  {BACKGROUND_FITS.map((fit) => (
                    <option key={fit} value={fit}>{t(`dashboard.backgroundFit.${fit}`)}</option>
                  ))}
                </select>
              </label>
              <label className="dw-field">
                <span>{t("dashboard.backgroundDimLabel")}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={mediaBackground.dim}
                  onChange={(event) => applyMediaPatch({ dim: Number(event.target.value) })}
                />
                <small className="dw-muted">{mediaBackground.dim}</small>
              </label>
            </>
          )}
          {!mediaBackground && <p className="dw-muted">{t("dashboard.backgroundMediaHint")}</p>}
        </div>
      )}
    </div>
  );
}
