import { Globe, Search } from "lucide-react";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"] as const;
type RecordType = (typeof RECORD_TYPES)[number];

interface DnsConfig {
  name: string;
  type: RecordType;
}

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

type LookupState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "done"; answers: DnsAnswer[] };

const DEFAULT_CONFIG: DnsConfig = { name: "", type: "A" };

const TYPE_NAMES: Record<number, string> = {
  1: "A",
  2: "NS",
  5: "CNAME",
  6: "SOA",
  12: "PTR",
  15: "MX",
  16: "TXT",
  28: "AAAA",
  46: "RRSIG",
  257: "CAA",
};

function storageKey(instanceId: string) {
  return `kkterm.dashboard.dnsLookup.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): DnsConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<DnsConfig>;
  return {
    name: typeof candidate.name === "string" ? candidate.name : "",
    type: RECORD_TYPES.includes(candidate.type as RecordType)
      ? (candidate.type as RecordType)
      : "A",
  };
}

export function DnsLookupBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const { copiedKey, copy } = useCopyFeedback();
  const [state, setState] = useState<LookupState>({ phase: "idle" });
  const [myIp, setMyIp] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const trimmedName = config.name.trim();

  async function runLookup() {
    if (!trimmedName) return;
    const seq = ++requestSeq.current;
    setState({ phase: "loading" });
    try {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(trimmedName)}&type=${config.type}`,
        { headers: { accept: "application/dns-json" } },
      );
      if (!response.ok) throw new Error(`status ${response.status}`);
      const body = (await response.json()) as { Answer?: DnsAnswer[] };
      if (seq !== requestSeq.current) return;
      setState({ phase: "done", answers: body.Answer ?? [] });
    } catch {
      if (seq !== requestSeq.current) return;
      setState({ phase: "error" });
    }
  }

  async function lookupMyIp() {
    const seq = ++requestSeq.current;
    setMyIp(null);
    setState({ phase: "loading" });
    try {
      const response = await fetch("https://api64.ipify.org?format=json");
      if (!response.ok) throw new Error(`status ${response.status}`);
      const body = (await response.json()) as { ip?: string };
      if (seq !== requestSeq.current) return;
      if (typeof body.ip === "string") {
        setMyIp(body.ip);
        setState({ phase: "idle" });
      } else {
        setState({ phase: "error" });
      }
    } catch {
      if (seq !== requestSeq.current) return;
      setState({ phase: "error" });
    }
  }

  return (
    <div className="dw-dns">
      <form
        className="dw-dns-form"
        onSubmit={(event) => {
          event.preventDefault();
          void runLookup();
        }}
      >
        <input
          type="text"
          className="dw-dns-input"
          value={config.name}
          onChange={(event) => setConfig({ ...config, name: event.target.value })}
          placeholder={t("dashboard.dnsPlaceholder")}
          aria-label={t("dashboard.dnsPlaceholder")}
          spellCheck={false}
          autoComplete="off"
        />
        <select
          className="dw-dns-type"
          value={config.type}
          onChange={(event) => setConfig({ ...config, type: event.target.value as RecordType })}
          aria-label={t("dashboard.dnsTypeLabel")}
        >
          {RECORD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="secondary-button dw-dns-go"
          disabled={!trimmedName || state.phase === "loading"}
          aria-label={t("dashboard.dnsLookup")}
          title={t("dashboard.dnsLookup")}
        >
          <Search size={14} />
        </button>
      </form>
      <div className="dw-dns-results">
        {state.phase === "loading" ? (
          <div className="dw-dns-status">
            <span className="dw-dns-spinner" aria-hidden="true" />
            <span>{t("dashboard.dnsLoading")}</span>
          </div>
        ) : state.phase === "error" ? (
          <div className="dw-dns-status">{t("dashboard.dnsError")}</div>
        ) : state.phase === "done" && state.answers.length === 0 ? (
          <div className="dw-dns-status">{t("dashboard.dnsNoRecords")}</div>
        ) : state.phase === "done" ? (
          <div className="dw-dns-rows">
            {state.answers.map((answer, index) => {
              const key = `${answer.type}-${index}`;
              return (
                <button
                  key={key}
                  type="button"
                  className={`dw-dns-row${copiedKey === key ? " is-copied" : ""}`}
                  style={{ "--row-index": index } as CSSProperties}
                  title={t("dashboard.widgetCopyValue")}
                  onClick={() => copy(key, answer.data)}
                >
                  <span className="dw-dns-row-type">
                    {TYPE_NAMES[answer.type] ?? `TYPE${answer.type}`}
                  </span>
                  <span className="dw-dns-row-data">
                    {copiedKey === key ? t("dashboard.widgetCopied") : answer.data}
                  </span>
                  <span className="dw-dns-row-ttl">
                    {t("dashboard.dnsTtl", { seconds: answer.TTL })}
                  </span>
                </button>
              );
            })}
          </div>
        ) : myIp ? (
          <button
            type="button"
            className={`dw-dns-myip${copiedKey === "myip" ? " is-copied" : ""}`}
            title={t("dashboard.widgetCopyValue")}
            onClick={() => copy("myip", myIp)}
          >
            <span className="dw-dns-row-type">{t("dashboard.dnsMyIp")}</span>
            <span className="dw-dns-row-data">
              {copiedKey === "myip" ? t("dashboard.widgetCopied") : myIp}
            </span>
          </button>
        ) : (
          <div className="dw-dns-status">{t("dashboard.dnsHint")}</div>
        )}
      </div>
      <div className="dw-dns-footer">
        <button
          type="button"
          className="secondary-button dw-dns-myip-button"
          disabled={state.phase === "loading"}
          onClick={() => void lookupMyIp()}
        >
          <Globe size={12} />
          {t("dashboard.dnsMyIp")}
        </button>
      </div>
    </div>
  );
}
