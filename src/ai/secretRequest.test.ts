import {
  parseAssistantSecretRequests,
  secretRequestStorageNotice,
} from "./secretRequest.ts";

const content = [
  "I need a key before this widget can fetch data.",
  "",
  "```kkterm-secret-request",
  JSON.stringify({
    kind: "widgetSecret",
    ownerId: "dashboard-widget-secret:inst-1:apiKey",
    label: "API key",
    description: "Used by the status widget.",
  }),
  "```",
  "",
  "Then I can continue.",
].join("\n");

const parsed = parseAssistantSecretRequests(content);

if (parsed.markdown.trim() !== "I need a key before this widget can fetch data.\n\nThen I can continue.") {
  throw new Error("Secret request directives should be removed from rendered markdown.");
}

if (parsed.requests.length !== 1) {
  throw new Error("Expected one parsed secret request.");
}

const [request] = parsed.requests;
if (
  !request ||
  request.kind !== "widgetSecret" ||
  request.ownerId !== "dashboard-widget-secret:inst-1:apiKey" ||
  request.label !== "API key" ||
  request.fieldKey !== "apiKey" ||
  request.instanceId !== "inst-1"
) {
  throw new Error("Widget secret request should preserve metadata and derive widget ids.");
}

if (secretRequestStorageNotice(request) !== "widgetSecret:dashboard-widget-secret:inst-1:apiKey") {
  throw new Error("Secret storage notice must not include the plaintext value.");
}
