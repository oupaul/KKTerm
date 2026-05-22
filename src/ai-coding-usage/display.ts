import type { AiCodingUsageProvider } from "./types";

export function aiCodingUsageProviderProductKey(provider: AiCodingUsageProvider) {
  return `dashboard.aiCodingUsageProviderProduct.${provider}` as const;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTimeOnly(
  value: string,
  locale?: string,
  timeZone?: string,
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}
