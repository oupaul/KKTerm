import { HOSTED_PROVIDER_SETTINGS_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

// Direct Ollama Cloud access: ollama.com acts as a remote Ollama host, reached
// with a bearer API key. The OpenAI-compatible /v1 layer carries chat while the
// native /api/tags endpoint lists the account's available cloud models. Local
// Ollama and local signed-in cloud models stay on the separate `ollama`
// provider (http://localhost:11434/v1).
export const ollamaCloudProvider: AiProviderDefinition = {
  kind: "ollama-cloud",
  label: "Ollama Cloud",
  baseUrl: "https://ollama.com/v1",
  defaultModel: "gpt-oss:120b",
  defaultReasoningEffort: "default",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: true,
  allowsCustomBaseUrl: false,
  allowsCustomModel: true,
  apiKeyLabel: "Ollama API key",
  apiKeyUrl: "https://ollama.com/settings/keys",
  modelListStrategy: "ollamaTags",
  strictModelList: true,
  modelOptions: [
    { id: "gpt-oss:120b", label: "gpt-oss 120B", note: "Open-weight", supportsImageInput: false },
    { id: "glm-5.2", label: "GLM-5.2", supportsImageInput: false },
    { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", supportsImageInput: false },
    { id: "qwen3-coder:480b", label: "Qwen3 Coder 480B", supportsImageInput: false },
    { id: "kimi-k2.6", label: "Kimi K2.6", supportsImageInput: false },
    { id: "minimax-m2.7", label: "MiniMax M2.7", supportsImageInput: false },
    { id: "nemotron-3-super:120b", label: "Nemotron 3 Super 120B", supportsImageInput: false },
    { id: "qwen3.5:122b", label: "Qwen3.5 122B", supportsImageInput: true },
    { id: "gemma4", label: "Gemma 4", supportsImageInput: true },
  ],
  settingsFields: HOSTED_PROVIDER_SETTINGS_FIELDS,
  capabilities: ["chat", "imageInput", "streaming", "toolCalling", "openAiCompatible"],
};
