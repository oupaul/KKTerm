import { CONFIGURABLE_ENDPOINT_SETTINGS_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const liteLlmProvider: AiProviderDefinition = {
  kind: "litellm",
  label: "LiteLLM",
  baseUrl: "http://localhost:4000/v1",
  defaultModel: "openai/gpt-5",
  defaultReasoningEffort: "medium",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: true,
  allowsCustomBaseUrl: true,
  allowsCustomModel: true,
  apiKeyLabel: "LiteLLM key",
  modelOptions: [
    { id: "openai/gpt-5", label: "OpenAI GPT-5" },
    { id: "anthropic/claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { id: "xai/grok-2-latest", label: "Grok 2 Latest" },
    { id: "azure/<your_deployment_name>", label: "Azure deployment" },
    { id: "ollama/llama2", label: "Ollama Llama 2" },
    { id: "openrouter/google/palm-2-chat-bison", label: "OpenRouter PaLM 2 Chat Bison" },
  ],
  settingsFields: CONFIGURABLE_ENDPOINT_SETTINGS_FIELDS,
  capabilities: ["chat", "streaming", "toolCalling", "mcpReady", "openAiCompatible"],
};
