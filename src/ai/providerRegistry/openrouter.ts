import { HOSTED_PROVIDER_SETTINGS_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const openRouterProvider: AiProviderDefinition = {
  kind: "openrouter",
  label: "OpenRouter",
  baseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "openai/gpt-5.5",
  defaultReasoningEffort: "medium",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: true,
  allowsCustomBaseUrl: false,
  allowsCustomModel: true,
  apiKeyLabel: "OpenRouter API key",
  modelOptions: [
    { id: "openai/gpt-5.5", label: "OpenAI GPT-5.5" },
    { id: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7" },
    { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
    { id: "x-ai/grok-4-fast", label: "Grok 4 Fast" },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
  ],
  settingsFields: HOSTED_PROVIDER_SETTINGS_FIELDS,
  capabilities: ["chat", "streaming", "toolCalling", "mcpReady", "openAiCompatible"],
};
