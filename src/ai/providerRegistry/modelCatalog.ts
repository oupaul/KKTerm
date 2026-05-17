import type { AiProviderKind, AiReasoningEffort } from "../../types";
import type { AiModelOption, AiProviderDefinition } from "./types";

type AiProviderModelCatalogEntry = {
  defaultModel: string;
  defaultReasoningEffort?: AiReasoningEffort;
  models: AiModelOption[];
};

type AiProviderModelCatalog = Record<AiProviderKind, AiProviderModelCatalogEntry>;

// Update this catalog when provider model recommendations change. Keep it to
// chat/LLM models only: no image-generation, video-generation, audio, embedding,
// moderation, or transcription models.
export const AI_PROVIDER_MODEL_CATALOG: AiProviderModelCatalog = {
  openai: {
    defaultModel: "gpt-5.4-mini",
    defaultReasoningEffort: "medium",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4", label: "GPT-5.4", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", supportsImageInput: true },
      { id: "gpt-5.3-codex", label: "GPT-5.3 Codex", supportsImageInput: true },
      { id: "gpt-5.2-codex", label: "GPT-5.2 Codex", supportsImageInput: true },
      { id: "gpt-5.2", label: "GPT-5.2", supportsImageInput: true },
    ],
  },
  anthropic: {
    defaultModel: "claude-sonnet-4-6",
    defaultReasoningEffort: "medium",
    models: [
      { id: "claude-opus-4-7", label: "Claude Opus 4.7", recommended: true, supportsImageInput: true },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", recommended: true, supportsImageInput: true },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", recommended: true, supportsImageInput: true },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 snapshot", supportsImageInput: true },
    ],
  },
  openrouter: {
    defaultModel: "openai/gpt-5.4-mini",
    defaultReasoningEffort: "medium",
    models: [
      { id: "openai/gpt-5.5", label: "OpenAI GPT-5.5", recommended: true, supportsImageInput: true },
      { id: "openai/gpt-5.4-mini", label: "OpenAI GPT-5.4 Mini", recommended: true, supportsImageInput: true },
      { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", recommended: true, supportsImageInput: true },
      { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview", recommended: true, supportsImageInput: true },
      { id: "x-ai/grok-4.3", label: "Grok 4.3", recommended: true, supportsImageInput: true },
      { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", supportsImageInput: true },
      { id: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7", supportsImageInput: true },
      { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", supportsImageInput: false },
    ],
  },
  deepseek: {
    defaultModel: "deepseek-v4-flash",
    defaultReasoningEffort: "high",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", recommended: true, supportsImageInput: false },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", recommended: true, supportsImageInput: false },
      { id: "deepseek-chat", label: "DeepSeek Chat", supportsImageInput: false },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner", supportsImageInput: false },
    ],
  },
  gemini: {
    defaultModel: "gemini-3.1-flash-lite",
    defaultReasoningEffort: "medium",
    models: [
      { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", recommended: true, supportsImageInput: true },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", recommended: true, supportsImageInput: true },
      { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", recommended: true, supportsImageInput: true },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", recommended: true, supportsImageInput: true },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", supportsImageInput: true },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", supportsImageInput: true },
    ],
  },
  grok: {
    defaultModel: "grok-4.3",
    defaultReasoningEffort: "medium",
    models: [
      { id: "grok-4.3", label: "Grok 4.3", recommended: true, supportsImageInput: true },
      { id: "grok-4.3-latest", label: "Grok 4.3 Latest", recommended: true, supportsImageInput: true },
      { id: "grok-4.1-fast", label: "Grok 4.1 Fast", recommended: true, supportsImageInput: true },
      { id: "grok-4-fast", label: "Grok 4 Fast", supportsImageInput: true },
      { id: "grok-4", label: "Grok 4", supportsImageInput: true },
      { id: "grok-code-fast-1", label: "Grok Code Fast 1", supportsImageInput: false },
    ],
  },
  "azure-openai": {
    defaultModel: "gpt-5.4-mini",
    defaultReasoningEffort: "medium",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4", label: "GPT-5.4", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4-pro", label: "GPT-5.4 Pro", supportsImageInput: true },
      { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", supportsImageInput: true },
      { id: "gpt-5.3-codex", label: "GPT-5.3 Codex", supportsImageInput: true },
    ],
  },
  litellm: {
    defaultModel: "openai/gpt-5.4-mini",
    defaultReasoningEffort: "medium",
    models: [
      { id: "openai/gpt-5.4-mini", label: "OpenAI GPT-5.4 Mini", recommended: true, supportsImageInput: true },
      { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", recommended: true, supportsImageInput: true },
      { id: "gemini/gemini-3-flash-preview", label: "Gemini 3 Flash Preview", recommended: true, supportsImageInput: true },
      { id: "xai/grok-4.3", label: "Grok 4.3", recommended: true, supportsImageInput: true },
      { id: "azure/<your_deployment_name>", label: "Azure deployment" },
      { id: "ollama/gemma3", label: "Ollama Gemma 3", supportsImageInput: true },
      { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", supportsImageInput: false },
    ],
  },
  "github-copilot": {
    defaultModel: "gpt-5.4-mini",
    defaultReasoningEffort: "medium",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", recommended: true, supportsImageInput: true },
      { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", recommended: true, supportsImageInput: true },
      { id: "gemini-3-flash", label: "Gemini 3 Flash", recommended: true, supportsImageInput: true },
      { id: "gpt-5.4", label: "GPT-5.4", supportsImageInput: true },
      { id: "claude-opus-4.7", label: "Claude Opus 4.7", supportsImageInput: true },
      { id: "claude-haiku-4.5", label: "Claude Haiku 4.5", supportsImageInput: true },
    ],
  },
  ollama: {
    defaultModel: "gemma3",
    defaultReasoningEffort: "default",
    models: [
      { id: "gemma3", label: "Gemma 3", recommended: true, supportsImageInput: true },
      { id: "llama3.2-vision", label: "Llama 3.2 Vision", recommended: true, supportsImageInput: true },
      { id: "qwen2.5vl", label: "Qwen2.5-VL", supportsImageInput: true },
      { id: "qwen3", label: "Qwen3", supportsImageInput: false },
      { id: "gpt-oss", label: "gpt-oss", supportsImageInput: false },
      { id: "deepseek-r1", label: "DeepSeek-R1", supportsImageInput: false },
    ],
  },
  nvidia: {
    defaultModel: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
    defaultReasoningEffort: "medium",
    models: [
      { id: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1", label: "Nemotron Nano VL 8B", recommended: true, supportsImageInput: true },
      { id: "meta/llama-3.2-11b-vision-instruct", label: "Llama 3.2 11B Vision", recommended: true, supportsImageInput: true },
      { id: "meta/llama-3.2-90b-vision-instruct", label: "Llama 3.2 90B Vision", supportsImageInput: true },
      { id: "meta/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick", supportsImageInput: true },
      { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B Instruct", supportsImageInput: false },
    ],
  },
  opencode: {
    defaultModel: "kimi-k2.6",
    defaultReasoningEffort: "medium",
    models: [
      { id: "kimi-k2.6", label: "Kimi K2.6", recommended: true, supportsImageInput: true },
      { id: "glm-5.1", label: "GLM-5.1", recommended: true, supportsImageInput: false },
      { id: "qwen3.6-plus", label: "Qwen3.6 Plus", recommended: true, supportsImageInput: false },
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", supportsImageInput: false },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", supportsImageInput: false },
      { id: "mimo-v2.5", label: "MiMo-V2.5", supportsImageInput: false },
      { id: "minimax-m2.7", label: "MiniMax M2.7", supportsImageInput: false },
    ],
  },
  "openai-compatible": {
    defaultModel: "gpt-5.4-mini",
    defaultReasoningEffort: "medium",
    models: [
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini compatible", recommended: true, supportsImageInput: true },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet compatible", recommended: true, supportsImageInput: true },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash compatible", recommended: true, supportsImageInput: true },
      { id: "grok-4.3", label: "Grok 4.3 compatible", recommended: true, supportsImageInput: true },
      { id: "gemma3", label: "Gemma 3 compatible", recommended: true, supportsImageInput: true },
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash compatible", supportsImageInput: false },
      { id: "llama-3.3-70b-instruct", label: "Llama 3.3 70B compatible", supportsImageInput: false },
    ],
  },
};

export function applyModelCatalog(definition: AiProviderDefinition): AiProviderDefinition {
  const catalogEntry = AI_PROVIDER_MODEL_CATALOG[definition.kind];
  return {
    ...definition,
    defaultModel: catalogEntry.defaultModel,
    defaultReasoningEffort:
      catalogEntry.defaultReasoningEffort ?? definition.defaultReasoningEffort,
    modelOptions: catalogEntry.models,
  };
}
