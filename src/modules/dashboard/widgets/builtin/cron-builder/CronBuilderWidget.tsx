import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue/i18n";
import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";

interface CronConfig {
  expression: string;
}

const DEFAULT_CONFIG: CronConfig = { expression: "*/5 * * * *" };
const NEXT_RUN_COUNT = 5;

const PRESETS = [
  "* * * * *",
  "*/5 * * * *",
  "0 * * * *",
  "0 9 * * 1-5",
  "0 0 * * 0",
  "0 3 1 * *",
];

// i18next language -> cronstrue locale id.
const CRONSTRUE_LOCALES: Record<string, string> = {
  de: "de",
  es: "es",
  "es-MX": "es",
  fr: "fr",
  id: "id",
  it: "it",
  ja: "ja",
  ko: "ko",
  "pt-BR": "pt_BR",
  th: "th",
  vi: "vi",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
};

function storageKey(instanceId: string) {
  return `kkterm.dashboard.cronBuilder.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): CronConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<CronConfig>;
  return {
    expression:
      typeof candidate.expression === "string" ? candidate.expression : DEFAULT_CONFIG.expression,
  };
}

interface CronReading {
  description: string;
  nextRuns: Date[];
}

function readCron(expression: string, locale: string): CronReading | null {
  try {
    const parsed = CronExpressionParser.parse(expression);
    const description = cronstrue.toString(expression, {
      locale: CRONSTRUE_LOCALES[locale] ?? "en",
    });
    const nextRuns: Date[] = [];
    for (let i = 0; i < NEXT_RUN_COUNT; i++) {
      nextRuns.push(parsed.next().toDate());
    }
    return { description, nextRuns };
  } catch {
    return null;
  }
}

function relativeLabel(target: Date, language: string): string {
  const seconds = Math.round((target.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "always", style: "narrow" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

export function CronBuilderBody({ instance }: BuiltInWidgetBodyProps) {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const { copiedKey, copy } = useCopyFeedback();
  const trimmed = config.expression.trim();
  const reading = useMemo(
    () => (trimmed ? readCron(trimmed, i18n.language) : null),
    [trimmed, i18n.language],
  );

  return (
    <div className="dw-cron">
      <input
        type="text"
        className="dw-cron-input"
        value={config.expression}
        onChange={(event) => setConfig({ expression: event.target.value })}
        placeholder={t("dashboard.cronPlaceholder")}
        aria-label={t("dashboard.cronTitle")}
        aria-invalid={trimmed.length > 0 && !reading}
        spellCheck={false}
        autoComplete="off"
      />
      <div className="dw-cron-presets" role="toolbar" aria-label={t("dashboard.cronPresetsLabel")}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`dw-cron-preset${trimmed === preset ? " is-active" : ""}`}
            onClick={() => setConfig({ expression: preset })}
          >
            {preset}
          </button>
        ))}
      </div>
      {reading ? (
        <>
          <button
            type="button"
            key={trimmed}
            className={`dw-cron-description${copiedKey === "description" ? " is-copied" : ""}`}
            title={t("dashboard.widgetCopyValue")}
            onClick={() => copy("description", reading.description)}
          >
            {copiedKey === "description" ? t("dashboard.widgetCopied") : reading.description}
          </button>
          <div className="dw-cron-runs">
            <div className="dw-cron-runs-title">{t("dashboard.cronNextRuns")}</div>
            {reading.nextRuns.map((run, index) => (
              <div
                key={`${trimmed}-${run.getTime()}`}
                className="dw-cron-run"
                style={{ "--row-index": index } as CSSProperties}
              >
                <span className="dw-cron-run-relative">{relativeLabel(run, i18n.language)}</span>
                <span className="dw-cron-run-absolute">
                  {run.toLocaleString(i18n.language, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="dw-cron-empty">
          {trimmed ? t("dashboard.cronInvalid") : t("dashboard.cronHint")}
        </div>
      )}
    </div>
  );
}
