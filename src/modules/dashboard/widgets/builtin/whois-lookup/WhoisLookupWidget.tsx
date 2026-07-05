import { Search } from "../../../../../lib/reicon";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../../lib/inputBehavior";
import { invokeCommand, isTauriRuntime } from "../../../../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";

interface WhoisConfig {
  domain: string;
}

type WhoisState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; raw: string; parsed?: Record<string, string> };

const DEFAULT_CONFIG: WhoisConfig = { domain: "" };
const FIELD_ORDER = ["domain name", "domain", "registrar", "creation date", "updated date", "expiry date", "name server"];

function storageKey(instanceId: string) {
  return `kkterm.dashboard.whoisLookup.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): WhoisConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<WhoisConfig>;
  return { domain: typeof candidate.domain === "string" ? candidate.domain : "" };
}

export function WhoisLookupBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const [state, setState] = useState<WhoisState>({ phase: "idle" });
  const { copiedKey, copy } = useCopyFeedback();
  const requestSeq = useRef(0);
  const domain = config.domain.trim();

  async function lookup() {
    if (!domain || !isTauriRuntime()) return;
    const seq = ++requestSeq.current;
    setState({ phase: "loading" });
    try {
      const result = await invokeCommand("network_whois", { domain });
      if (seq !== requestSeq.current) return;
      setState({ phase: "done", raw: result.raw, parsed: result.parsed });
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setState({ phase: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  const rows = state.phase === "done" ? pickWhoisRows(state.parsed) : [];

  return (
    <div className="dw-whois">
      <form
        className="dw-whois-form"
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
      >
        <input
          type="text"
          className="dw-whois-input"
          value={config.domain}
          onChange={(event) => setConfig({ domain: event.currentTarget.value })}
          placeholder={t("dashboard.whoisPlaceholder")}
          aria-label={t("dashboard.whoisDomainLabel")}
          {...technicalInputProps}
          autoComplete="off"
        />
        <button
          type="submit"
          className="secondary-button dw-whois-submit"
          disabled={!domain || state.phase === "loading" || !isTauriRuntime()}
        >
          <Search size={14} />
          {t("dashboard.whoisLookup")}
        </button>
      </form>
      <div className="dw-whois-results">
        {state.phase === "loading" ? (
          <div className="dw-whois-empty">{t("dashboard.whoisLoading")}</div>
        ) : state.phase === "error" ? (
          <div className="dw-whois-empty">{t("dashboard.whoisError", { message: state.message })}</div>
        ) : state.phase === "done" ? (
          <>
            <div className="dw-whois-fields">
              {rows.map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={`dw-whois-field${copiedKey === key ? " is-copied" : ""}`}
                  title={t("dashboard.widgetCopyValue")}
                  onClick={() => copy(key, value)}
                >
                  <span>{key}</span>
                  <strong>{copiedKey === key ? t("dashboard.widgetCopied") : value}</strong>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`dw-whois-raw${copiedKey === "raw" ? " is-copied" : ""}`}
              title={t("dashboard.widgetCopyValue")}
              onClick={() => copy("raw", state.raw)}
            >
              {copiedKey === "raw" ? t("dashboard.widgetCopied") : state.raw.slice(0, 1200)}
            </button>
          </>
        ) : (
          <div className="dw-whois-empty">
            {isTauriRuntime() ? t("dashboard.whoisHint") : t("dashboard.whoisDesktopOnly")}
          </div>
        )}
      </div>
    </div>
  );
}

function pickWhoisRows(parsed: Record<string, string> | undefined) {
  if (!parsed) return [];
  const rows: Array<[string, string]> = [];
  for (const key of FIELD_ORDER) {
    const value = parsed[key];
    if (value) rows.push([key, value]);
  }
  return rows.slice(0, 6);
}
