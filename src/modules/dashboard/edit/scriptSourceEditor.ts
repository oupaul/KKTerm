export interface EditableScriptBody {
  source: string;
  permissions: Record<string, unknown> & {
    network: boolean;
    pollSeconds?: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseScriptBodyForEditor(bodyJson: string): EditableScriptBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyJson);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.source !== "string" || !isRecord(parsed.permissions)) {
    return null;
  }
  return {
    ...parsed,
    source: parsed.source,
    permissions: {
      ...parsed.permissions,
      network: parsed.permissions.network === true,
      pollSeconds: typeof parsed.permissions.pollSeconds === "number"
        ? parsed.permissions.pollSeconds
        : undefined,
    },
  };
}

export function updateScriptBodySourceJson(bodyJson: string, source: string): string {
  const parsed = JSON.parse(bodyJson) as Record<string, unknown>;
  return JSON.stringify({ ...parsed, source });
}
