import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../../lib/inputBehavior";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";

interface TimeConfig {
  query: string;
}

const DEFAULT_CONFIG: TimeConfig = { query: "" };

function storageKey(instanceId: string) {
  return `kkterm.dashboard.timeConverter.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): TimeConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<TimeConfig>;
  return { query: typeof candidate.query === "string" ? candidate.query : "" };
}

/**
 * Accepts epoch seconds (up to 10 digits), epoch milliseconds (11-14 digits),
 * or any date string `Date` can parse. Returns null while invalid.
 */
export function parseTimeQuery(input: string): Date | null {
  const text = input.trim();
  if (!text) return null;
  if (/^-?\d{1,10}$/.test(text)) {
    return new Date(Number(text) * 1000);
  }
  if (/^-?\d{11,14}$/.test(text)) {
    return new Date(Number(text));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function useNow(intervalMs: number, enabled: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}

export function TimeConverterBody({ instance, isViewActive }: BuiltInWidgetBodyProps) {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const { copiedKey, copy } = useCopyFeedback();
  const now = useNow(1000, isViewActive);
  const trimmed = config.query.trim();
  const parsed = useMemo(() => parseTimeQuery(config.query), [config.query]);

  const nowEpoch = String(Math.floor(now.getTime() / 1000));
  const rows = parsed
    ? [
        {
          key: "local",
          label: t("dashboard.timeLocal"),
          value: parsed.toLocaleString(i18n.language, {
            dateStyle: "medium",
            timeStyle: "medium",
          }),
        },
        { key: "utc", label: t("dashboard.timeUtc"), value: parsed.toISOString() },
        {
          key: "epochSeconds",
          label: t("dashboard.timeEpochSeconds"),
          value: String(Math.floor(parsed.getTime() / 1000)),
        },
        {
          key: "epochMillis",
          label: t("dashboard.timeEpochMillis"),
          value: String(parsed.getTime()),
        },
      ]
    : [];

  return (
    <div className="dw-time">
      <div className="dw-time-now">
        <button
          type="button"
          className={`dw-time-now-epoch${copiedKey === "now" ? " is-copied" : ""}`}
          title={t("dashboard.widgetCopyValue")}
          onClick={() => copy("now", nowEpoch)}
        >
          {copiedKey === "now" ? t("dashboard.widgetCopied") : nowEpoch}
        </button>
        <div className="dw-time-now-meta">
          <span className="dw-time-now-label">{t("dashboard.timeNow")}</span>
          <span className="dw-time-now-local">
            {now.toLocaleTimeString(i18n.language, { hour12: false })}
          </span>
        </div>
      </div>
      <input
        type="text"
        className="dw-time-input"
        value={config.query}
        onChange={(event) => setConfig({ query: event.target.value })}
        placeholder={t("dashboard.timePlaceholder")}
        aria-label={t("dashboard.timeTitle")}
        aria-invalid={trimmed.length > 0 && !parsed}
        {...technicalInputProps}
        autoComplete="off"
      />
      {parsed ? (
        <div className="dw-time-rows" key={parsed.getTime()}>
          {rows.map((row, index) => (
            <button
              key={row.key}
              type="button"
              className={`dw-time-row${copiedKey === row.key ? " is-copied" : ""}`}
              style={{ "--row-index": index } as CSSProperties}
              title={t("dashboard.widgetCopyValue")}
              onClick={() => copy(row.key, row.value)}
            >
              <span className="dw-time-row-label">{row.label}</span>
              <span className="dw-time-row-value">
                {copiedKey === row.key ? t("dashboard.widgetCopied") : row.value}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="dw-time-empty">
          {trimmed ? t("dashboard.timeInvalid") : t("dashboard.timeHint")}
        </div>
      )}
    </div>
  );
}
