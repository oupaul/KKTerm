import { HOSTED_PROVIDER_WITHOUT_KEY_SETTINGS_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const cursorProvider: AiProviderDefinition = {
  kind: "cursor",
  label: "Cursor",
  baseUrl: "https://cursor.com",
  defaultModel: "auto",
  defaultReasoningEffort: "medium",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: false,
  allowsCustomBaseUrl: false,
  allowsCustomModel: true,
  apiKeyLabel: "Cursor Agent CLI",
  modelOptions: [{ id: "auto", label: "Auto", recommended: true }],
  settingsFields: HOSTED_PROVIDER_WITHOUT_KEY_SETTINGS_FIELDS,
  capabilities: ["chat", "streaming", "toolCalling", "mcpReady"],
};
