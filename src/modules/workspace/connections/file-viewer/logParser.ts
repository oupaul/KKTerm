export type LogLevel = "error" | "warn" | "info" | "debug" | "trace" | "none";

export type LogParserId =
  | "auto"
  | "generic"
  | "json"
  | "logfmt"
  | "syslog"
  | "http-access"
  | "windows-event"
  | "java-stack"
  | "container";

export interface LogParserType {
  id: LogParserId;
}

export interface ParsedLogLine {
  index: number;
  raw: string;
  message: string;
  level: LogLevel;
  parser: Exclude<LogParserId, "auto">;
}

export const LOG_PARSER_TYPES: LogParserType[] = [
  { id: "auto" },
  { id: "generic" },
  { id: "json" },
  { id: "logfmt" },
  { id: "syslog" },
  { id: "http-access" },
  { id: "windows-event" },
  { id: "java-stack" },
  { id: "container" },
];

const LEVEL_PATTERNS: { level: LogLevel; pattern: RegExp }[] = [
  { level: "error", pattern: /\b(error|err|fatal|crit(ical)?|panic|exception|fail(ed|ure)?)\b/i },
  { level: "warn", pattern: /\b(warn(ing)?|notice)\b/i },
  { level: "info", pattern: /\b(info|information|informational)\b/i },
  { level: "debug", pattern: /\b(debug|fine)\b/i },
  { level: "trace", pattern: /\b(trace|verbose|finest)\b/i },
];

const RFC5424_PATTERN = /^<\d+>1\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(?:-|\[[^\]]+\])\s*(.*)$/;
const RFC3164_PATTERN =
  /^(?:<\d+>)?[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+(?:\S+?(?:\[\d+\])?:\s*)?(.*)$/;
const HTTP_ACCESS_PATTERN =
  /^(\S+)\s+\S+\s+\S+\s+\[[^\]]+\]\s+"([^"]*)"\s+(\d{3})(?:\s+\S+)?(?:\s+"[^"]*"\s+"[^"]*")?/;
const JAVA_STACK_PATTERN =
  /^(?:\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[,.]\d+)?\s+)?(?:\[[^\]]+\]\s+)?(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\b\s*(.*)$/i;
const WINDOWS_EVENT_PATTERN =
  /\b(?:Level|EntryType)\s*[:=]\s*(Critical|Error|Warning|Information|Verbose|SuccessAudit|FailureAudit)\b/i;
const CONTAINER_PATTERN =
  /^(?:[\w.-]+\s+)?(?:[\w.-]+\s+)?\d{4}-\d{2}-\d{2}T\S+\s+(?:stdout|stderr)\s+[FP]\s+(.*)$/;

export function detectLogParserType(text: string): Exclude<LogParserId, "auto"> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0).slice(0, 30);
  const counts = new Map<Exclude<LogParserId, "auto">, number>();
  for (const line of lines.length > 0 ? lines : [text]) {
    const parser = detectLineParser(line);
    counts.set(parser, (counts.get(parser) ?? 0) + 1);
  }
  let best: Exclude<LogParserId, "auto"> = "generic";
  let bestCount = 0;
  for (const parser of LOG_PARSER_TYPES) {
    if (parser.id === "auto") {
      continue;
    }
    const count = counts.get(parser.id) ?? 0;
    if (count > bestCount) {
      best = parser.id;
      bestCount = count;
    }
  }
  return best;
}

export function parseLogLines(text: string, parser: LogParserId): ParsedLogLine[] {
  return text.split(/\r?\n/).map((raw, index) => {
    const resolvedParser = parser === "auto" ? detectLineParser(raw) : parser;
    return parseLine(raw, index, resolvedParser);
  });
}

function detectLineParser(line: string): Exclude<LogParserId, "auto"> {
  const trimmed = line.trim();
  if (!trimmed) {
    return "generic";
  }
  if (tryParseJson(trimmed)) {
    return "json";
  }
  if (HTTP_ACCESS_PATTERN.test(trimmed)) {
    return "http-access";
  }
  if (RFC5424_PATTERN.test(trimmed) || RFC3164_PATTERN.test(trimmed)) {
    return "syslog";
  }
  if (WINDOWS_EVENT_PATTERN.test(trimmed)) {
    return "windows-event";
  }
  if (JAVA_STACK_PATTERN.test(trimmed) || /^\s+at\s+\S+\(/.test(line)) {
    return "java-stack";
  }
  if (CONTAINER_PATTERN.test(trimmed)) {
    return "container";
  }
  if (looksLikeLogfmt(trimmed)) {
    return "logfmt";
  }
  return "generic";
}

function parseLine(
  raw: string,
  index: number,
  parser: Exclude<LogParserId, "auto">,
): ParsedLogLine {
  switch (parser) {
    case "json":
      return parseJsonLine(raw, index);
    case "logfmt":
      return parseLogfmtLine(raw, index);
    case "syslog":
      return parseSyslogLine(raw, index);
    case "http-access":
      return parseHttpAccessLine(raw, index);
    case "windows-event":
      return parseWindowsEventLine(raw, index);
    case "java-stack":
      return parseJavaStackLine(raw, index);
    case "container":
      return parseContainerLine(raw, index);
    case "generic":
    default:
      return {
        index,
        raw,
        message: raw,
        level: detectLevel(raw),
        parser: "generic",
      };
  }
}

function parseJsonLine(raw: string, index: number): ParsedLogLine {
  const value = tryParseJson(raw.trim());
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback(raw, index, "json");
  }
  const record = value as Record<string, unknown>;
  const levelValue =
    record.level ?? record.lvl ?? record.severity ?? record.severityText ?? record.status;
  const messageValue =
    record.message ?? record.msg ?? record.event ?? record.body ?? record.error ?? record.reason;
  return {
    index,
    raw,
    message:
      typeof messageValue === "string"
        ? messageValue
        : JSON.stringify(record, null, 0),
    level: normalizeLevel(levelValue),
    parser: "json",
  };
}

function parseLogfmtLine(raw: string, index: number): ParsedLogLine {
  const values = parseKeyValuePairs(raw);
  const message = values.get("msg") ?? values.get("message") ?? values.get("event") ?? raw;
  return {
    index,
    raw,
    message,
    level: normalizeLevel(values.get("level") ?? values.get("lvl") ?? values.get("severity") ?? values.get("at")),
    parser: "logfmt",
  };
}

function parseSyslogLine(raw: string, index: number): ParsedLogLine {
  const rfc5424 = raw.match(RFC5424_PATTERN);
  const rfc3164 = raw.match(RFC3164_PATTERN);
  const message = rfc5424?.[1] ?? rfc3164?.[1] ?? raw;
  const priority = raw.match(/^<(\d+)>/)?.[1];
  return {
    index,
    raw,
    message,
    level: priority ? syslogSeverityToLevel(Number(priority) % 8) : detectLevel(message),
    parser: "syslog",
  };
}

function parseHttpAccessLine(raw: string, index: number): ParsedLogLine {
  const match = raw.match(HTTP_ACCESS_PATTERN);
  if (!match) {
    return fallback(raw, index, "http-access");
  }
  const [, host, request, statusText] = match;
  const status = Number(statusText);
  return {
    index,
    raw,
    message: `${statusText} ${request} (${host})`,
    level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
    parser: "http-access",
  };
}

function parseWindowsEventLine(raw: string, index: number): ParsedLogLine {
  const level = raw.match(WINDOWS_EVENT_PATTERN)?.[1];
  return {
    index,
    raw,
    message: raw,
    level: normalizeLevel(level),
    parser: "windows-event",
  };
}

function parseJavaStackLine(raw: string, index: number): ParsedLogLine {
  const match = raw.match(JAVA_STACK_PATTERN);
  return {
    index,
    raw,
    message: match?.[2]?.trim() || raw,
    level: normalizeLevel(match?.[1] ?? raw),
    parser: "java-stack",
  };
}

function parseContainerLine(raw: string, index: number): ParsedLogLine {
  const message = raw.match(CONTAINER_PATTERN)?.[1] ?? raw;
  return {
    index,
    raw,
    message,
    level: detectLevel(message),
    parser: "container",
  };
}

function fallback(
  raw: string,
  index: number,
  parser: Exclude<LogParserId, "auto">,
): ParsedLogLine {
  return { index, raw, message: raw, level: detectLevel(raw), parser };
}

function detectLevel(line: string): LogLevel {
  for (const { level, pattern } of LEVEL_PATTERNS) {
    if (pattern.test(line)) {
      return level;
    }
  }
  return "none";
}

function normalizeLevel(value: unknown): LogLevel {
  if (typeof value === "number") {
    if (value <= 2) {
      return "error";
    }
    if (value === 3 || value === 4) {
      return "warn";
    }
    if (value === 7) {
      return "debug";
    }
    return "info";
  }
  if (typeof value !== "string") {
    return "none";
  }
  const normalized = value.trim().toLowerCase();
  if (/^(fatal|critical|crit|error|err|failureaudit)$/.test(normalized)) {
    return "error";
  }
  if (/^(warn|warning|notice)$/.test(normalized)) {
    return "warn";
  }
  if (/^(info|information|informational|successaudit)$/.test(normalized)) {
    return "info";
  }
  if (/^(debug|fine)$/.test(normalized)) {
    return "debug";
  }
  if (/^(trace|verbose|finest)$/.test(normalized)) {
    return "trace";
  }
  return detectLevel(value);
}

function syslogSeverityToLevel(severity: number): LogLevel {
  if (severity <= 3) {
    return "error";
  }
  if (severity === 4) {
    return "warn";
  }
  if (severity === 7) {
    return "debug";
  }
  return "info";
}

function tryParseJson(text: string): unknown | null {
  if (!text.startsWith("{") && !text.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksLikeLogfmt(line: string): boolean {
  return /\b[A-Za-z_][\w.-]*=(?:"[^"]*"|\S+)/.test(line);
}

function parseKeyValuePairs(line: string): Map<string, string> {
  const pairs = new Map<string, string>();
  const pattern = /\b([A-Za-z_][\w.-]*)=("[^"]*"|\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    const rawValue = match[2];
    pairs.set(
      match[1],
      rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue.slice(1, -1) : rawValue,
    );
  }
  return pairs;
}
