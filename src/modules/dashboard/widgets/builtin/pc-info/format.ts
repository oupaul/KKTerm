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

export function formatDateTime(unixSeconds: number | null | undefined): string {
  if (unixSeconds === null || unixSeconds === undefined || unixSeconds <= 0) {
    return EM_DASH;
  }
  return new Date(unixSeconds * 1000).toLocaleString();
}

export function orDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EM_DASH;
}

// ── Visual helpers for the animated widget ─────────────────────────────────────

/** Whole/decimal gigabytes as a bare number (for "GB total" / "GB free" stats). */
export function gigabytes(bytes: number | null | undefined): number | null {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  const gb = bytes / 1024 ** 3;
  return gb >= 100 ? Math.round(gb) : Math.round(gb * 10) / 10;
}

/** SVG circle circumference and the stroke-dashoffset for a 0–1 fill fraction. */
export function ringGeometry(
  radius: number,
  fraction: number,
): { circumference: number; offset: number } {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return {
    circumference: Math.round(circumference * 100) / 100,
    offset: Math.round(circumference * (1 - clamped) * 100) / 100,
  };
}

/**
 * Build an SVG polyline `points` string from a series, oldest first, mapped into
 * a `width`×`height` box. `max` scales the vertical axis (peak of the data, or a
 * fixed ceiling like 100 for percentages).
 */
export function sparklinePoints(
  values: number[],
  width: number,
  height: number,
  max: number,
): string {
  const n = values.length;
  if (n === 0) {
    return "";
  }
  const ceiling = max > 0 ? max : 1;
  if (n === 1) {
    const y = height - clampUnit(values[0] / ceiling) * (height - 2) - 1;
    return `0,${y.toFixed(1)} ${width},${y.toFixed(1)}`;
  }
  return values
    .map((value, index) => {
      const x = (index / (n - 1)) * width;
      const y = height - clampUnit(value / ceiling) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
