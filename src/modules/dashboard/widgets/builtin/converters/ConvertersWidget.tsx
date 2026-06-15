import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../../lib/inputBehavior";
import { invokeCommand } from "../../../../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import {
  UNIT_DEFINITIONS,
  convertCurrency,
  convertUnit,
  formatConvertedValue,
  type CurrencyRates,
  type UnitCategory,
} from "./converterTools";

type ConverterMode = "unit" | "currency";

interface ConvertersConfig {
  mode: ConverterMode;
  unitCategory: UnitCategory;
  amount: string;
  fromUnit: string;
  toUnit: string;
  currencyAmount: string;
  fromCurrency: string;
  toCurrency: string;
}

const DEFAULT_CONFIG: ConvertersConfig = {
  mode: "unit",
  unitCategory: "length",
  amount: "1",
  fromUnit: "meter",
  toUnit: "foot",
  currencyAmount: "1",
  fromCurrency: "USD",
  toCurrency: "EUR",
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
    mode: candidate.mode === "currency" ? "currency" : "unit",
    unitCategory,
    amount: typeof candidate.amount === "string" ? candidate.amount : "1",
    fromUnit: units.some((unit) => unit.id === candidate.fromUnit) ? candidate.fromUnit! : units[0].id,
    toUnit: units.some((unit) => unit.id === candidate.toUnit) ? candidate.toUnit! : units[1]?.id ?? units[0].id,
    currencyAmount: typeof candidate.currencyAmount === "string" ? candidate.currencyAmount : "1",
    fromCurrency: CURRENCIES.includes(candidate.fromCurrency ?? "") ? candidate.fromCurrency! : "USD",
    toCurrency: CURRENCIES.includes(candidate.toCurrency ?? "") ? candidate.toCurrency! : "EUR",
  };
}

export function ConvertersBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [currencyState, setCurrencyState] = useState<"idle" | "loading" | "error">("idle");
  const units = UNIT_DEFINITIONS[config.unitCategory];
  const amount = Number(config.amount);
  const unitResult = Number.isFinite(amount)
    ? convertUnit(config.unitCategory, amount, config.fromUnit, config.toUnit)
    : Number.NaN;

  const currencyAmount = Number(config.currencyAmount);
  const currencyResult = useMemo(
    () =>
      rates && Number.isFinite(currencyAmount)
        ? convertCurrency(currencyAmount, config.fromCurrency, config.toCurrency, rates)
        : Number.NaN,
    [rates, currencyAmount, config.fromCurrency, config.toCurrency],
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
      setRates(await invokeCommand("fetch_currency_rates"));
      setCurrencyState("idle");
    } catch {
      setCurrencyState("error");
    }
  }

  return (
    <div className="dw-converters">
      <div className="dw-converters-tabs" role="tablist" aria-label={t("dashboard.convertersTitle")}>
        <button type="button" className={config.mode === "unit" ? "is-active" : ""} onClick={() => setConfig({ ...config, mode: "unit" })}>
          {t("dashboard.convertersTab.unit")}
        </button>
        <button type="button" className={config.mode === "currency" ? "is-active" : ""} onClick={() => setConfig({ ...config, mode: "currency" })}>
          {t("dashboard.convertersTab.currency")}
        </button>
      </div>
      {config.mode === "unit" ? (
        <div className="dw-converter-panel">
          <select value={config.unitCategory} onChange={(event) => updateCategory(event.currentTarget.value as UnitCategory)} aria-label={t("dashboard.unitCategoryLabel")}>
            {(["length", "mass", "area", "temperature"] as UnitCategory[]).map((category) => (
              <option key={category} value={category}>{t(`dashboard.unitCategory.${category}`)}</option>
            ))}
          </select>
          <div className="dw-converter-grid">
            <input value={config.amount} onChange={(event) => setConfig({ ...config, amount: event.currentTarget.value })} aria-label={t("dashboard.converterAmount")} {...technicalInputProps} />
            <UnitSelect units={units} value={config.fromUnit} onChange={(fromUnit) => setConfig({ ...config, fromUnit })} />
            <div className="dw-converter-equals">=</div>
            <output>{formatConvertedValue(unitResult)}</output>
            <UnitSelect units={units} value={config.toUnit} onChange={(toUnit) => setConfig({ ...config, toUnit })} />
          </div>
        </div>
      ) : (
        <div className="dw-converter-panel">
          <div className="dw-converter-grid">
            <input value={config.currencyAmount} onChange={(event) => setConfig({ ...config, currencyAmount: event.currentTarget.value })} aria-label={t("dashboard.currencyAmount")} {...technicalInputProps} />
            <CurrencySelect value={config.fromCurrency} onChange={(fromCurrency) => setConfig({ ...config, fromCurrency })} />
            <div className="dw-converter-equals">=</div>
            <output>{formatConvertedValue(currencyResult)}</output>
            <CurrencySelect value={config.toCurrency} onChange={(toCurrency) => setConfig({ ...config, toCurrency })} />
          </div>
          <div className="dw-currency-footer">
            <span>
              {currencyState === "error"
                ? t("dashboard.currencyError")
                : rates
                  ? t("dashboard.currencyLastRefresh", { date: rates.date })
                  : t("dashboard.currencyEstimate")}
            </span>
            <button type="button" className="secondary-button" disabled={currencyState === "loading"} onClick={() => void refreshRates()}>
              <RefreshCw size={12} className={currencyState === "loading" ? "dw-currency-spin" : undefined} />
              {rates ? t("dashboard.currencyRefresh") : t("dashboard.currencyFetchLatest")}
            </button>
          </div>
        </div>
      )}
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
