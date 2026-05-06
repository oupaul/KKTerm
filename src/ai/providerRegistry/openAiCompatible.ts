import { CONFIGURABLE_ENDPOINT_SETTINGS_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const openAiCompatibleProvider: AiProviderDefinition = {
  kind: "openai-compatible",
  label: "OpenAI Compatible",
  baseUrl: "",
  defaultModel: "gpt-5.5",
  defaultReasoningEffort: "medium",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: true,
  allowsCustomBaseUrl: true,
  allowsCustomModel: true,
  apiKeyLabel: "API key",
  modelOptions: [
    { id: "gpt-5.5", label: "GPT-5.5 compatible" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet compatible" },
    { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash compatible" },
    { id: "grok-4-fast", label: "Grok 4 Fast compatible" },
    { id: "llama-3.3-70b-instruct", label: "Llama 3.3 70B compatible" },
    { id: "qwen3", label: "Qwen3 compatible" },
  ],
  settingsFields: CONFIGURABLE_ENDPOINT_SETTINGS_FIELDS,
  capabilities: ["chat", "streaming", "toolCalling", "mcpReady", "openAiCompatible"],
};
