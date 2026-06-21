export type UnitCategory = "length" | "mass" | "area" | "temperature";

export interface UnitDefinition {
  id: string;
  labelKey: string;
  system: "metric" | "imperial" | "local";
  toBase: number;
}

export const UNIT_DEFINITIONS: Record<UnitCategory, UnitDefinition[]> = {
  length: [
    { id: "millimeter", labelKey: "dashboard.converterUnit.millimeter", system: "metric", toBase: 0.001 },
    { id: "centimeter", labelKey: "dashboard.converterUnit.centimeter", system: "metric", toBase: 0.01 },
    { id: "meter", labelKey: "dashboard.converterUnit.meter", system: "metric", toBase: 1 },
    { id: "kilometer", labelKey: "dashboard.converterUnit.kilometer", system: "metric", toBase: 1000 },
    { id: "inch", labelKey: "dashboard.converterUnit.inch", system: "imperial", toBase: 0.0254 },
    { id: "foot", labelKey: "dashboard.converterUnit.foot", system: "imperial", toBase: 0.3048 },
    { id: "yard", labelKey: "dashboard.converterUnit.yard", system: "imperial", toBase: 0.9144 },
    { id: "mile", labelKey: "dashboard.converterUnit.mile", system: "imperial", toBase: 1609.344 },
    { id: "nauticalMile", labelKey: "dashboard.converterUnit.nauticalMile", system: "local", toBase: 1852 },
  ],
  mass: [
    { id: "gram", labelKey: "dashboard.converterUnit.gram", system: "metric", toBase: 0.001 },
    { id: "kilogram", labelKey: "dashboard.converterUnit.kilogram", system: "metric", toBase: 1 },
    { id: "metricTon", labelKey: "dashboard.converterUnit.metricTon", system: "metric", toBase: 1000 },
    { id: "ounce", labelKey: "dashboard.converterUnit.ounce", system: "imperial", toBase: 0.028349523125 },
    { id: "pound", labelKey: "dashboard.converterUnit.pound", system: "imperial", toBase: 0.45359237 },
    { id: "stone", labelKey: "dashboard.converterUnit.stone", system: "imperial", toBase: 6.35029318 },
    { id: "usTon", labelKey: "dashboard.converterUnit.usTon", system: "imperial", toBase: 907.18474 },
    { id: "ukTon", labelKey: "dashboard.converterUnit.ukTon", system: "imperial", toBase: 1016.0469088 },
    { id: "cattyTaiwan", labelKey: "dashboard.converterUnit.cattyTaiwan", system: "local", toBase: 0.6 },
  ],
  area: [
    { id: "squareMeter", labelKey: "dashboard.converterUnit.squareMeter", system: "metric", toBase: 1 },
    { id: "hectare", labelKey: "dashboard.converterUnit.hectare", system: "metric", toBase: 10000 },
    { id: "squareKilometer", labelKey: "dashboard.converterUnit.squareKilometer", system: "metric", toBase: 1000000 },
    { id: "squareFoot", labelKey: "dashboard.converterUnit.squareFoot", system: "imperial", toBase: 0.09290304 },
    { id: "squareYard", labelKey: "dashboard.converterUnit.squareYard", system: "imperial", toBase: 0.83612736 },
    { id: "acre", labelKey: "dashboard.converterUnit.acre", system: "imperial", toBase: 4046.8564224 },
    { id: "squareMile", labelKey: "dashboard.converterUnit.squareMile", system: "imperial", toBase: 2589988.110336 },
    { id: "ping", labelKey: "dashboard.converterUnit.ping", system: "local", toBase: 3.305785123966942 },
    { id: "tsubo", labelKey: "dashboard.converterUnit.tsubo", system: "local", toBase: 3.305785123966942 },
  ],
  temperature: [
    { id: "celsius", labelKey: "dashboard.converterUnit.celsius", system: "metric", toBase: 1 },
    { id: "fahrenheit", labelKey: "dashboard.converterUnit.fahrenheit", system: "imperial", toBase: 1 },
    { id: "kelvin", labelKey: "dashboard.converterUnit.kelvin", system: "metric", toBase: 1 },
  ],
};

export interface CurrencyRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export function convertUnit(category: UnitCategory, value: number, from: string, to: string): number {
  if (category === "temperature") return convertTemperature(value, from, to);
  const units = UNIT_DEFINITIONS[category];
  const fromUnit = units.find((unit) => unit.id === from);
  const toUnit = units.find((unit) => unit.id === to);
  if (!fromUnit || !toUnit) return Number.NaN;
  return (value * fromUnit.toBase) / toUnit.toBase;
}

function convertTemperature(value: number, from: string, to: string): number {
  const celsius =
    from === "fahrenheit" ? (value - 32) * (5 / 9) : from === "kelvin" ? value - 273.15 : value;
  if (to === "fahrenheit") return celsius * (9 / 5) + 32;
  if (to === "kelvin") return celsius + 273.15;
  return celsius;
}

export function formatConvertedValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100000 || (Math.abs(value) > 0 && Math.abs(value) < 0.0001)) {
    return value.toExponential(6);
  }
  if (Math.abs(value) >= 10 && !Number.isInteger(value)) {
    return value.toFixed(4);
  }
  return Number.isInteger(value) ? String(value) : value.toPrecision(6).replace(/\.?0+$/, "");
}

export function normalizeFrankfurterRates(value: unknown): CurrencyRates {
  const body = value as { base?: unknown; date?: unknown; rates?: unknown };
  const base = typeof body.base === "string" ? body.base.toUpperCase() : "EUR";
  const date = typeof body.date === "string" ? body.date : "";
  const rates: Record<string, number> = { [base]: 1 };
  if (body.rates && typeof body.rates === "object") {
    for (const [key, rate] of Object.entries(body.rates as Record<string, unknown>)) {
      if (typeof rate === "number" && Number.isFinite(rate)) rates[key.toUpperCase()] = rate;
    }
  }
  return { base, date, rates };
}

export function convertCurrency(amount: number, from: string, to: string, rates: CurrencyRates): number {
  const fromRate = rates.rates[from.toUpperCase()];
  const toRate = rates.rates[to.toUpperCase()];
  if (!fromRate || !toRate) return Number.NaN;
  return (amount / fromRate) * toRate;
}

export function resolveCurrencyPair(
  editedSide: "source" | "target",
  value: string,
  from: string,
  to: string,
  rates: CurrencyRates | null,
): { source: string; target: string } {
  const amount = Number(value);
  const converted =
    rates && Number.isFinite(amount)
      ? editedSide === "source"
        ? convertCurrency(amount, from, to, rates)
        : convertCurrency(amount, to, from, rates)
      : Number.NaN;
  return editedSide === "source"
    ? { source: value, target: formatConvertedValue(converted) }
    : { source: formatConvertedValue(converted), target: value };
}
