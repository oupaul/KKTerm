import { HOSTED_PROVIDER_SETTINGS_FIELDS, STANDARD_REASONING_EFFORTS } from "./shared";
import type { AiProviderDefinition } from "./types";

export const nvidiaProvider: AiProviderDefinition = {
  kind: "nvidia",
  label: "NVIDIA",
  baseUrl: "https://integrate.api.nvidia.com/v1",
  defaultModel: "meta/llama-3.3-70b-instruct",
  defaultReasoningEffort: "medium",
  reasoningEfforts: [...STANDARD_REASONING_EFFORTS],
  requiresApiKey: true,
  allowsCustomBaseUrl: false,
  allowsCustomModel: true,
  apiKeyLabel: "NVIDIA API key",
  modelOptions: [
    { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B Instruct" },
    { id: "bytedance/seed-oss-36b-instruct", label: "Seed OSS 36B Instruct" },
    { id: "abacusai/dracarys-llama-3.1-70b-instruct", label: "Dracarys Llama 3.1 70B" },
  ],
  settingsFields: HOSTED_PROVIDER_SETTINGS_FIELDS,
  capabilities: ["chat", "streaming", "toolCalling", "openAiCompatible"],
};
