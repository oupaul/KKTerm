import assert from "node:assert/strict";
import test from "node:test";
import {
  convertUnit,
  resolveCurrencyPair,
  formatConvertedValue,
  normalizeFrankfurterRates,
} from "../src/modules/dashboard/widgets/builtin/converters/converterTools";

test("convertUnit converts length, mass, area, and Taiwan ping units", () => {
  assert.equal(formatConvertedValue(convertUnit("length", 1, "meter", "foot")), "3.28084");
  assert.equal(formatConvertedValue(convertUnit("mass", 1, "kilogram", "pound")), "2.20462");
  assert.equal(formatConvertedValue(convertUnit("area", 1, "ping", "squareMeter")), "3.30579");
  assert.equal(formatConvertedValue(convertUnit("area", 100, "squareMeter", "ping")), "30.2500");
});

test("convertUnit handles temperature offsets", () => {
  assert.equal(formatConvertedValue(convertUnit("temperature", 0, "celsius", "fahrenheit")), "32");
  assert.equal(formatConvertedValue(convertUnit("temperature", 32, "fahrenheit", "celsius")), "0");
  assert.equal(formatConvertedValue(convertUnit("temperature", 300, "kelvin", "celsius")), "26.8500");
});

test("normalizeFrankfurterRates builds a base-to-target lookup with refresh metadata", () => {
  const normalized = normalizeFrankfurterRates({
    base: "USD",
    date: "2026-06-12",
    rates: { EUR: 0.92, JPY: 156.5 },
  });

  assert.equal(normalized.base, "USD");
  assert.equal(normalized.date, "2026-06-12");
  assert.equal(normalized.rates.USD, 1);
  assert.equal(normalized.rates.EUR, 0.92);
  assert.equal(normalized.rates.JPY, 156.5);
});

test("currency amounts can be edited from either side", () => {
  const rates = normalizeFrankfurterRates({
    base: "USD",
    date: "2026-06-12",
    rates: { EUR: 0.8 },
  });

  assert.deepEqual(resolveCurrencyPair("source", "10", "USD", "EUR", rates), {
    source: "10",
    target: "8",
  });
  assert.deepEqual(resolveCurrencyPair("target", "8", "USD", "EUR", rates), {
    source: "10",
    target: "8",
  });
});
