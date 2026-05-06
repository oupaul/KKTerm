import { AI_PROVIDER_DEFINITIONS } from "./providerRegistry";
import type { AiProviderKind, AiProviderSettings, AiReasoningEffort } from "../types";
export { AI_PROVIDER_DEFINITIONS };
export type {
  AiModelOption,
  AiProviderCapability,
  AiProviderDefinition,
  AiProviderSettingsField,
} from "./providerRegistry";

export function getAiProviderDefinition(kind: AiProviderKind) {
  return (
    AI_PROVIDER_DEFINITIONS.find((definition) => definition.kind === kind) ??
    AI_PROVIDER_DEFINITIONS[0]
  );
}

export function providerDefaultsFor(kind: AiProviderKind): AiProviderSettings {
  const definition = getAiProviderDefinition(kind);
  return {
    providerKind: definition.kind,
    baseUrl: definition.baseUrl,
    model: definition.defaultModel,
    reasoningEffort: definition.defaultReasoningEffort,
    outputLanguage: "",
    cliExecutionPolicy: "suggestOnly",
    claudeCliPath: "",
    codexCliPath: "",
  };
}

export function normalizeAiProviderDraft(draft: AiProviderSettings): AiProviderSettings {
  const definition = getAiProviderDefinition(draft.providerKind);
  const baseUrl = (definition.allowsCustomBaseUrl ? draft.baseUrl : definition.baseUrl).trim();
  const model = draft.model.trim() || definition.defaultModel;
  const reasoningEffort = normalizeReasoningEffort(
    draft.reasoningEffort,
    definition.reasoningEfforts,
    definition.defaultReasoningEffort,
  );

  if (!baseUrl) {
    throw new Error("Provider endpoint is required.");
  }
  if (!model) {
    throw new Error("Model is required.");
  }

  return {
    ...draft,
    providerKind: definition.kind,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    reasoningEffort,
    cliExecutionPolicy: "suggestOnly",
    claudeCliPath: draft.claudeCliPath?.trim() ?? "",
    codexCliPath: draft.codexCliPath?.trim() ?? "",
  };
}

export function providerNeedsApiKey(settings: AiProviderSettings) {
  return getAiProviderDefinition(settings.providerKind).requiresApiKey;
}

export function validateAiProviderForChat(
  settings: AiProviderSettings,
  hasApiKey: boolean,
): AiProviderSettings {
  const normalized = normalizeAiProviderDraft(settings);
  const definition = getAiProviderDefinition(normalized.providerKind);
  if (definition.requiresApiKey && !hasApiKey) {
    throw new Error(`${definition.label} needs an API key before AI Assistant can chat.`);
  }
  return normalized;
}

function normalizeReasoningEffort(
  value: AiReasoningEffort | undefined,
  supported: AiReasoningEffort[],
  fallback: AiReasoningEffort,
) {
  const normalized = value ?? fallback;
  return supported.includes(normalized) ? normalized : fallback;
}
