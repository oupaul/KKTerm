import { jwtDecode } from "jwt-decode";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";
import { decodeBase64, decodeUrl, encodeBase64, encodeUrl, bytesToHex } from "./encoding";

type WorkbenchTab = "hash" | "base64" | "url" | "jwt";
type Direction = "encode" | "decode";

interface HashConfig {
  tab: WorkbenchTab;
  direction: Direction;
  text: string;
}

const DEFAULT_CONFIG: HashConfig = { tab: "hash", direction: "encode", text: "" };
const TABS: WorkbenchTab[] = ["hash", "base64", "url", "jwt"];
const HASH_ALGORITHMS = ["SHA-256", "SHA-1", "SHA-384", "SHA-512"] as const;

function storageKey(instanceId: string) {
  return `kkterm.dashboard.hashWorkbench.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): HashConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<HashConfig>;
  return {
    tab: TABS.includes(candidate.tab as WorkbenchTab) ? (candidate.tab as WorkbenchTab) : "hash",
    direction: candidate.direction === "decode" ? "decode" : "encode",
    text: typeof candidate.text === "string" ? candidate.text : "",
  };
}

function decodeJwtParts(token: string): { header: string; payload: string } | null {
  try {
    const header = jwtDecode(token.trim(), { header: true });
    const payload = jwtDecode(token.trim());
    return {
      header: JSON.stringify(header, null, 2),
      payload: JSON.stringify(payload, null, 2),
    };
  } catch {
    return null;
  }
}

export function HashWorkbenchBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const { copiedKey, copy } = useCopyFeedback();
  const [digests, setDigests] = useState<Record<string, string>>({});
  const text = config.text;
  const hasText = text.length > 0;

  useEffect(() => {
    if (config.tab !== "hash" || !hasText) {
      setDigests({});
      return;
    }
    let cancelled = false;
    const bytes = new TextEncoder().encode(text);
    void Promise.all(
      HASH_ALGORITHMS.map(async (algorithm) => {
        const digest = await crypto.subtle.digest(algorithm, bytes);
        return [algorithm, bytesToHex(digest)] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setDigests(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [config.tab, text, hasText]);

  const transform = useMemo(() => {
    if (!hasText || config.tab === "hash") return null;
    if (config.tab === "jwt") return null;
    if (config.tab === "base64") {
      return config.direction === "encode" ? encodeBase64(text) : decodeBase64(text);
    }
    return config.direction === "encode" ? encodeUrl(text) : decodeUrl(text);
  }, [config.tab, config.direction, text, hasText]);

  const jwt = useMemo(
    () => (config.tab === "jwt" && hasText ? decodeJwtParts(text) : null),
    [config.tab, text, hasText],
  );

  const tabLabels: Record<WorkbenchTab, string> = {
    hash: t("dashboard.hashTabHash"),
    base64: "Base64",
    url: "URL",
    jwt: "JWT",
  };

  return (
    <div className="dw-hash">
      <div className="dw-hash-tabs" role="tablist" aria-label={t("dashboard.hashTitle")}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={config.tab === tab}
            className={`dw-hash-tab${config.tab === tab ? " is-active" : ""}`}
            onClick={() => setConfig({ ...config, tab })}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>
      <textarea
        className="dw-hash-input"
        value={text}
        onChange={(event) => setConfig({ ...config, text: event.target.value })}
        placeholder={config.tab === "jwt" ? t("dashboard.hashJwtPlaceholder") : t("dashboard.hashPlaceholder")}
        aria-label={t("dashboard.hashPlaceholder")}
        rows={2}
        spellCheck={false}
      />
      {(config.tab === "base64" || config.tab === "url") && (
        <div className="dw-hash-directions" role="radiogroup" aria-label={t("dashboard.hashDirectionLabel")}>
          {(["encode", "decode"] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              role="radio"
              aria-checked={config.direction === direction}
              className={`dw-hash-direction${config.direction === direction ? " is-active" : ""}`}
              onClick={() => setConfig({ ...config, direction })}
            >
              {direction === "encode" ? t("dashboard.hashEncode") : t("dashboard.hashDecode")}
            </button>
          ))}
        </div>
      )}
      <div className="dw-hash-results">
        {!hasText ? (
          <div className="dw-hash-empty">{t("dashboard.hashHint")}</div>
        ) : config.tab === "hash" ? (
          <div className="dw-hash-rows" key={text}>
            {HASH_ALGORITHMS.map((algorithm, index) =>
              digests[algorithm] ? (
                <button
                  key={algorithm}
                  type="button"
                  className={`dw-hash-row${copiedKey === algorithm ? " is-copied" : ""}`}
                  style={{ "--row-index": index } as CSSProperties}
                  title={t("dashboard.widgetCopyValue")}
                  onClick={() => copy(algorithm, digests[algorithm])}
                >
                  <span className="dw-hash-row-label">{algorithm}</span>
                  <span className="dw-hash-row-value">
                    {copiedKey === algorithm ? t("dashboard.widgetCopied") : digests[algorithm]}
                  </span>
                </button>
              ) : null,
            )}
          </div>
        ) : config.tab === "jwt" ? (
          jwt ? (
            <div className="dw-hash-jwt">
              <div className="dw-hash-jwt-section">
                <span className="dw-hash-row-label">{t("dashboard.hashJwtHeader")}</span>
                <pre className="dw-hash-pre">{jwt.header}</pre>
              </div>
              <div className="dw-hash-jwt-section">
                <span className="dw-hash-row-label">{t("dashboard.hashJwtPayload")}</span>
                <pre className="dw-hash-pre">{jwt.payload}</pre>
              </div>
            </div>
          ) : (
            <div className="dw-hash-empty">{t("dashboard.hashJwtInvalid")}</div>
          )
        ) : transform !== null ? (
          <button
            type="button"
            className={`dw-hash-output${copiedKey === "output" ? " is-copied" : ""}`}
            title={t("dashboard.widgetCopyValue")}
            onClick={() => copy("output", transform)}
          >
            {copiedKey === "output" ? t("dashboard.widgetCopied") : transform}
          </button>
        ) : (
          <div className="dw-hash-empty">{t("dashboard.hashInvalidInput")}</div>
        )}
      </div>
    </div>
  );
}
