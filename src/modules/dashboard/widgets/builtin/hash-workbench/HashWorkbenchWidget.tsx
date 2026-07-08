import { FileUp, X } from "../../../../../lib/reicon";
import { jwtDecode } from "jwt-decode";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../../lib/inputBehavior";
import { isTauriRuntime, pickAndReadFile } from "../../../../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";
import {
  crc32Hex,
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  bytesToHex,
  md5Hex,
} from "./encoding";

type WorkbenchTab = "hash" | "base64" | "url" | "jwt";
type Direction = "encode" | "decode";

interface HashConfig {
  tab: WorkbenchTab;
  direction: Direction;
  text: string;
}

const DEFAULT_CONFIG: HashConfig = { tab: "hash", direction: "encode", text: "" };
const TABS: WorkbenchTab[] = ["hash", "base64", "url", "jwt"];
const WEB_CRYPTO_HASH_ALGORITHMS = ["SHA-256", "SHA-1", "SHA-384", "SHA-512"] as const;
const HASH_ALGORITHMS = [...WEB_CRYPTO_HASH_ALGORITHMS, "MD5", "CRC32"] as const;

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

function toDigestBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
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
  const [fileInput, setFileInput] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [fileError, setFileError] = useState(false);
  const text = config.text;
  const hashBytes = useMemo(() => fileInput?.bytes ?? new TextEncoder().encode(text), [fileInput, text]);
  const hashSourceKey = fileInput ? `file:${fileInput.name}:${fileInput.bytes.length}` : `text:${text}`;
  const hasHashInput = fileInput !== null || text.length > 0;
  const hasText = text.length > 0;

  useEffect(() => {
    if (config.tab !== "hash" || !hasHashInput) {
      setDigests({});
      return;
    }
    let cancelled = false;
    const digestBuffer = toDigestBuffer(hashBytes);
    void Promise.all(
      WEB_CRYPTO_HASH_ALGORITHMS.map(async (algorithm) => {
        const digest = await crypto.subtle.digest(algorithm, digestBuffer);
        return [algorithm, bytesToHex(digest)] as const;
      }),
    ).then((entries) => {
      if (!cancelled) {
        setDigests({
          ...Object.fromEntries(entries),
          MD5: md5Hex(hashBytes),
          CRC32: crc32Hex(hashBytes),
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [config.tab, hashBytes, hashSourceKey, hasHashInput]);

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

  async function selectFileForHash() {
    try {
      const file = await pickAndReadFile();
      if (!file) return;
      setFileInput({ name: file.name, bytes: file.bytes });
      setFileError(false);
      setConfig({ ...config, tab: "hash" });
    } catch {
      setFileError(true);
    }
  }

  function updateText(nextText: string) {
    setFileInput(null);
    setFileError(false);
    setConfig({ ...config, text: nextText });
  }

  return (
    <div className="dw-hash">
      <div className="dw-hash-topbar">
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
        {config.tab === "hash" && isTauriRuntime() ? (
          <button
            type="button"
            className="dashboard-widget-icon-button"
            aria-label={t("dashboard.hashSelectFile")}
            title={t("dashboard.hashSelectFile")}
            onClick={() => void selectFileForHash()}
          >
            <FileUp size={14} />
          </button>
        ) : null}
      </div>
      <textarea
        className="dw-hash-input"
        value={text}
        onChange={(event) => updateText(event.target.value)}
        placeholder={config.tab === "jwt" ? t("dashboard.hashJwtPlaceholder") : t("dashboard.hashPlaceholder")}
        aria-label={t("dashboard.hashPlaceholder")}
        rows={2}
        {...technicalInputProps}
      />
      {config.tab === "hash" && fileInput ? (
        <div className="dw-hash-file">
          <span>{t("dashboard.hashSelectedFile", { name: fileInput.name })}</span>
          <button
            type="button"
            className="dashboard-widget-icon-button"
            aria-label={t("common.remove")}
            title={t("common.remove")}
            onClick={() => setFileInput(null)}
          >
            <X size={13} />
          </button>
        </div>
      ) : null}
      {config.tab === "hash" && fileError ? (
        <div className="dw-hash-file-error">{t("dashboard.hashFileReadError")}</div>
      ) : null}
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
        {config.tab === "hash" && !hasHashInput ? (
          <div className="dw-hash-empty">{t("dashboard.hashHint")}</div>
        ) : config.tab === "hash" ? (
          <div className="dw-hash-rows" key={hashSourceKey}>
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
