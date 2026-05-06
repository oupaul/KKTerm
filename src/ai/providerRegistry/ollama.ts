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
    { id: "qwen3", label: "Qwen3", note: "Local general use", supportsImageInput: false },
    { id: "gpt-oss", label: "gpt-oss", note: "Open-weight", supportsImageInput: false },
    { id: "deepseek-r1", label: "DeepSeek-R1", note: "Local reasoning", supportsImageInput: false },
    { id: "gemma3", label: "Gemma 3", supportsImageInput: true },
  ],
  settingsFields: CONFIGURABLE_ENDPOINT_WITHOUT_KEY_FIELDS,
  capabilities: ["chat", "imageInput", "streaming", "toolCalling", "localRuntime", "openAiCompatible"],
};
