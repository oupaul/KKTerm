import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../../lib/inputBehavior";
import { invokeCommand } from "../../../../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import {
  UNIT_DEFINITIONS,
  formatCurrencyRateDate,
  normalizeCurrencyRates,
  resolveCurrencyPair,
  resolveUnitPair,
  type CurrencyRates,
  type UnitCategory,
} from "./converterTools";
import { ImageConverterPanel } from "./ImageConverterPanel";

type ConverterMode = "unit" | "currency" | "image";

interface ConvertersConfig {
  mode: ConverterMode;
  unitCategory: UnitCategory;
  amount: string;
  targetAmount: string;
  fromUnit: string;
  toUnit: string;
  currencyAmount: string;
  currencyTargetAmount: string;
  fromCurrency: string;
  toCurrency: string;
  currencyRates: CurrencyRates | null;
}

const DEFAULT_CONFIG: ConvertersConfig = {
  mode: "unit",
  unitCategory: "length",
  amount: "1",
  targetAmount: "1",
  fromUnit: "meter",
  toUnit: "foot",
  currencyAmount: "1",
  currencyTargetAmount: "1",
  fromCurrency: "USD",
  toCurrency: "EUR",
  currencyRates: null,
};

const CURRENCIES = ["USD", "EUR", "TWD", "JPY", "CNY", "HKD", "KRW", "GBP", "CAD", "AUD", "SGD", "THB", "IDR", "VND", "CHF", "SEK", "MXN", "BRL"];

function storageKey(instanceId: string) {
  return `kkterm.dashboard.converters.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): ConvertersConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<ConvertersConfig>;
  const unitCategory = isUnitCategory(candidate.unitCategory) ? candidate.unitCategory : "length";
  const units = UNIT_DEFINITIONS[unitCategory];
  return {
    mode: candidate.mode === "currency" || candidate.mode === "image" ? candidate.mode : "unit",
    unitCategory,
    amount: typeof candidate.amount === "string" ? candidate.amount : "1",
    targetAmount: typeof candidate.targetAmount === "string" ? candidate.targetAmount : "1",
    fromUnit: units.some((unit) => unit.id === candidate.fromUnit) ? candidate.fromUnit! : units[0].id,
    toUnit: units.some((unit) => unit.id === candidate.toUnit) ? candidate.toUnit! : units[1]?.id ?? units[0].id,
    currencyAmount: typeof candidate.currencyAmount === "string" ? candidate.currencyAmount : "1",
    currencyTargetAmount: typeof candidate.currencyTargetAmount === "string" ? candidate.currencyTargetAmount : "1",
    fromCurrency: CURRENCIES.includes(candidate.fromCurrency ?? "") ? candidate.fromCurrency! : "USD",
    toCurrency: CURRENCIES.includes(candidate.toCurrency ?? "") ? candidate.toCurrency! : "EUR",
    currencyRates: normalizeCurrencyRates(candidate.currencyRates),
  };
}

export function ConvertersBody({ instance }: BuiltInWidgetBodyProps) {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const [unitEditSide, setUnitEditSide] = useState<"source" | "target">("source");
  const [currencyEditSide, setCurrencyEditSide] = useState<"source" | "target">("source");
  const [currencyState, setCurrencyState] = useState<"idle" | "loading" | "error">("idle");
  const rates = config.currencyRates;
  const units = UNIT_DEFINITIONS[config.unitCategory];
  const unitPair = resolveUnitPair(
    unitEditSide,
    unitEditSide === "source" ? config.amount : config.targetAmount,
    config.unitCategory,
    config.fromUnit,
    config.toUnit,
  );

  const currencyPair = resolveCurrencyPair(
    currencyEditSide,
    currencyEditSide === "source" ? config.currencyAmount : config.currencyTargetAmount,
    config.fromCurrency,
    config.toCurrency,
    rates,
  );

  function updateCategory(unitCategory: UnitCategory) {
    const nextUnits = UNIT_DEFINITIONS[unitCategory];
    setConfig({
      ...config,
      unitCategory,
      fromUnit: nextUnits[0].id,
      toUnit: nextUnits[1]?.id ?? nextUnits[0].id,
    });
  }

  async function refreshRates() {
    setCurrencyState("loading");
    try {
      const currencyRates = await invokeCommand("fetch_currency_rates");
      setConfig((current) => ({ ...current, currencyRates }));
      setCurrencyState("idle");
    } catch {
      setCurrencyState("error");
    }
  }

  return (
    <div className="dw-converters">
      <div className="dw-converters-tabs" role="tablist" aria-label={t("dashboard.convertersTitle")}>
        <button type="button" role="tab" aria-selected={config.mode === "unit"} className={config.mode === "unit" ? "is-active" : ""} onClick={() => setConfig({ ...config, mode: "unit" })}>
          {t("dashboard.convertersTab.unit")}
        </button>
        <button type="button" role="tab" aria-selected={config.mode === "currency"} className={config.mode === "currency" ? "is-active" : ""} onClick={() => setConfig({ ...config, mode: "currency" })}>
          {t("dashboard.convertersTab.currency")}
        </button>
        <button type="button" role="tab" aria-selected={config.mode === "image"} className={config.mode === "image" ? "is-active" : ""} onClick={() => setConfig({ ...config, mode: "image" })}>
          {t("dashboard.convertersTab.image")}
        </button>
      </div>
      {config.mode === "unit" ? (
        <div className="dw-converter-panel">
          <div className="dw-unit-category-tabs" role="tablist" aria-label={t("dashboard.unitCategoryLabel")}>
            {(["length", "mass", "area", "temperature"] as UnitCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={config.unitCategory === category}
                className={config.unitCategory === category ? "is-active" : ""}
                onClick={() => updateCategory(category)}
              >
                {t(`dashboard.unitCategory.${category}`)}
              </button>
            ))}
          </div>
          <div className="dw-converter-grid">
            <div className="dw-converter-row">
              <input
                value={unitPair.source}
                onChange={(event) => {
                  setUnitEditSide("source");
                  setConfig({ ...config, amount: event.currentTarget.value });
                }}
                aria-label={t("dashboard.converterAmount")}
                {...technicalInputProps}
              />
              <UnitSelect units={units} value={config.fromUnit} onChange={(fromUnit) => setConfig({ ...config, fromUnit })} />
            </div>
            <div className="dw-converter-row">
              <input
                value={unitPair.target}
                onChange={(event) => {
                  setUnitEditSide("target");
                  setConfig({ ...config, targetAmount: event.currentTarget.value });
                }}
                aria-label={t("dashboard.converterAmount")}
                {...technicalInputProps}
              />
              <UnitSelect units={units} value={config.toUnit} onChange={(toUnit) => setConfig({ ...config, toUnit })} />
            </div>
          </div>
        </div>
      ) : config.mode === "currency" ? (
        <div className="dw-converter-panel">
          <div className="dw-converter-grid">
            <div className="dw-converter-row">
              <input
                value={currencyPair.source}
                onChange={(event) => {
                  setCurrencyEditSide("source");
                  setConfig({ ...config, currencyAmount: event.currentTarget.value });
                }}
                aria-label={t("dashboard.currencyAmount")}
                {...technicalInputProps}
              />
              <CurrencySelect value={config.fromCurrency} onChange={(fromCurrency) => setConfig({ ...config, fromCurrency })} />
            </div>
            <div className="dw-converter-row">
              <input
                value={currencyPair.target}
                onChange={(event) => {
                  setCurrencyEditSide("target");
                  setConfig({ ...config, currencyTargetAmount: event.currentTarget.value });
                }}
                aria-label={t("dashboard.currencyAmount")}
                {...technicalInputProps}
              />
              <CurrencySelect value={config.toCurrency} onChange={(toCurrency) => setConfig({ ...config, toCurrency })} />
            </div>
          </div>
          <div className="dw-currency-footer">
            <span>
              {currencyState === "error"
                ? t("dashboard.currencyError")
                : rates?.date
                  ? t("dashboard.currencyLastRefresh", {
                      date: formatCurrencyRateDate(rates.date, i18n.language),
                    })
                  : t("dashboard.currencyEstimate")}
            </span>
            <button type="button" className="secondary-button" disabled={currencyState === "loading"} onClick={() => void refreshRates()}>
              <RefreshCw size={12} className={currencyState === "loading" ? "dw-currency-spin" : undefined} />
              {rates ? t("dashboard.currencyRefresh") : t("dashboard.currencyFetchLatest")}
            </button>
          </div>
        </div>
      ) : null}
      <div className="dw-image-tab-panel" hidden={config.mode !== "image"}>
        <ImageConverterPanel />
      </div>
    </div>
  );
}

function UnitSelect({ units, value, onChange }: { units: typeof UNIT_DEFINITIONS[UnitCategory]; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
      {units.map((unit) => (
        <option key={unit.id} value={unit.id}>{t(unit.labelKey)}</option>
      ))}
    </select>
  );
}

function CurrencySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
      {CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>{currency} · {t(`dashboard.currencyName.${currency}`)}</option>
      ))}
    </select>
  );
}

function isUnitCategory(value: unknown): value is UnitCategory {
  return value === "length" || value === "mass" || value === "area" || value === "temperature";
}
