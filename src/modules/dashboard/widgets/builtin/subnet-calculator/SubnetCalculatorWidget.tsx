import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../../lib/inputBehavior";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";
import { formatIPv4, parseSubnetQuery } from "./subnetMath";

interface SubnetConfig {
  query: string;
}

const DEFAULT_CONFIG: SubnetConfig = { query: "192.168.1.0/24" };

function storageKey(instanceId: string) {
  return `kkterm.dashboard.subnetCalculator.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): SubnetConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<SubnetConfig>;
  return { query: typeof candidate.query === "string" ? candidate.query : DEFAULT_CONFIG.query };
}

export function SubnetCalculatorBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const { copiedKey, copy } = useCopyFeedback();
  const info = useMemo(() => parseSubnetQuery(config.query), [config.query]);
  const hasInput = config.query.trim().length > 0;

  const rows = info
    ? [
        { key: "network", label: t("dashboard.subnetNetwork"), value: `${info.network}/${info.prefix}` },
        { key: "netmask", label: t("dashboard.subnetNetmask"), value: info.netmask },
        { key: "wildcard", label: t("dashboard.subnetWildcard"), value: info.wildcard },
        { key: "broadcast", label: t("dashboard.subnetBroadcast"), value: info.broadcast },
        { key: "firstHost", label: t("dashboard.subnetFirstHost"), value: info.firstHost },
        { key: "lastHost", label: t("dashboard.subnetLastHost"), value: info.lastHost },
        { key: "usableHosts", label: t("dashboard.subnetUsableHosts"), value: info.usableHosts.toLocaleString() },
      ]
    : [];

  function setPrefixFromBit(bitIndex: number) {
    if (!info) return;
    setConfig({ query: `${formatIPv4(info.networkU32)}/${bitIndex + 1}` });
  }

  return (
    <div className="dw-subnet">
      <input
        type="text"
        className="dw-subnet-input"
        value={config.query}
        onChange={(event) => setConfig({ query: event.target.value })}
        placeholder={t("dashboard.subnetPlaceholder")}
        aria-label={t("dashboard.subnetTitle")}
        aria-invalid={hasInput && !info}
        {...technicalInputProps}
        autoComplete="off"
      />
      {info ? (
        <>
          <div
            className="dw-subnet-bits"
            role="group"
            aria-label={t("dashboard.subnetBitsLabel", { prefix: info.prefix })}
          >
            {Array.from({ length: 32 }, (_, bit) => (
              <button
                key={bit}
                type="button"
                className={`dw-subnet-bit${bit < info.prefix ? " is-network" : ""}${(bit + 1) % 8 === 0 && bit < 31 ? " is-octet-end" : ""}`}
                style={{ "--bit-index": bit } as CSSProperties}
                aria-label={t("dashboard.subnetPrefixBit", { bit: bit + 1 })}
                title={`/${bit + 1}`}
                onClick={() => setPrefixFromBit(bit)}
              />
            ))}
          </div>
          <div className="dw-subnet-rows" key={`${info.networkU32}/${info.prefix}`}>
            {rows.map((row, index) => (
              <button
                key={row.key}
                type="button"
                className={`dw-subnet-row${copiedKey === row.key ? " is-copied" : ""}`}
                style={{ "--row-index": index } as CSSProperties}
                title={t("dashboard.widgetCopyValue")}
                onClick={() => copy(row.key, row.value)}
              >
                <span className="dw-subnet-row-label">{row.label}</span>
                <span className="dw-subnet-row-value">
                  {copiedKey === row.key ? t("dashboard.widgetCopied") : row.value}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="dw-subnet-empty">
          {hasInput ? t("dashboard.subnetInvalid") : t("dashboard.subnetHint")}
        </div>
      )}
    </div>
  );
}
