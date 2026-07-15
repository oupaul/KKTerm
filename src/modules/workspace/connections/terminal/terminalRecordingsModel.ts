import type { TerminalRecordingEntry } from "../../../../lib/tauri";
import type { Connection } from "../../../../types";

export type RecordingDateRange = "all" | "today" | "7d";
export type RecordingSortKey = "name" | "type" | "host" | "date" | "duration" | "size";
export type RecordingSort = { key: RecordingSortKey; direction: "asc" | "desc" };
export type TerminalRecordingType = "local" | "ssh" | "telnet" | "serial" | "unknown";
export type TerminalRecordingColumnKey =
  | "name"
  | "type"
  | "host"
  | "date"
  | "time"
  | "duration"
  | "size"
  | "summary";
export type TerminalRecordingColumnWidths = Record<TerminalRecordingColumnKey, number>;

export const DEFAULT_TERMINAL_RECORDING_COLUMN_WIDTHS: TerminalRecordingColumnWidths = {
  name: 330,
  type: 94,
  host: 140,
  date: 112,
  time: 92,
  duration: 92,
  size: 84,
  summary: 340,
};

const MIN_TERMINAL_RECORDING_COLUMN_WIDTHS: TerminalRecordingColumnWidths = {
  name: 240,
  type: 76,
  host: 90,
  date: 88,
  time: 76,
  duration: 78,
  size: 68,
  summary: 180,
};

export function resizeTerminalRecordingColumn(
  widths: TerminalRecordingColumnWidths,
  key: TerminalRecordingColumnKey,
  nextWidth: number,
): TerminalRecordingColumnWidths {
  return {
    ...widths,
    [key]: Math.max(MIN_TERMINAL_RECORDING_COLUMN_WIDTHS[key], Math.round(nextWidth)),
  };
}

export function terminalRecordingGridTemplate(widths: TerminalRecordingColumnWidths) {
  return [
    "36px",
    `${widths.name}px`,
    `${widths.type}px`,
    `${widths.host}px`,
    `${widths.date}px`,
    `${widths.time}px`,
    `${widths.duration}px`,
    `${widths.size}px`,
    `minmax(${widths.summary}px, 1fr)`,
  ].join(" ");
}

export function terminalRecordingGridMinimumWidth(widths: TerminalRecordingColumnWidths) {
  return 36 + Object.values(widths).reduce((sum, width) => sum + width, 0);
}

export interface TerminalRecordingRow extends TerminalRecordingEntry {
  id: string;
  connectionId?: string;
  connectionName: string;
  host: string;
  recordingType: TerminalRecordingType;
  timestampMillis: number;
}

export function recordingConnectionIdFragment(connectionId: string) {
  const normalized = [...connectionId]
    .filter((character) => /[A-Za-z0-9-]/.test(character))
    .join("");
  if (normalized.startsWith("conn-")) {
    const suffix = normalized.slice(5, 13);
    if (suffix) {
      return `conn-${suffix}`;
    }
  }
  return normalized.slice(0, 8) || "session";
}

export function recordingHostLabel(connection: Connection | undefined, fallback: string) {
  if (!connection) {
    return humanizeRecordingFolderLabel(fallback);
  }
  if (connection.type === "ssh" || connection.type === "telnet") {
    return connection.host.trim() || connection.name;
  }
  if (connection.type === "serial") {
    return connection.serialLine?.trim() || connection.name;
  }
  return connection.name;
}

export function resolveTerminalRecordingRows(
  entries: TerminalRecordingEntry[],
  connections: Connection[],
): TerminalRecordingRow[] {
  const byFragment = new Map(
    connections.map((connection) => [recordingConnectionIdFragment(connection.id), connection]),
  );
  return entries.map((entry) => {
    const connection = byFragment.get(entry.connectionIdFragment);
    return {
      ...entry,
      id: normalizeRecordingPath(entry.path),
      connectionId: connection?.id,
      connectionName: connection?.name ?? humanizeRecordingFolderLabel(entry.connectionFolderLabel),
      host: recordingHostLabel(connection, entry.connectionFolderLabel),
      recordingType: terminalRecordingType(connection),
      timestampMillis: entry.startedAtMillis ?? entry.modifiedAtMillis ?? 0,
    };
  });
}

export function filterAndSortTerminalRecordings(options: {
  rows: TerminalRecordingRow[];
  query: string;
  contentMatches: ReadonlySet<string>;
  host: string;
  range: RecordingDateRange;
  sort: RecordingSort;
  now?: number;
}) {
  const query = options.query.trim().toLocaleLowerCase();
  const now = options.now ?? Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1_000;
  const filtered = options.rows.filter((row) => {
    if (options.host !== "all" && row.host !== options.host) {
      return false;
    }
    if (options.range === "today" && row.timestampMillis < startOfToday.getTime()) {
      return false;
    }
    if (options.range === "7d" && row.timestampMillis < sevenDaysAgo) {
      return false;
    }
    if (!query) {
      return true;
    }
    const metadata = `${row.fileName} ${row.recordingType} ${row.host} ${row.connectionName} ${row.aiSummary ?? ""}`
      .toLocaleLowerCase();
    return metadata.includes(query) || options.contentMatches.has(row.id);
  });
  const direction = options.sort.direction === "asc" ? 1 : -1;
  return filtered.sort((left, right) => {
    let comparison: number;
    switch (options.sort.key) {
      case "name":
        comparison = left.fileName.localeCompare(right.fileName);
        break;
      case "host":
        comparison = left.host.localeCompare(right.host);
        break;
      case "type":
        comparison = left.recordingType.localeCompare(right.recordingType);
        break;
      case "duration":
        comparison = (left.durationMillis ?? 0) - (right.durationMillis ?? 0);
        break;
      case "size":
        comparison = left.sizeBytes - right.sizeBytes;
        break;
      case "date":
      default:
        comparison = left.timestampMillis - right.timestampMillis;
        break;
    }
    return comparison * direction || left.fileName.localeCompare(right.fileName);
  });
}

function terminalRecordingType(connection: Connection | undefined): TerminalRecordingType {
  switch (connection?.type) {
    case "local":
    case "ssh":
    case "telnet":
    case "serial":
      return connection.type;
    default:
      return "unknown";
  }
}

export function buildTerminalRecordingsExportName(rows: TerminalRecordingRow[]) {
  if (rows.length === 0) {
    return "kkterm_recordings.zip";
  }
  const hosts = [...new Set(rows.map((row) => row.host))];
  const hostLabel = hosts.length === 1 ? safeFilePart(hosts[0]) : `${hosts.length}hosts`;
  const latest = new Date(Math.max(...rows.map((row) => row.timestampMillis || 0)));
  const stamp = Number.isFinite(latest.getTime())
    ? `${latest.getFullYear()}${pad(latest.getMonth() + 1)}${pad(latest.getDate())}-${pad(latest.getHours())}${pad(latest.getMinutes())}`
    : "recordings";
  return `kkterm_${hostLabel || "recordings"}_${stamp}_${rows.length}sessions.zip`;
}

export function normalizeRecordingPath(path: string) {
  return path.replace(/\\/g, "/").toLocaleLowerCase();
}

function humanizeRecordingFolderLabel(label: string) {
  const value = label.trim().replace(/-/g, " ").replace(/\s+/g, " ");
  return value || "Connection";
}

function safeFilePart(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
