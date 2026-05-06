import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AI_PROVIDER_DEFINITIONS,
  getAiProviderDefinition,
  normalizeAiProviderDraft,
  providerDefaultsFor,
  type AiProviderDefinition,
  type AiProviderSettingsField,
} from "../ai/providers";
import { SUPPORTED_LANGUAGES } from "../i18n/config";
import { AI_PROVIDER_SECRET_OWNER_ID } from "../lib/settings";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import type {
  AiProviderKind,
  AiProviderSettings as AiProviderSettingsType,
  AiReasoningEffort,
} from "../types";
import { SettingsSummary } from "./shared";

function formatProviderHost(baseUrl: string) {
  try {
    return new URL(baseUrl).host || "OpenAI-compatible endpoint";
  } catch {
    return "OpenAI-compatible endpoint";
  }
}

function formatAiProviderCapability(capability: string) {
  switch (capability) {
    case "toolCalling":
      return "tools";
    case "mcpReady":
      return "MCP ready";
    case "localRuntime":
      return "local";
    case "openAiCompatible":
      return "OpenAI compatible";
    case "sdkOAuth":
      return "SDK OAuth";
    default:
      return capability;
  }
}

function formatReasoningEffort(effort: AiReasoningEffort) {
  switch (effort) {
    case "default":
      return "Provider default";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "max":
      return "Max";
    default:
      return effort;
  }
}

function AiProviderSettingsFieldControl({
  apiKeyDraft,
  definition,
  draft,
  field,
  hasApiKey,
  onApiKeyDraftChange,
  onDraftChange,
}: {
  apiKeyDraft: string;
  definition: AiProviderDefinition;
  draft: AiProviderSettingsType;
  field: AiProviderSettingsField;
  hasApiKey: boolean;
  onApiKeyDraftChange: (value: string) => void;
  onDraftChange: (patch: Partial<AiProviderSettingsType>) => void;
}) {
  const { t } = useTranslation();

  switch (field) {
    case "baseUrl":
      return (
        <label>
          <span>{t("settings.endpoint")}</span>
          <input
            onChange={(event) => onDraftChange({ baseUrl: event.currentTarget.value })}
            readOnly={!definition.allowsCustomBaseUrl}
            value={draft.baseUrl}
          />
        </label>
      );
    case "model": {
      const modelOptionIds = new Set(definition.modelOptions.map((model) => model.id));
      const hasCustomModel = draft.model.trim().length > 0 && !modelOptionIds.has(draft.model);
      return (
        <>
          <label>
            <span>{t("settings.model")}</span>
            <select
              onChange={(event) => onDraftChange({ model: event.currentTarget.value })}
              value={draft.model}
            >
              {hasCustomModel ? <option value={draft.model}>{draft.model}</option> : null}
              {definition.modelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          {definition.allowsCustomModel ? (
            <label>
              <span>{t("settings.customModelId")}</span>
              <input
                onChange={(event) => onDraftChange({ model: event.currentTarget.value })}
                value={draft.model}
              />
            </label>
          ) : null}
        </>
      );
    }
    case "reasoningEffort":
      return (
        <label>
          <span>{t("settings.reasoningEffort")}</span>
          <select
            onChange={(event) =>
              onDraftChange({ reasoningEffort: event.currentTarget.value as AiReasoningEffort })
            }
            value={draft.reasoningEffort}
          >
            {definition.reasoningEfforts.map((effort) => (
              <option key={effort} value={effort}>
                {formatReasoningEffort(effort)}
              </option>
            ))}
          </select>
        </label>
      );
    case "apiKey":
      return (
        <label>
          <span>{definition.apiKeyLabel}</span>
          <input
            autoComplete="off"
            disabled={!definition.requiresApiKey}
            onChange={(event) => onApiKeyDraftChange(event.currentTarget.value)}
            placeholder={hasApiKey ? t("settings.save") : definition.apiKeyLabel}
            type="password"
            value={apiKeyDraft}
          />
        </label>
      );
    default:
      return null;
  }
}

function AiOutputLanguageControl({
  draft,
  onDraftChange,
}: {
  draft: AiProviderSettingsType;
  onDraftChange: (patch: Partial<AiProviderSettingsType>) => void;
}) {
  const { t } = useTranslation();
  const datalistId = "ai-output-language-options";
  const languageNames = SUPPORTED_LANGUAGES.map((code) => t(`languages.${code}` as never));

  return (
    <label>
      <span>{t("settings.outputLanguage")}</span>
      <input
        list={datalistId}
        onChange={(event) => onDraftChange({ outputLanguage: event.currentTarget.value })}
        placeholder={t("settings.outputLanguageUiLanguage")}
        value={draft.outputLanguage}
      />
      <datalist id={datalistId}>
        {languageNames.map((name, index) => (
          <option key={SUPPORTED_LANGUAGES[index]} value={name} />
        ))}
      </datalist>
    </label>
  );
}

export function AiSettings() {
  const { t } = useTranslation();
  const aiProviderSettings = useWorkspaceStore((state) => state.aiProviderSettings);
  const aiProviderHasApiKey = useWorkspaceStore((state) => state.aiProviderHasApiKey);
  const setAiProviderSettings = useWorkspaceStore((state) => state.setAiProviderSettings);
  const setAiProviderHasApiKey = useWorkspaceStore((state) => state.setAiProviderHasApiKey);
  const [draft, setDraft] = useState(aiProviderSettings);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const hasChanges =
    JSON.stringify(draft) !== JSON.stringify(aiProviderSettings) || apiKeyDraft.trim().length > 0;
  const aiProviderDefinition = getAiProviderDefinition(draft.providerKind);

  useEffect(() => {
    setDraft(aiProviderSettings);
  }, [aiProviderSettings]);

  async function handleSave() {
    try {
      setError("");
      setStatus("");
      const nextSettings = normalizeAiProviderDraft(draft);

      if (apiKeyDraft.trim()) {
        if (isTauriRuntime()) {
          await invokeCommand("store_secret", {
            request: {
              kind: "aiApiKey",
              ownerId: AI_PROVIDER_SECRET_OWNER_ID,
              secret: apiKeyDraft.trim(),
            },
          });
        }
        setAiProviderHasApiKey(true);
        setApiKeyDraft("");
      }

      const saved = isTauriRuntime()
        ? await invokeCommand("update_ai_provider_settings", { request: nextSettings })
        : nextSettings;
      setAiProviderSettings(saved);
      setDraft(saved);
      setStatus(t("settings.aiProviderSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleClear() {
    const shouldClear = window.confirm(t("settings.clearAiConfirm"));
    if (!shouldClear) {
      return;
    }

    try {
      setError("");
      setStatus("");
      const defaults = providerDefaultsFor("openai");
      if (isTauriRuntime()) {
        await invokeCommand("delete_secret", {
          request: {
            kind: "aiApiKey",
            ownerId: AI_PROVIDER_SECRET_OWNER_ID,
          },
        });
      }
      const saved = isTauriRuntime()
        ? await invokeCommand("update_ai_provider_settings", { request: defaults })
        : defaults;
      setAiProviderSettings(saved);
      setDraft(saved);
      setApiKeyDraft("");
      setAiProviderHasApiKey(false);
      setStatus(t("settings.aiProviderCleared"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleAiProviderKindChange(providerKind: AiProviderKind) {
    const defaults = providerDefaultsFor(providerKind);
    setDraft((settings) => ({
      ...settings,
      providerKind,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      reasoningEffort: defaults.reasoningEffort,
    }));
    setApiKeyDraft("");
    setStatus("");
    setError("");
  }

  return (
    <section className="settings-card settings-section">
      <div className="settings-section-header">
        <div>
          <p className="panel-label">{t("settings.sectionAiAssistant")}</p>
          <h2>{t("settings.aiProvider")}</h2>
        </div>
        <div className="settings-header-actions">
          <button
            className="toolbar-button"
            disabled={!hasChanges}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save size={15} />
            {t("settings.save")}
          </button>
          <button
            className="toolbar-button"
            onClick={() => void handleClear()}
            type="button"
          >
            <Trash2 size={15} />
            {t("settings.clearAllSettings")}
          </button>
        </div>
      </div>

      <div className="form-grid ai-provider-selector-grid">
        <label>
          <span>{t("settings.provider")}</span>
          <select
            onChange={(event) =>
              handleAiProviderKindChange(event.currentTarget.value as AiProviderKind)
            }
            value={draft.providerKind}
          >
            {AI_PROVIDER_DEFINITIONS.map((definition) => (
              <option key={definition.kind} value={definition.kind}>
                {definition.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ai-provider-fields">
        {aiProviderDefinition.settingsFields.map((field) => (
          <AiProviderSettingsFieldControl
            apiKeyDraft={apiKeyDraft}
            definition={aiProviderDefinition}
            draft={draft}
            field={field}
            hasApiKey={aiProviderHasApiKey}
            key={field}
            onApiKeyDraftChange={setApiKeyDraft}
            onDraftChange={(patch) =>
              setDraft((settings) => ({
                ...settings,
                ...patch,
              }))
            }
          />
        ))}
        <AiOutputLanguageControl
          draft={draft}
          onDraftChange={(patch) =>
            setDraft((settings) => ({
              ...settings,
              ...patch,
            }))
          }
        />
      </div>

      <div className="settings-summary-grid compact">
        <SettingsSummary label={t("settings.activeEndpoint")} value={formatProviderHost(draft.baseUrl)} />
        <SettingsSummary
          label={t("settings.capabilities")}
          value={aiProviderDefinition.capabilities
            .map(formatAiProviderCapability)
            .join(", ")}
        />
        <SettingsSummary
          label={t("settings.reasoning")}
          value={formatReasoningEffort(draft.reasoningEffort)}
        />
      </div>
      {status ? <p className="settings-status success">{status}</p> : null}
      {error ? <p className="settings-status error">{error}</p> : null}
    </section>
  );
}
