import { CONFIGURABLE_ENDPOINT_WITHOUT_KEY_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const ollamaProvider: AiProviderDefinition = {
  kind: "ollama",
  label: "Ollama",
  baseUrl: "http://localhost:11434/v1",
  defaultModel: "qwen3",
  defaultReasoningEffort: "default",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: false,
  allowsCustomBaseUrl: true,
  allowsCustomModel: true,
  apiKeyLabel: "Ollama API key",
  modelOptions: [
    { id: "qwen3", label: "Qwen3", note: "Local general use" },
    { id: "gpt-oss", label: "gpt-oss", note: "Open-weight" },
    { id: "deepseek-r1", label: "DeepSeek-R1", note: "Local reasoning" },
    { id: "gemma3", label: "Gemma 3" },
  ],
  settingsFields: CONFIGURABLE_ENDPOINT_WITHOUT_KEY_FIELDS,
  capabilities: ["chat", "streaming", "toolCalling", "localRuntime", "openAiCompatible"],
};
