import { CONFIGURABLE_ENDPOINT_SETTINGS_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const liteLlmProvider: AiProviderDefinition = {
  kind: "litellm",
  label: "LiteLLM",
  baseUrl: "http://localhost:4000/v1",
  defaultModel: "openai/gpt-5.5",
  defaultReasoningEffort: "medium",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: true,
  allowsCustomBaseUrl: true,
  allowsCustomModel: true,
  apiKeyLabel: "LiteLLM key",
  modelOptions: [
    { id: "openai/gpt-5.5", label: "OpenAI GPT-5.5", supportsImageInput: true },
    { id: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7", supportsImageInput: true },
    { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", supportsImageInput: true },
    { id: "xai/grok-4-fast", label: "Grok 4 Fast", supportsImageInput: true },
    { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", supportsImageInput: false },
    { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", supportsImageInput: false },
    { id: "azure/<your_deployment_name>", label: "Azure deployment" },
    { id: "ollama/qwen3", label: "Ollama Qwen3", supportsImageInput: false },
    { id: "openrouter/google/gemini-2.5-pro", label: "OpenRouter Gemini 2.5 Pro", supportsImageInput: true },
  ],
  settingsFields: CONFIGURABLE_ENDPOINT_SETTINGS_FIELDS,
  capabilities: ["chat", "imageInput", "streaming", "toolCalling", "mcpReady", "openAiCompatible"],
};
