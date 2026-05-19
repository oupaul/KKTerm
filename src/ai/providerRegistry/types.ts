import type { AiProviderKind, AiProviderSettings, AiReasoningEffort } from "../../types";

export type AiProviderCapability =
  | "chat"
  | "imageInput"
  | "streaming"
  | "toolCalling"
  | "mcpReady"
  | "localRuntime"
  | "openAiCompatible"
  | "sdkOAuth";

export type AiProviderModelListStrategy =
  | "githubCopilotSdk"
  | "ollamaTags"
  | "openAiCompatible";

export type AiModelOption = {
  id: string;
  label: string;
  note?: string;
  recommended?: boolean;
  supportsImageInput?: boolean;
};

export type AiProviderSettingsField =
  | "baseUrl"
  | "apiMode"
  | "model"
  | "reasoningEffort"
  | "apiKey"
  | "extraHeaders";

export type AiProviderDefinition = {
  kind: AiProviderKind;
  label: string;
  baseUrl: string;
  defaultModel: string;
  defaultReasoningEffort: AiReasoningEffort;
  reasoningEfforts: AiReasoningEffort[];
  requiresApiKey: boolean;
  allowsCustomBaseUrl: boolean;
  allowsCustomModel: boolean;
  apiKeyLabel: string;
  apiKeyUrl?: string;
  modelOptions: AiModelOption[];
  modelListStrategy?: AiProviderModelListStrategy;
  strictModelList?: boolean;
  settingsFields: AiProviderSettingsField[];
  capabilities: AiProviderCapability[];
};

export type AiProviderDefaults = Pick<
  AiProviderSettings,
  | "providerKind"
  | "baseUrl"
  | "model"
  | "reasoningEffort"
  | "outputLanguage"
  | "apiMode"
  | "extraHeaders"
  | "allowInsecureTls"
  | "cliExecutionPolicy"
  | "claudeCliPath"
  | "codexCliPath"
>;
