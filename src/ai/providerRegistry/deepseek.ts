import { HIGH_REASONING_EFFORTS, HOSTED_PROVIDER_SETTINGS_FIELDS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const deepSeekProvider: AiProviderDefinition = {
  kind: "deepseek",
  label: "DeepSeek",
  baseUrl: "https://api.deepseek.com/v1",
  defaultModel: "deepseek-chat",
  defaultReasoningEffort: "high",
  reasoningEfforts: [...HIGH_REASONING_EFFORTS],
  requiresApiKey: true,
  allowsCustomBaseUrl: false,
  allowsCustomModel: true,
  apiKeyLabel: "DeepSeek API key",
  modelOptions: [
    { id: "deepseek-chat", label: "DeepSeek Chat", note: "General chat" },
    { id: "deepseek-reasoner", label: "DeepSeek Reasoner", note: "Reasoning" },
  ],
  settingsFields: HOSTED_PROVIDER_SETTINGS_FIELDS,
  capabilities: ["chat", "streaming", "toolCalling", "openAiCompatible"],
};
