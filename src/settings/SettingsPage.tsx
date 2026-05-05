import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Download,
  ExternalLink,
  Info,
  Languages,
  PackageOpen,
  Palette,
  RotateCcw,
  Save,
  Server,
  Terminal,
  Trash2,
} from "lucide-react";
import {
  AI_PROVIDER_DEFINITIONS,
  getAiProviderDefinition,
  normalizeAiProviderDraft,
  providerDefaultsFor,
  type AiProviderDefinition,
  type AiProviderSettingsField,
} from "../ai/providers";
import { AI_PROVIDER_SECRET_OWNER_ID } from "../lib/settings";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { defaultAppearanceSettings } from "../sample-data";
import { ABOUT_PRODUCT, OPEN_SOURCE_COMPONENT_GROUPS, type OpenSourceComponent } from "./aboutData";
import { useWorkspaceStore } from "../store";
import type {
  AiProviderKind,
  AiProviderSettings,
  AiReasoningEffort,
  AppearanceSettings,
  TerminalCursorStyle,
  TerminalSettings,
} from "../types";

// Re-exported for any external callers; new code should import from
// `lib/settings` directly so the keychain owner id has one source of truth.
export { AI_PROVIDER_SECRET_OWNER_ID };

type SettingsSectionId =
  | "terminal-settings"
  | "ssh-settings"
  | "sftp-settings"
  | "assistant-settings"
  | "appearance-settings"
  | "about-settings";

const SETTINGS_SECTION_IDS: SettingsSectionId[] = [
  "terminal-settings",
  "ssh-settings",
  "sftp-settings",
  "assistant-settings",
  "appearance-settings",
  "about-settings",
];

export function SettingsPage({
  onBack,
  onResetLayout,
}: {
  onBack: () => void;
  onResetLayout: () => void;
}) {
  const terminalSettings = useWorkspaceStore((state) => state.terminalSettings);
  const sshSettings = useWorkspaceStore((state) => state.sshSettings);
  const sftpSettings = useWorkspaceStore((state) => state.sftpSettings);
  const aiProviderSettings = useWorkspaceStore((state) => state.aiProviderSettings);
  const appearanceSettings = useWorkspaceStore((state) => state.appearanceSettings);
  const aiProviderHasApiKey = useWorkspaceStore((state) => state.aiProviderHasApiKey);
  const setTerminalSettings = useWorkspaceStore((state) => state.setTerminalSettings);
  const setAppearanceSettings = useWorkspaceStore((state) => state.setAppearanceSettings);
  const setAiProviderSettings = useWorkspaceStore((state) => state.setAiProviderSettings);
  const setAiProviderHasApiKey = useWorkspaceStore((state) => state.setAiProviderHasApiKey);
  const [terminalDraft, setTerminalDraft] = useState(terminalSettings);
  const [appearanceDraft, setAppearanceDraft] = useState(appearanceSettings);
  const [aiDraft, setAiDraft] = useState(aiProviderSettings);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [appearanceStatus, setAppearanceStatus] = useState("");
  const [appearanceError, setAppearanceError] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiError, setAiError] = useState("");
  const [activeSectionId, setActiveSectionId] =
    useState<SettingsSectionId>("terminal-settings");
  const hasTerminalChanges = JSON.stringify(terminalDraft) !== JSON.stringify(terminalSettings);
  const hasAppearanceChanges =
    JSON.stringify(appearanceDraft) !== JSON.stringify(appearanceSettings);
  const hasAiChanges =
    JSON.stringify(aiDraft) !== JSON.stringify(aiProviderSettings) || apiKeyDraft.trim().length > 0;
  const aiProviderDefinition = getAiProviderDefinition(aiDraft.providerKind);

  useEffect(() => {
    setTerminalDraft(terminalSettings);
  }, [terminalSettings]);

  useEffect(() => {
    setAppearanceDraft(appearanceSettings);
  }, [appearanceSettings]);

  useEffect(() => {
    setAiDraft(aiProviderSettings);
  }, [aiProviderSettings]);

  useEffect(() => {
    function syncActiveSectionFromHash() {
      const sectionId = window.location.hash.slice(1);
      if (isSettingsSectionId(sectionId)) {
        setActiveSectionId(sectionId);
        document.getElementById(sectionId)?.scrollIntoView();
      }
    }

    syncActiveSectionFromHash();
    window.addEventListener("hashchange", syncActiveSectionFromHash);
    return () => window.removeEventListener("hashchange", syncActiveSectionFromHash);
  }, []);

  async function handleSaveTerminalSettings() {
    try {
      setError("");
      setStatus("");
      const nextSettings = normalizeTerminalSettingsDraft(terminalDraft);
      const saved = isTauriRuntime()
        ? await invokeCommand("update_terminal_settings", { request: nextSettings })
        : nextSettings;
      setTerminalSettings(saved);
      setTerminalDraft(saved);
      setStatus("Terminal settings saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveAppearanceSettings() {
    try {
      setAppearanceError("");
      setAppearanceStatus("");
      const nextSettings = normalizeAppearanceSettingsDraft(appearanceDraft);
      const saved = isTauriRuntime()
        ? await invokeCommand("update_appearance_settings", { request: nextSettings })
        : nextSettings;
      setAppearanceSettings(saved);
      setAppearanceDraft(saved);
      setAppearanceStatus("Appearance settings saved.");
    } catch (error) {
      setAppearanceError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleResetAppearanceSettings() {
    try {
      setAppearanceError("");
      setAppearanceStatus("");
      const saved = isTauriRuntime()
        ? await invokeCommand("update_appearance_settings", {
            request: defaultAppearanceSettings,
          })
        : defaultAppearanceSettings;
      setAppearanceSettings(saved);
      setAppearanceDraft(saved);
      setAppearanceStatus("Appearance settings reset.");
    } catch (error) {
      setAppearanceError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveAiProviderSettings() {
    try {
      setAiError("");
      setAiStatus("");
      const nextSettings = normalizeAiProviderDraft(aiDraft);

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
      setAiDraft(saved);
      setAiStatus("AI provider saved.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleClearAiProviderSettings() {
    const shouldClear = window.confirm(
      "Clear all AI provider settings and remove the saved AI API key?",
    );
    if (!shouldClear) {
      return;
    }

    try {
      setAiError("");
      setAiStatus("");
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
      setAiDraft(saved);
      setApiKeyDraft("");
      setAiProviderHasApiKey(false);
      setAiStatus("AI provider settings cleared.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleAiProviderKindChange(providerKind: AiProviderKind) {
    const defaults = providerDefaultsFor(providerKind);
    setAiDraft((settings) => ({
      ...settings,
      providerKind,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      reasoningEffort: defaults.reasoningEffort,
    }));
    setApiKeyDraft("");
    setAiStatus("");
    setAiError("");
  }

  return (
    <main className="settings-page">
      <header className="settings-page-header">
        <div>
          <p className="panel-label">AdminDeck</p>
          <h1>Settings</h1>
        </div>
        <button className="toolbar-button" type="button" onClick={onBack}>
          <ArrowLeft size={15} />
          Workspace
        </button>
      </header>

      <div className="settings-layout">
        <aside className="settings-nav" aria-label="Settings sections">
          <a
            href="#terminal-settings"
            className={settingsNavItemClass("terminal-settings", activeSectionId)}
            onClick={() => setActiveSectionId("terminal-settings")}
          >
            <Terminal size={16} />
            <span>Terminal</span>
          </a>
          <a
            href="#ssh-settings"
            className={settingsNavItemClass("ssh-settings", activeSectionId)}
            onClick={() => setActiveSectionId("ssh-settings")}
          >
            <Server size={16} />
            <span>SSH</span>
          </a>
          <a
            href="#sftp-settings"
            className={settingsNavItemClass("sftp-settings", activeSectionId)}
            onClick={() => setActiveSectionId("sftp-settings")}
          >
            <Download size={16} />
            <span>SFTP</span>
          </a>
          <a
            href="#assistant-settings"
            className={settingsNavItemClass("assistant-settings", activeSectionId)}
            onClick={() => setActiveSectionId("assistant-settings")}
          >
            <Bot size={16} />
            <span>AI Assistant</span>
          </a>
          <a
            href="#appearance-settings"
            className={settingsNavItemClass("appearance-settings", activeSectionId)}
            onClick={() => setActiveSectionId("appearance-settings")}
          >
            <Palette size={16} />
            <span>Appearance</span>
          </a>
          <a
            href="#about-settings"
            className={settingsNavItemClass("about-settings", activeSectionId)}
            onClick={() => setActiveSectionId("about-settings")}
          >
            <Info size={16} />
            <span>About</span>
          </a>
        </aside>

        <section className="settings-content" aria-label="Settings">
          <section className="settings-card settings-section" id="terminal-settings">
            <div className="settings-section-header">
              <div>
                <p className="panel-label">Terminal</p>
                <h2>Terminal behavior</h2>
              </div>
              <button
                className="toolbar-button"
                disabled={!hasTerminalChanges}
                onClick={() => void handleSaveTerminalSettings()}
                type="button"
              >
                <Save size={15} />
                Save
              </button>
            </div>

            <div className="form-grid three-columns">
              <label>
                <span>Font family</span>
                <input
                  onChange={(event) => {
                    const fontFamily = event.currentTarget.value;
                    setTerminalDraft((settings) => ({
                      ...settings,
                      fontFamily,
                    }));
                  }}
                  value={terminalDraft.fontFamily}
                />
              </label>
              <label>
                <span>Font size</span>
                <input
                  inputMode="numeric"
                  max={32}
                  min={8}
                  onChange={(event) => {
                    const fontSize = Number(event.currentTarget.value);
                    setTerminalDraft((settings) => ({
                      ...settings,
                      fontSize,
                    }));
                  }}
                  type="number"
                  value={terminalDraft.fontSize}
                />
              </label>
              <label>
                <span>Line height</span>
                <input
                  max={2}
                  min={1}
                  onChange={(event) => {
                    const lineHeight = Number(event.currentTarget.value);
                    setTerminalDraft((settings) => ({
                      ...settings,
                      lineHeight,
                    }));
                  }}
                  step={0.05}
                  type="number"
                  value={terminalDraft.lineHeight}
                />
              </label>
            </div>

            <div className="form-grid three-columns">
              <label>
                <span>Scrollback lines</span>
                <input
                  inputMode="numeric"
                  max={100000}
                  min={100}
                  onChange={(event) => {
                    const scrollbackLines = Number(event.currentTarget.value);
                    setTerminalDraft((settings) => ({
                      ...settings,
                      scrollbackLines,
                    }));
                  }}
                  step={100}
                  type="number"
                  value={terminalDraft.scrollbackLines}
                />
                <small className="field-hint">Default is 10,000. Valid range is 100 to 100,000.</small>
              </label>
              <label>
                <span>Cursor style</span>
                <select
                  onChange={(event) => {
                    const cursorStyle = event.currentTarget.value as TerminalCursorStyle;
                    setTerminalDraft((settings) => ({
                      ...settings,
                      cursorStyle,
                    }));
                  }}
                  value={terminalDraft.cursorStyle}
                >
                  <option value="block">Block</option>
                  <option value="bar">Bar</option>
                  <option value="underline">Underline</option>
                </select>
              </label>
              <label>
                <span>Default shell</span>
                <select
                  onChange={(event) => {
                    const defaultShell = event.currentTarget.value;
                    setTerminalDraft((settings) => ({
                      ...settings,
                      defaultShell,
                    }));
                  }}
                  value={terminalDraft.defaultShell}
                >
                  <option value="powershell.exe">PowerShell</option>
                  <option value="cmd.exe">Command Prompt</option>
                  <option value="wsl.exe">WSL</option>
                </select>
              </label>
            </div>

            <div className="settings-toggles">
              <label>
                <input
                  checked={terminalDraft.copyOnSelect}
                  onChange={(event) => {
                    const copyOnSelect = event.currentTarget.checked;
                    setTerminalDraft((settings) => ({
                      ...settings,
                      copyOnSelect,
                    }));
                  }}
                  type="checkbox"
                />
                Copy selected terminal text automatically
              </label>
              <label>
                <input
                  checked={terminalDraft.confirmMultilinePaste}
                  onChange={(event) => {
                    const confirmMultilinePaste = event.currentTarget.checked;
                    setTerminalDraft((settings) => ({
                      ...settings,
                      confirmMultilinePaste,
                    }));
                  }}
                  type="checkbox"
                />
                Confirm multiline paste
              </label>
            </div>

            {status ? <p className="settings-status success">{status}</p> : null}
            {error ? <p className="settings-status error">{error}</p> : null}
          </section>

          <section className="settings-card settings-section" id="ssh-settings">
            <div className="settings-section-header">
              <div>
                <p className="panel-label">SSH</p>
                <h2>SSH defaults</h2>
              </div>
            </div>
            <div className="settings-summary-grid">
              <SettingsSummary label="Default user" value={sshSettings.defaultUser} />
              <SettingsSummary label="Default port" value={String(sshSettings.defaultPort)} />
              <SettingsSummary label="Default key" value={sshSettings.defaultKeyPath || "Not set"} />
              <SettingsSummary label="ProxyJump" value={sshSettings.defaultProxyJump || "Not set"} />
            </div>
          </section>

          <section className="settings-card settings-section" id="sftp-settings">
            <div className="settings-section-header">
              <div>
                <p className="panel-label">SFTP</p>
                <h2>Transfer defaults</h2>
              </div>
            </div>
            <div className="settings-summary-grid compact">
              <SettingsSummary
                label="Overwrite behavior"
                value={sftpSettings.overwriteBehavior === "overwrite" ? "Overwrite" : "Fail"}
              />
            </div>
          </section>

          <section className="settings-card settings-section" id="assistant-settings">
            <div className="settings-section-header">
              <div>
                <p className="panel-label">AI Assistant</p>
                <h2>AI provider</h2>
              </div>
              <div className="settings-header-actions">
                <button
                  className="toolbar-button"
                  disabled={!hasAiChanges}
                  onClick={() => void handleSaveAiProviderSettings()}
                  type="button"
                >
                  <Save size={15} />
                  Save
                </button>
                <button
                  className="toolbar-button"
                  onClick={() => void handleClearAiProviderSettings()}
                  type="button"
                >
                  <Trash2 size={15} />
                  Clear All Settings
                </button>
              </div>
            </div>

            <div className="form-grid ai-provider-selector-grid">
              <label>
                <span>Provider</span>
                <select
                  onChange={(event) =>
                    handleAiProviderKindChange(event.currentTarget.value as AiProviderKind)
                  }
                  value={aiDraft.providerKind}
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
                  draft={aiDraft}
                  field={field}
                  hasApiKey={aiProviderHasApiKey}
                  key={field}
                  onApiKeyDraftChange={setApiKeyDraft}
                  onDraftChange={(patch) =>
                    setAiDraft((settings) => ({
                      ...settings,
                      ...patch,
                    }))
                  }
                />
              ))}
            </div>

            <div className="settings-summary-grid compact">
              <SettingsSummary label="Active endpoint" value={formatProviderHost(aiDraft.baseUrl)} />
              <SettingsSummary
                label="Capabilities"
                value={aiProviderDefinition.capabilities
                  .map(formatAiProviderCapability)
                  .join(", ")}
              />
              <SettingsSummary
                label="Reasoning"
                value={formatReasoningEffort(aiDraft.reasoningEffort)}
              />
            </div>
            {aiStatus ? <p className="settings-status success">{aiStatus}</p> : null}
            {aiError ? <p className="settings-status error">{aiError}</p> : null}
          </section>

          <section className="settings-card settings-section" id="appearance-settings">
            <div className="settings-section-header">
              <div>
                <p className="panel-label">Appearance</p>
                <h2>Interface</h2>
              </div>
              <div className="settings-header-actions">
                <button
                  className="toolbar-button"
                  disabled={!hasAppearanceChanges}
                  onClick={() => void handleSaveAppearanceSettings()}
                  type="button"
                >
                  <Save size={15} />
                  Save
                </button>
                <button
                  className="toolbar-button"
                  onClick={() => void handleResetAppearanceSettings()}
                  type="button"
                >
                  <RotateCcw size={15} />
                  Reset Font
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label>
                <span>App UI font family</span>
                <input
                  list="app-ui-font-options"
                  onChange={(event) => {
                    const appFontFamily = event.currentTarget.value;
                    setAppearanceDraft((settings) => ({
                      ...settings,
                      appFontFamily,
                    }));
                  }}
                  value={appearanceDraft.appFontFamily}
                />
                <datalist id="app-ui-font-options">
                  <option value={defaultAppearanceSettings.appFontFamily}>Satoshi</option>
                  <option value='Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>
                    System sans
                  </option>
                  <option value='"Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, sans-serif'>
                    Segoe UI Variable
                  </option>
                </datalist>
                <small className="field-hint">
                  Default uses src/assets/fonts/Satoshi-Variable.ttf.
                </small>
              </label>
              <SettingsSummary label="Active UI font" value={appearanceDraft.appFontFamily} />
            </div>
            <div className="settings-reset-layout">
              <div>
                <strong>Layout</strong>
                <span>Reset panel widths, collapsed panels, and saved terminal pane layouts.</span>
              </div>
              <button className="toolbar-button" onClick={onResetLayout} type="button">
                <RotateCcw size={15} />
                Reset Layout
              </button>
            </div>
            <div className="settings-placeholder-list">
              <button className="settings-placeholder-item" type="button">
                <Languages size={17} />
                <span>Language (i18n)</span>
                <strong>To be implemented</strong>
              </button>
              <button className="settings-placeholder-item" type="button">
                <Palette size={17} />
                <span>Color Scheme</span>
                <strong>To be implemented</strong>
              </button>
            </div>
            {appearanceStatus ? (
              <p className="settings-status success">{appearanceStatus}</p>
            ) : null}
            {appearanceError ? <p className="settings-status error">{appearanceError}</p> : null}
          </section>

          <section className="settings-card settings-section" id="about-settings">
            <div className="settings-section-header">
              <div>
                <p className="panel-label">About</p>
                <h2>{ABOUT_PRODUCT.name}</h2>
              </div>
              <a
                className="toolbar-button"
                href={ABOUT_PRODUCT.repositoryUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={15} />
                GitHub
              </a>
            </div>

            <div className="about-hero">
              <div>
                <strong>{ABOUT_PRODUCT.name}</strong>
                <span>{ABOUT_PRODUCT.slogan}</span>
              </div>
              <PackageOpen size={34} />
            </div>

            <div className="settings-summary-grid">
              <SettingsSummary label="Developer" value={ABOUT_PRODUCT.developer} />
              <SettingsSummary label="Version" value={ABOUT_PRODUCT.version} />
              <SettingsSummary label="License" value={ABOUT_PRODUCT.license} />
              <SettingsSummary label="Repository" value={ABOUT_PRODUCT.repositoryUrl} />
            </div>

            <div className="open-source-panel">
              <div className="open-source-panel-header">
                <div>
                  <strong>Open-source components</strong>
                  <span>
                    Direct frontend, tooling, and Rust components referenced by the project
                    manifests.
                  </span>
                </div>
                <span>{openSourceComponentCount()} components</span>
              </div>
              <div className="open-source-groups">
                {OPEN_SOURCE_COMPONENT_GROUPS.map((group) => (
                  <OpenSourceComponentGroup
                    components={group.components}
                    key={group.label}
                    label={group.label}
                  />
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
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
  draft: AiProviderSettings;
  field: AiProviderSettingsField;
  hasApiKey: boolean;
  onApiKeyDraftChange: (value: string) => void;
  onDraftChange: (patch: Partial<AiProviderSettings>) => void;
}) {
  switch (field) {
    case "baseUrl":
      return (
        <label>
          <span>Endpoint</span>
          <input
            onChange={(event) => onDraftChange({ baseUrl: event.currentTarget.value })}
            readOnly={!definition.allowsCustomBaseUrl}
            value={draft.baseUrl}
          />
        </label>
      );
    case "model": {
      const datalistId = `ai-provider-model-options-${definition.kind}`;
      return (
        <label>
          <span>Model</span>
          <input
            list={datalistId}
            onChange={(event) => onDraftChange({ model: event.currentTarget.value })}
            value={draft.model}
          />
          <datalist id={datalistId}>
            {definition.modelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </datalist>
        </label>
      );
    }
    case "reasoningEffort":
      return (
        <label>
          <span>Reasoning effort</span>
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
            placeholder={hasApiKey ? "Saved" : definition.apiKeyLabel}
            type="password"
            value={apiKeyDraft}
          />
        </label>
      );
    default:
      return null;
  }
}

function SettingsSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isSettingsSectionId(value: string): value is SettingsSectionId {
  return SETTINGS_SECTION_IDS.includes(value as SettingsSectionId);
}

function settingsNavItemClass(sectionId: SettingsSectionId, activeSectionId: SettingsSectionId) {
  return `settings-nav-item${sectionId === activeSectionId ? " active" : ""}`;
}

function OpenSourceComponentGroup({
  components,
  label,
}: {
  components: readonly OpenSourceComponent[];
  label: string;
}) {
  return (
    <section className="open-source-group">
      <h3>{label}</h3>
      <div className="open-source-table" role="table" aria-label={`${label} components`}>
        <div className="open-source-table-row header" role="row">
          <span role="columnheader">Component</span>
          <span role="columnheader">Version</span>
          <span role="columnheader">License</span>
          <span role="columnheader">Role</span>
        </div>
        {components.map((component) => (
          <div className="open-source-table-row" key={component.name} role="row">
            <strong role="cell">{component.name}</strong>
            <span role="cell">{component.version}</span>
            <span role="cell">{component.license}</span>
            <span role="cell">{component.role}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function openSourceComponentCount() {
  return OPEN_SOURCE_COMPONENT_GROUPS.reduce(
    (count, group) => count + group.components.length,
    0,
  );
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

function formatProviderHost(baseUrl: string) {
  try {
    return new URL(baseUrl).host || "OpenAI-compatible endpoint";
  } catch {
    return "OpenAI-compatible endpoint";
  }
}

function normalizeTerminalSettingsDraft(settings: TerminalSettings): TerminalSettings {
  if (!settings.fontFamily.trim()) {
    throw new Error("Font family is required.");
  }
  if (!settings.defaultShell.trim()) {
    throw new Error("Default shell is required.");
  }
  if (!Number.isFinite(settings.fontSize) || settings.fontSize < 8 || settings.fontSize > 32) {
    throw new Error("Terminal font size must be between 8 and 32.");
  }
  if (!Number.isFinite(settings.lineHeight) || settings.lineHeight < 1 || settings.lineHeight > 2) {
    throw new Error("Terminal line height must be between 1.0 and 2.0.");
  }
  if (
    !Number.isFinite(settings.scrollbackLines) ||
    settings.scrollbackLines < 100 ||
    settings.scrollbackLines > 100_000
  ) {
    throw new Error("Terminal scrollback must be between 100 and 100000 lines.");
  }

  return {
    ...settings,
    fontFamily: settings.fontFamily.trim(),
    fontSize: Math.round(settings.fontSize),
    lineHeight: Number(settings.lineHeight.toFixed(2)),
    scrollbackLines: Math.round(settings.scrollbackLines),
    defaultShell: settings.defaultShell.trim(),
  };
}

function normalizeAppearanceSettingsDraft(settings: AppearanceSettings): AppearanceSettings {
  if (!settings.appFontFamily.trim()) {
    throw new Error("App UI font family is required.");
  }

  return {
    ...settings,
    appFontFamily: settings.appFontFamily.trim(),
  };
}
