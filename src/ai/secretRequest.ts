import type { SecretKind, SecretStoreKind } from "../types";

export type AssistantSecretRequest = {
  kind: Extract<SecretKind, "aiApiKey" | "widgetSecret">;
  ownerId: string;
  label: string;
  description?: string;
  placeholder?: string;
  instanceId?: string;
  fieldKey?: string;
};

type AssistantSecretRequestCandidate = {
  kind?: unknown;
  ownerId?: unknown;
  label?: unknown;
  description?: unknown;
  placeholder?: unknown;
};

const SECRET_REQUEST_FENCE = /```kkterm-secret-request\s*\n([\s\S]*?)```/g;
const WIDGET_SECRET_OWNER_PATTERN = /^dashboard-widget-secret:([^:]+):([^:]+)$/;

export function parseAssistantSecretRequests(content: string): {
  markdown: string;
  requests: AssistantSecretRequest[];
} {
  const requests: AssistantSecretRequest[] = [];
  const markdown = content
    .replace(SECRET_REQUEST_FENCE, (_match, rawJson: string) => {
      const request = parseAssistantSecretRequest(rawJson);
      if (request) {
        requests.push(request);
      }
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { markdown, requests };
}

export function secretRequestStorageNotice(request: AssistantSecretRequest) {
  return `${request.kind}:${request.ownerId}`;
}

export function assistantSecretStorageBackendKey(secretStore: SecretStoreKind) {
  return secretStore === "file"
    ? "ai.secretCardStorageBackendFile"
    : "ai.secretCardStorageBackendOs";
}

function parseAssistantSecretRequest(rawJson: string): AssistantSecretRequest | null {
  let parsed: AssistantSecretRequestCandidate;
  try {
    parsed = JSON.parse(rawJson) as AssistantSecretRequestCandidate;
  } catch {
    return null;
  }

  const kind = parsed.kind === "aiApiKey" || parsed.kind === "widgetSecret" ? parsed.kind : null;
  const ownerId = typeof parsed.ownerId === "string" ? parsed.ownerId.trim() : "";
  const label = typeof parsed.label === "string" ? parsed.label.trim() : "";
  if (!kind || !ownerId || !label) {
    return null;
  }

  const request: AssistantSecretRequest = {
    kind,
    ownerId,
    label,
    description:
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : undefined,
    placeholder:
      typeof parsed.placeholder === "string" && parsed.placeholder.trim()
        ? parsed.placeholder.trim()
        : undefined,
  };

  if (kind === "widgetSecret") {
    const match = ownerId.match(WIDGET_SECRET_OWNER_PATTERN);
    if (!match) {
      return null;
    }
    request.instanceId = match[1];
    request.fieldKey = match[2];
  }

  return request;
}
