import type {
  ScriptBody,
  WidgetSecretRef, WidgetSettingsField, WidgetSettingsSchema,
} from "./types";

const MAX_SCRIPT_SOURCE_BYTES = 64 * 1024;
const MAX_SETTINGS_SCHEMA_BYTES = 16 * 1024;
const MAX_SETTINGS_VALUES_BYTES = 32 * 1024;
const MIN_POLL_SECONDS = 1;
const MAX_SETTINGS_FIELDS = 20;
const MAX_SELECT_OPTIONS = 40;
const MAX_WIDGET_LIBRARIES = 8;
const SETTINGS_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const LIBRARY_KEY_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function encodedLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function parseJsonObject(value: string): ValidationResult<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, reason: "invalidJson" };
  }
  if (!isRecord(parsed)) {
    return { ok: false, reason: "invalidObject" };
  }
  return { ok: true, value: parsed };
}

export function validateScriptWidgetBody(value: unknown): ValidationResult<ScriptBody> {
  if (!isRecord(value) || typeof value.source !== "string" || !isRecord(value.permissions)) {
    return { ok: false, reason: "invalidScriptBody" };
  }
  if (value.source.trim().length === 0) {
    return { ok: false, reason: "invalidScriptBody" };
  }
  if (encodedLength(value.source) > MAX_SCRIPT_SOURCE_BYTES) {
    return { ok: false, reason: "scriptTooLarge" };
  }
  const domMountValidation = validateScriptDomMounts(
    value.source,
    typeof value.htmlShim === "string" ? value.htmlShim : undefined,
  );
  if (!domMountValidation.ok) {
    return domMountValidation;
  }
  const rawPollSeconds = value.permissions.pollSeconds;
  if (rawPollSeconds !== undefined && rawPollSeconds !== null && typeof rawPollSeconds !== "number") {
    return { ok: false, reason: "invalidPollSeconds" };
  }
  const pollSeconds = rawPollSeconds === null ? undefined : rawPollSeconds;
  if (pollSeconds !== undefined && (!Number.isInteger(pollSeconds) || pollSeconds < MIN_POLL_SECONDS)) {
    return { ok: false, reason: "invalidPollSeconds" };
  }
  let libraries: string[] | undefined;
  if (value.libraries !== undefined && value.libraries !== null) {
    if (!Array.isArray(value.libraries) || value.libraries.length > MAX_WIDGET_LIBRARIES) {
      return { ok: false, reason: "invalidLibraries" };
    }
    const seen = new Set<string>();
    const list: string[] = [];
    for (const entry of value.libraries) {
      if (typeof entry !== "string" || !LIBRARY_KEY_PATTERN.test(entry)) {
        return { ok: false, reason: "invalidLibraries" };
      }
      if (seen.has(entry)) continue;
      seen.add(entry);
      list.push(entry);
    }
    libraries = list.length > 0 ? list : undefined;
  }
  let lifecycle: ScriptBody["lifecycle"];
  if (value.lifecycle !== undefined && value.lifecycle !== null) {
    if (!isRecord(value.lifecycle)) {
      return { ok: false, reason: "invalidScriptBody" };
    }
    const kind = value.lifecycle.kind;
    if (kind !== "static" && kind !== "periodic" && kind !== "animation" && kind !== "realtime") {
      return { ok: false, reason: "invalidScriptBody" };
    }
    const rawMinTick = value.lifecycle.minTickMs;
    let minTickMs: number | undefined;
    if (rawMinTick !== undefined && rawMinTick !== null) {
      if (
        typeof rawMinTick !== "number" ||
        !Number.isInteger(rawMinTick) ||
        rawMinTick < 16 ||
        rawMinTick > 60_000
      ) {
        return { ok: false, reason: "invalidScriptBody" };
      }
      minTickMs = rawMinTick;
    }
    lifecycle = { kind, minTickMs };
  }
  return {
    ok: true,
    value: {
      source: value.source,
      permissions: {
        network: value.permissions.network === true,
        networkTools: value.permissions.networkTools === true,
        pollSeconds,
      },
      htmlShim: typeof value.htmlShim === "string" ? value.htmlShim : undefined,
      libraries,
      lifecycle,
    },
  };
}

function validateScriptDomMounts(
  source: string,
  htmlShim: string | undefined,
): ValidationResult<undefined> {
  for (const id of extractGetElementByIdTargets(source)) {
    if (id === "root" || htmlShimContainsId(htmlShim, id) || sourceCreatesId(source, id)) {
      continue;
    }
    return { ok: false, reason: "invalidScriptDomMount" };
  }
  return { ok: true, value: undefined };
}

function extractGetElementByIdTargets(source: string): string[] {
  const ids: string[] = [];
  const expression = /document\.getElementById\s*\(\s*(["'])(.*?)\1\s*\)/g;
  for (const match of source.matchAll(expression)) {
    ids.push(match[2] ?? "");
  }
  return ids;
}

function htmlShimContainsId(htmlShim: string | undefined, id: string) {
  if (!htmlShim) return false;
  return htmlShim.includes(`id="${id}"`) || htmlShim.includes(`id='${id}'`);
}

function sourceCreatesId(source: string, id: string) {
  return [
    `.id = "${id}"`,
    `.id = '${id}'`,
    `.id="${id}"`,
    `.id='${id}'`,
    `setAttribute("id", "${id}")`,
    `setAttribute('id', '${id}')`,
    `setAttribute("id","${id}")`,
    `setAttribute('id','${id}')`,
  ].some((needle) => source.includes(needle));
}

export function validateCustomWidgetBodyJson(bodyJson: string): ValidationResult<ScriptBody> {
  if (encodedLength(bodyJson) > MAX_SCRIPT_SOURCE_BYTES + 4096) {
    return { ok: false, reason: "scriptTooLarge" };
  }
  const parsed = parseJsonObject(bodyJson);
  if (!parsed.ok) {
    return parsed;
  }
  return validateScriptWidgetBody(parsed.value);
}

function validateSettingsKey(value: unknown): value is string {
  return typeof value === "string" && SETTINGS_KEY_PATTERN.test(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function validateWidgetSettingsField(value: unknown): WidgetSettingsField | null {
  if (!isRecord(value) || typeof value.type !== "string" || !validateSettingsKey(value.key) || !isNonEmptyString(value.label)) {
    return null;
  }

  switch (value.type) {
    case "text":
      return {
        type: "text",
        key: value.key,
        label: value.label,
        placeholder: optionalString(value.placeholder),
        defaultValue: optionalString(value.defaultValue),
      };
    case "number": {
      const field: WidgetSettingsField = {
        type: "number",
        key: value.key,
        label: value.label,
      };
      if (typeof value.min === "number") field.min = value.min;
      if (typeof value.max === "number") field.max = value.max;
      if (typeof value.step === "number" && value.step > 0) field.step = value.step;
      if (typeof value.defaultValue === "number") field.defaultValue = value.defaultValue;
      return field;
    }
    case "boolean":
      return {
        type: "boolean",
        key: value.key,
        label: value.label,
        defaultValue: typeof value.defaultValue === "boolean" ? value.defaultValue : undefined,
      };
    case "select": {
      if (!Array.isArray(value.options) || value.options.length === 0 || value.options.length > MAX_SELECT_OPTIONS) {
        return null;
      }
      const options = value.options.map((option) => {
        if (!isRecord(option) || !isNonEmptyString(option.label) || typeof option.value !== "string") {
          return null;
        }
        return { label: option.label, value: option.value };
      });
      if (options.some((option) => option === null)) return null;
      return {
        type: "select",
        key: value.key,
        label: value.label,
        options: options as { label: string; value: string }[],
        defaultValue: optionalString(value.defaultValue),
      };
    }
    case "secret":
      if ("defaultValue" in value) return null;
      return {
        type: "secret",
        key: value.key,
        label: value.label,
        placeholder: optionalString(value.placeholder),
      };
    default:
      return null;
  }
}

export function validateWidgetSettingsSchema(value: unknown): ValidationResult<WidgetSettingsSchema> {
  if (!isRecord(value) || !Array.isArray(value.fields) || value.fields.length > MAX_SETTINGS_FIELDS) {
    return { ok: false, reason: "invalidSettingsSchema" };
  }
  const fields = value.fields.map(validateWidgetSettingsField);
  if (fields.some((field) => field === null)) {
    return { ok: false, reason: "invalidSettingsField" };
  }
  const keys = new Set<string>();
  for (const field of fields as WidgetSettingsField[]) {
    if (keys.has(field.key)) {
      return { ok: false, reason: "duplicateSettingsKey" };
    }
    keys.add(field.key);
  }
  return { ok: true, value: { fields: fields as WidgetSettingsField[] } };
}

export function validateWidgetSettingsSchemaJson(value: string): ValidationResult<WidgetSettingsSchema> {
  if (encodedLength(value) > MAX_SETTINGS_SCHEMA_BYTES) {
    return { ok: false, reason: "settingsSchemaTooLarge" };
  }
  const parsed = parseJsonObject(value);
  if (!parsed.ok) return parsed;
  return validateWidgetSettingsSchema(parsed.value);
}

export function parseWidgetSettingsValuesJson(value: string): ValidationResult<Record<string, unknown>> {
  if (encodedLength(value) > MAX_SETTINGS_VALUES_BYTES) {
    return { ok: false, reason: "settingsValuesTooLarge" };
  }
  const parsed = parseJsonObject(value);
  if (!parsed.ok) return parsed;
  return { ok: true, value: parsed.value };
}

export function defaultSettingsValueForField(field: WidgetSettingsField): unknown {
  if (field.type === "secret") return null;
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return false;
  if (field.type === "number") return "";
  if (field.type === "select") return field.options[0]?.value ?? "";
  return "";
}

export function settingsValuesWithDefaults(
  schema: WidgetSettingsSchema,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = values[field.key];
    if (field.type === "boolean") {
      next[field.key] = typeof value === "boolean" ? value : defaultSettingsValueForField(field);
    } else if (field.type === "number") {
      next[field.key] = typeof value === "number" || value === "" ? value : defaultSettingsValueForField(field);
    } else if (field.type === "select") {
      const allowed = new Set(field.options.map((option) => option.value));
      next[field.key] = typeof value === "string" && allowed.has(value)
        ? value
        : defaultSettingsValueForField(field);
    } else if (field.type === "secret") {
      next[field.key] = isWidgetSecretRef(value) ? value : null;
    } else {
      next[field.key] = typeof value === "string" ? value : defaultSettingsValueForField(field);
    }
  }
  return next;
}

export function validateWidgetSettingsValuesForSchema(
  schema: WidgetSettingsSchema,
  values: Record<string, unknown>,
  instanceId: string,
): ValidationResult<Record<string, unknown>> {
  for (const field of schema.fields) {
    if (field.type !== "secret") continue;
    const value = values[field.key];
    if (value === undefined || value === null) continue;
    if (!isWidgetSecretRef(value) || value.ownerId !== dashboardWidgetSecretOwnerId(instanceId, field.key)) {
      return { ok: false, reason: "invalidSecretReference" };
    }
  }
  return { ok: true, value: values };
}

export function dashboardWidgetSecretOwnerId(instanceId: string, key: string) {
  return `dashboard-widget-secret:${instanceId}:${key}`;
}

export function isWidgetSecretRef(value: unknown): value is WidgetSecretRef {
  if (!isRecord(value)) return false;
  return (
    value.type === "secretRef" &&
    typeof value.ownerId === "string" &&
    value.ownerId.length > 0 &&
    value.hasSecret === true &&
    (value.updatedAt === undefined || typeof value.updatedAt === "string")
  );
}
