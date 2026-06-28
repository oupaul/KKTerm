// Pure display helpers for the PC Info widget. No i18n here: these format raw
// numbers into unit-suffixed strings; section/field labels are translated in the
// component.

const EM_DASH = "—";

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) {
    return EM_DASH;
  }
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export function formatMhz(mhz: number | null | undefined): string {
  if (mhz === null || mhz === undefined || !Number.isFinite(mhz) || mhz <= 0) {
    return EM_DASH;
  }
  if (mhz >= 1000) {
    return `${Math.round((mhz / 1000) * 100) / 100} GHz`;
  }
  return `${Math.round(mhz)} MHz`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return `${Math.round(value)}%`;
}

export function formatBitsPerSecond(bits: number | null | undefined): string {
  if (bits === null || bits === undefined || !Number.isFinite(bits) || bits <= 0) {
    return EM_DASH;
  }
  const units = ["bps", "Kbps", "Mbps", "Gbps"];
  let value = bits;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${Math.round(value)} ${units[unit]}`;
}

export function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return EM_DASH;
  }
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export function formatDate(unixSeconds: number | null | undefined): string {
  if (unixSeconds === null || unixSeconds === undefined || unixSeconds <= 0) {
    return EM_DASH;
  }
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

export function orDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EM_DASH;
}
