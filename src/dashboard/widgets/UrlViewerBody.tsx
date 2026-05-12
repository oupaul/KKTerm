import { ExternalLink, RefreshCw } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { openExternalUrl } from "../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../registry/builtInRegistry";
import { useWidgetConfig } from "./widgetLocalStorage";

export type UrlWidgetConfig = {
  url: string;
  reloadSeconds: number;
  zoomPercent: number;
  viewportXPercent: number;
  viewportYPercent: number;
  viewportWidthPercent: number;
  viewportHeightPercent: number;
};

const DEFAULT_CONFIG: UrlWidgetConfig = {
  url: "",
  reloadSeconds: 0,
  zoomPercent: 100,
  viewportXPercent: 0,
  viewportYPercent: 0,
  viewportWidthPercent: 100,
  viewportHeightPercent: 100,
};

function storageKey(instanceId: string) {
  return `kkterm.dashboard.urlViewer.${instanceId}.v1`;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeUrlWidgetConfig(value: unknown): UrlWidgetConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_CONFIG;
  }
  const candidate = value as Partial<UrlWidgetConfig>;
  return {
    url: normalizeUrl(candidate.url),
    reloadSeconds: clampNumber(candidate.reloadSeconds, DEFAULT_CONFIG.reloadSeconds, 0, 3600),
    zoomPercent: clampNumber(candidate.zoomPercent, DEFAULT_CONFIG.zoomPercent, 25, 250),
    viewportXPercent: clampNumber(candidate.viewportXPercent, DEFAULT_CONFIG.viewportXPercent, 0, 100),
    viewportYPercent: clampNumber(candidate.viewportYPercent, DEFAULT_CONFIG.viewportYPercent, 0, 100),
    viewportWidthPercent: clampNumber(
      candidate.viewportWidthPercent,
      DEFAULT_CONFIG.viewportWidthPercent,
      10,
      100,
    ),
    viewportHeightPercent: clampNumber(
      candidate.viewportHeightPercent,
      DEFAULT_CONFIG.viewportHeightPercent,
      10,
      100,
    ),
  };
}

export function viewportFrameStyle(config: UrlWidgetConfig): CSSProperties {
  const width = 10000 / config.viewportWidthPercent;
  const height = 10000 / config.viewportHeightPercent;
  const zoom = config.zoomPercent / 100;
  return {
    width: `${width}%`,
    height: `${height}%`,
    transform: `translate(${-config.viewportXPercent}%, ${-config.viewportYPercent}%) scale(${zoom})`,
    transformOrigin: "0 0",
  };
}

export function UrlViewerBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeUrlWidgetConfig,
  );
  const [draft, setDraft] = useState(config);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    if (!config.url || config.reloadSeconds <= 0) {
      return;
    }
    const interval = window.setInterval(() => {
      setReloadToken((current) => current + 1);
    }, config.reloadSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [config.reloadSeconds, config.url]);

  const frameStyle = useMemo(() => viewportFrameStyle(config), [config]);

  function updateDraft<K extends keyof UrlWidgetConfig>(key: K, value: UrlWidgetConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextConfig = normalizeUrlWidgetConfig(draft);
    setConfig(nextConfig);
    setReloadToken((current) => current + 1);
  }

  function resetViewport() {
    setDraft((current) => ({
      ...current,
      zoomPercent: DEFAULT_CONFIG.zoomPercent,
      viewportXPercent: DEFAULT_CONFIG.viewportXPercent,
      viewportYPercent: DEFAULT_CONFIG.viewportYPercent,
      viewportWidthPercent: DEFAULT_CONFIG.viewportWidthPercent,
      viewportHeightPercent: DEFAULT_CONFIG.viewportHeightPercent,
    }));
  }

  return (
    <div className="dashboard-url-widget">
      <form className="dashboard-url-controls" onSubmit={handleSubmit}>
        <label className="dw-field dashboard-url-field">
          <span>{t("dashboard.urlWidgetUrl")}</span>
          <input
            value={draft.url}
            onChange={(event) => updateDraft("url", event.currentTarget.value)}
            placeholder={t("webview.urlPlaceholder")}
          />
        </label>
        <label className="dw-field">
          <span>{t("dashboard.urlWidgetReloadSeconds")}</span>
          <input
            min={0}
            max={3600}
            type="number"
            value={draft.reloadSeconds}
            onChange={(event) => updateDraft("reloadSeconds", Number(event.currentTarget.value))}
          />
        </label>
        <label className="dw-field">
          <span>{t("dashboard.urlWidgetZoom")}</span>
          <input
            min={25}
            max={250}
            type="number"
            value={draft.zoomPercent}
            onChange={(event) => updateDraft("zoomPercent", Number(event.currentTarget.value))}
          />
        </label>
        <button className="dashboard-widget-icon-button" type="submit">
          <RefreshCw size={14} />
          {t("common.refresh")}
        </button>
        <button className="dashboard-widget-icon-button" onClick={resetViewport} type="button">
          {t("common.reset")}
        </button>
        {config.url ? (
          <button
            className="dashboard-widget-icon-button compact"
            onClick={() => void openExternalUrl(config.url)}
            type="button"
          >
            <ExternalLink size={13} />
            {t("common.open")}
          </button>
        ) : null}
      </form>

      <div className="dashboard-url-viewport-controls">
        <NumberControl
          label={t("dashboard.urlWidgetViewportX")}
          max={100}
          min={0}
          onChange={(value) => updateDraft("viewportXPercent", value)}
          value={draft.viewportXPercent}
        />
        <NumberControl
          label={t("dashboard.urlWidgetViewportY")}
          max={100}
          min={0}
          onChange={(value) => updateDraft("viewportYPercent", value)}
          value={draft.viewportYPercent}
        />
        <NumberControl
          label={t("dashboard.urlWidgetViewportWidth")}
          max={100}
          min={10}
          onChange={(value) => updateDraft("viewportWidthPercent", value)}
          value={draft.viewportWidthPercent}
        />
        <NumberControl
          label={t("dashboard.urlWidgetViewportHeight")}
          max={100}
          min={10}
          onChange={(value) => updateDraft("viewportHeightPercent", value)}
          value={draft.viewportHeightPercent}
        />
      </div>

      {config.url ? (
        <div className="dashboard-url-frame-shell">
          <iframe
            key={`${config.url}-${reloadToken}`}
            className="dashboard-url-frame"
            src={config.url}
            style={frameStyle}
            title={t("dashboard.urlWidgetFrameTitle", { url: config.url })}
          />
        </div>
      ) : (
        <div className="dashboard-widget-empty-state">
          <h4>{t("dashboard.urlWidgetEmptyTitle")}</h4>
          <p>{t("dashboard.urlWidgetEmptyHint")}</p>
        </div>
      )}
    </div>
  );
}

function NumberControl({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="dw-field">
      <span>{label}</span>
      <input
        max={max}
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}
