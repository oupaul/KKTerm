import { type FormEvent, useEffect, useRef, useState } from "react";
import { FolderOpen, KeyRound, Play, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { invokeCommand, isTauriRuntime, selectKeyFile } from "../../lib/tauri";
import { LegacyDialogActions } from "../../app/ui/dialog";
import { SSH_SETTINGS_SOCKS_PROXY_PASSWORD_OWNER_ID } from "../workspace/connections/utils";
import { useWorkspaceStore } from "../../store";
import type { SshCompressionMode, SshSettings as SshSettingsType } from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

function normalizeSshSettingsDraft(settings: SshSettingsType, t: TFunction): SshSettingsType {
  const defaultUser = settings.defaultUser.trim();
  const defaultKeyPath = settings.defaultKeyPath?.trim() || undefined;
  const defaultProxyJump = settings.defaultProxyJump?.trim() || undefined;
  const defaultSshSocksProxy = settings.defaultSshSocksProxy?.trim() || undefined;
  const defaultSshSocksProxyUsername = settings.defaultSshSocksProxyUsername?.trim() || undefined;
  const defaultPort = Math.round(settings.defaultPort);
  const bufferLines = Math.round(settings.bufferLines ?? 5000);
  const defaultTransparency = Math.round(settings.defaultTransparency ?? 50);
  const xServerDisplay = Math.round(settings.xServerDisplay ?? 0);
  const xServerArgs = settings.xServerArgs?.trim() || "-multiwindow -clipboard -wgl";

  if (!defaultUser) {
    throw new Error(t("settings.defaultSshUserRequired"));
  }
  if (!Number.isFinite(defaultPort) || defaultPort < 1 || defaultPort > 65535) {
    throw new Error(t("settings.defaultSshPortRange"));
  }
  if (!Number.isFinite(bufferLines) || bufferLines < 100 || bufferLines > 100_000) {
    throw new Error(t("settings.sshBufferRange"));
  }
  if (!Number.isFinite(defaultTransparency) || defaultTransparency < 0 || defaultTransparency > 100) {
    throw new Error(t("settings.defaultTransparencyRange"));
  }
  if (!Number.isFinite(xServerDisplay) || xServerDisplay < 0 || xServerDisplay > 99) {
    throw new Error(t("settings.xServerDisplayRange"));
  }

  return {
    defaultUser,
    defaultPort,
    defaultKeyPath,
    defaultProxyJump,
    defaultSshSocksProxy,
    defaultSshSocksProxyUsername,
    defaultSshCompression: settings.defaultSshCompression ?? "fast",
    bufferLines,
    defaultTransparency,
    defaultUseTmuxSessions: settings.defaultUseTmuxSessions ?? true,
    useRandomDynamicBackground: settings.useRandomDynamicBackground ?? false,
    allowOsc52Clipboard: settings.allowOsc52Clipboard ?? true,
    managedXServerEnabled: settings.managedXServerEnabled ?? false,
    xServerPath: settings.xServerPath?.trim() || undefined,
    xServerDisplay,
    xServerArgs,
  };
}

export function SshSettings() {
  const { t } = useTranslation();
  const sshSettings = useWorkspaceStore((state) => state.sshSettings);
  const setSshSettings = useWorkspaceStore((state) => state.setSshSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [sshDraft, setSshDraft] = useState(sshSettings);
  const [keyEmailDialogOpen, setKeyEmailDialogOpen] = useState(false);
  const [keyEmailDraft, setKeyEmailDraft] = useState("");
  const [sshSocksProxyPasswordDraft, setSshSocksProxyPasswordDraft] = useState("");
  const [hasSavedSshSocksProxyPassword, setHasSavedSshSocksProxyPassword] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [error, setError] = useState("");
  const hasChanges =
    JSON.stringify(sshDraft) !== JSON.stringify(sshSettings) || sshSocksProxyPasswordDraft.length > 0;

  useEffect(() => {
    setSshDraft(sshSettings);
    setSshSocksProxyPasswordDraft("");
  }, [sshSettings]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setHasSavedSshSocksProxyPassword(false);
      return;
    }
    let canceled = false;
    void invokeCommand("secret_exists", {
      request: {
        kind: "sshSocksProxyPassword",
        ownerId: SSH_SETTINGS_SOCKS_PROXY_PASSWORD_OWNER_ID,
      },
    })
      .then((presence) => {
        if (!canceled) {
          setHasSavedSshSocksProxyPassword(presence.exists);
        }
      })
      .catch(() => {
        if (!canceled) {
          setHasSavedSshSocksProxyPassword(false);
        }
      });
    return () => {
      canceled = true;
    };
  }, [sshSettings.defaultSshSocksProxy, sshSettings.defaultSshSocksProxyUsername]);

  async function handleBrowseKeyFile() {
    try {
      const selectedPath = await selectKeyFile(sshDraft.defaultKeyPath);
      if (!selectedPath) {
        return;
      }
      setSshDraft((settings) => ({
        ...settings,
        defaultKeyPath: selectedPath,
      }));
    } catch (browseError) {
      showStatusBarNotice(browseError instanceof Error ? browseError.message : String(browseError), { tone: "error" });
    }
  }

  function handleOpenKeyEmailDialog() {
    setError("");
    setKeyEmailDraft("");
    setKeyEmailDialogOpen(true);
  }

  async function handleGenerateKeyPair(emailInput: string) {
    const email = emailInput.trim();
    if (!email) {
      return;
    }
    try {
      setIsGeneratingKey(true);
      setError("");
      const generated = await invokeCommand("generate_ssh_key_pair", {
        request: { email },
      });
      const nextSettings = {
        ...sshDraft,
        defaultKeyPath: generated.privateKeyPath,
      };
      const normalized = normalizeSshSettingsDraft(nextSettings, t);
      const saved = isTauriRuntime()
        ? await invokeCommand("update_ssh_settings", { request: normalized })
        : normalized;
      setSshSettings(saved);
      setSshDraft(saved);
      showStatusBarNotice(
        t("settings.sshKeyGenerated", {
          privateKeyPath: generated.privateKeyPath,
          publicKeyPath: generated.publicKeyPath,
        }),
        { tone: "success" },
      );
      setKeyEmailDialogOpen(false);
      setKeyEmailDraft("");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : String(generateError));
    } finally {
      setIsGeneratingKey(false);
    }
  }

  async function handleSave() {
    try {
      const nextSshSettings = normalizeSshSettingsDraft(sshDraft, t);
      const savedSshSettings = isTauriRuntime()
        ? await invokeCommand("update_ssh_settings", { request: nextSshSettings })
        : nextSshSettings;
      if (isTauriRuntime()) {
        if (savedSshSettings.defaultSshSocksProxy?.trim() && savedSshSettings.defaultSshSocksProxyUsername?.trim()) {
          if (sshSocksProxyPasswordDraft.length > 0) {
            await invokeCommand("store_secret", {
              request: {
                kind: "sshSocksProxyPassword",
                ownerId: SSH_SETTINGS_SOCKS_PROXY_PASSWORD_OWNER_ID,
                secret: sshSocksProxyPasswordDraft,
              },
            });
            setHasSavedSshSocksProxyPassword(true);
          }
        } else if (hasSavedSshSocksProxyPassword || sshSocksProxyPasswordDraft.length > 0) {
          await invokeCommand("delete_secret", {
            request: {
              kind: "sshSocksProxyPassword",
              ownerId: SSH_SETTINGS_SOCKS_PROXY_PASSWORD_OWNER_ID,
            },
          });
          setHasSavedSshSocksProxyPassword(false);
        }
      }
      setSshSettings(savedSshSettings);
      setSshDraft(savedSshSettings);
      setSshSocksProxyPasswordDraft("");
      showStatusBarNotice(t("settings.sshDefaultsSaved"), { tone: "success" });
    } catch (saveError) {
      showStatusBarNotice(saveError instanceof Error ? saveError.message : String(saveError), { tone: "error" });
    }
  }

  async function handleLaunchXServer() {
    try {
      const nextSshSettings = normalizeSshSettingsDraft(sshDraft, t);
      const savedSshSettings = isTauriRuntime()
        ? await invokeCommand("update_ssh_settings", { request: nextSshSettings })
        : nextSshSettings;
      setSshSettings(savedSshSettings);
      setSshDraft(savedSshSettings);
      if (!isTauriRuntime()) {
        showStatusBarNotice(t("settings.xServerLaunchStarted"), { tone: "success" });
        return;
      }
      const result = await invokeCommand("launch_ssh_x_server");
      showStatusBarNotice(
        result.alreadyRunning
          ? t("settings.xServerAlreadyRunning")
          : t("settings.xServerLaunchStarted"),
        { tone: "success" },
      );
    } catch (launchError) {
      showStatusBarNotice(launchError instanceof Error ? launchError.message : String(launchError), { tone: "error" });
    }
  }

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<Server size={18} />}
        label={t("settings.sectionSsh")}
        title={t("settings.sshDefaults")}
      />

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.sshConnectionDefaults")}</legend>
        <div>
          <p className="field-hint">{t("settings.sshConnectionDefaultsHint")}</p>
        </div>
        <div className="form-grid ssh-default-basic-grid">
          <label data-tutorial-id="settings.defaultUser">
            <span>{t("settings.defaultUser")}</span>
            <input
              autoComplete="username"
              onChange={(event) => {
                const defaultUser = event.currentTarget.value;
                setSshDraft((settings) => ({
                  ...settings,
                  defaultUser,
                }));
              }}
              value={sshDraft.defaultUser}
            />
            <small className="field-hint">{t("settings.defaultSshUserHint")}</small>
          </label>
          <label data-tutorial-id="settings.defaultPort">
            <span>{t("settings.defaultPort")}</span>
            <input
              inputMode="numeric"
              max={65535}
              min={1}
              onChange={(event) => {
                const defaultPort = Number(event.currentTarget.value);
                setSshDraft((settings) => ({
                  ...settings,
                  defaultPort,
                }));
              }}
              type="number"
              value={sshDraft.defaultPort}
            />
            <small className="field-hint">{t("settings.defaultSshPortHint")}</small>
          </label>
          <label>
            <span>{t("settings.proxyJump")}</span>
            <input
              onChange={(event) => {
                const defaultProxyJump = event.currentTarget.value;
                setSshDraft((settings) => ({
                  ...settings,
                  defaultProxyJump,
                }));
              }}
              placeholder={t("settings.proxyJumpPlaceholder")}
              value={sshDraft.defaultProxyJump ?? ""}
            />
            <small className="field-hint">{t("settings.proxyJumpHint")}</small>
          </label>
          <label>
            <span>{t("settings.sshSocksProxy")}</span>
            <input
              onChange={(event) => {
                const defaultSshSocksProxy = event.currentTarget.value;
                setSshDraft((settings) => ({
                  ...settings,
                  defaultSshSocksProxy,
                }));
              }}
              placeholder={t("settings.sshSocksProxyPlaceholder")}
              value={sshDraft.defaultSshSocksProxy ?? ""}
            />
            <small className="field-hint">{t("settings.sshSocksProxyHint")}</small>
          </label>
          <label>
            <span>{t("settings.sshSocksProxyUsername")}</span>
            <input
              autoComplete="username"
              onChange={(event) => {
                const defaultSshSocksProxyUsername = event.currentTarget.value;
                setSshDraft((settings) => ({
                  ...settings,
                  defaultSshSocksProxyUsername,
                }));
              }}
              value={sshDraft.defaultSshSocksProxyUsername ?? ""}
            />
            <small className="field-hint">{t("settings.sshSocksProxyUsernameHint")}</small>
          </label>
          <label>
            <span>{t("settings.sshSocksProxyPassword")}</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setSshSocksProxyPasswordDraft(event.currentTarget.value)}
              placeholder={
                hasSavedSshSocksProxyPassword
                  ? t("settings.sshSocksProxyPasswordSavedPlaceholder")
                  : t("settings.sshSocksProxyPasswordPlaceholder")
              }
              type="password"
              value={sshSocksProxyPasswordDraft}
            />
            <small className="field-hint">{t("settings.sshSocksProxyPasswordHint")}</small>
          </label>
          <label>
            <span>{t("settings.sshCompression")}</span>
            <select
              onChange={(event) => {
                const defaultSshCompression = event.currentTarget.value as SshCompressionMode;
                setSshDraft((settings) => ({
                  ...settings,
                  defaultSshCompression,
                }));
              }}
              value={sshDraft.defaultSshCompression ?? "fast"}
            >
              <option value="fast">{t("settings.sshCompressionFast")}</option>
              <option value="off">{t("settings.sshCompressionOff")}</option>
            </select>
            <small className="field-hint">{t("settings.sshCompressionHint")}</small>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.sshAuthentication")}</legend>
        <div>
          <p className="field-hint">{t("settings.sshAuthenticationHint")}</p>
        </div>
        <div className="form-grid ssh-default-path-grid">
          <label
            className="ssh-key-path-setting"
            data-tutorial-id="settings.defaultKey"
          >
            <span>{t("settings.defaultKey")}</span>
            <div className="input-with-button ssh-key-input-actions">
              <input
                onChange={(event) => {
                  const defaultKeyPath = event.currentTarget.value;
                  setSshDraft((settings) => ({
                    ...settings,
                    defaultKeyPath,
                  }));
                }}
                placeholder={t("settings.defaultKeyPlaceholder")}
                value={sshDraft.defaultKeyPath ?? ""}
              />
              <button
                className="toolbar-button"
                onClick={() => void handleBrowseKeyFile()}
                type="button"
              >
                <FolderOpen size={15} />
                {t("connections.browse")}
              </button>
              <button
                className="toolbar-button"
                onClick={handleOpenKeyEmailDialog}
                type="button"
              >
                <KeyRound size={15} />
                {t("settings.generateSshKey")}
              </button>
            </div>
            <small className="field-hint">{t("settings.defaultKeyHint")}</small>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.sshTerminal")}</legend>
        <div>
          <p className="field-hint">{t("settings.sshTerminalHint")}</p>
        </div>
        <div className="form-grid ssh-default-basic-grid">
          <label data-tutorial-id="settings.sshBufferLines">
            <span>{t("settings.sshBufferLines")}</span>
            <input
              inputMode="numeric"
              max={100000}
              min={100}
              onChange={(event) => {
                const bufferLines = Number(event.currentTarget.value);
                setSshDraft((settings) => ({
                  ...settings,
                  bufferLines,
                }));
              }}
              type="number"
              value={sshDraft.bufferLines}
            />
            <small className="field-hint">{t("settings.sshBufferHint")}</small>
          </label>
          <label>
            <span>{t("settings.defaultTransparency")}</span>
            <input
              inputMode="numeric"
              max={100}
              min={0}
              onChange={(event) => {
                const defaultTransparency = Number(event.currentTarget.value);
                setSshDraft((settings) => ({
                  ...settings,
                  defaultTransparency,
                }));
              }}
              type="number"
              value={sshDraft.defaultTransparency}
            />
            <small className="field-hint">{t("settings.defaultTransparencyHint")}</small>
          </label>
        </div>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={sshDraft.defaultUseTmuxSessions ?? true}
              onChange={(checked) =>
                setSshDraft((settings) => ({ ...settings, defaultUseTmuxSessions: checked }))
              }
            />
            <span>
              <strong>{t("connections.useTmux")}</strong>
            </span>
          </label>
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={sshDraft.useRandomDynamicBackground ?? false}
              onChange={(checked) =>
                setSshDraft((settings) => ({ ...settings, useRandomDynamicBackground: checked }))
              }
            />
            <span>
              <strong>{t("settings.randomDynamicBackgroundOnCreate")}</strong>
              <small>{t("settings.randomDynamicBackgroundOnCreateHint")}</small>
            </span>
          </label>
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={sshDraft.allowOsc52Clipboard ?? true}
              onChange={(checked) =>
                setSshDraft((settings) => ({ ...settings, allowOsc52Clipboard: checked }))
              }
            />
            <span>
              <strong>{t("settings.allowSshOsc52Clipboard")}</strong>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.xServer")}</legend>
        <div className="settings-section-title">
          <div>
            <p className="field-hint">{t("settings.xServerHint")}</p>
          </div>
          <button className="toolbar-button" onClick={() => void handleLaunchXServer()} type="button">
            <Play size={15} />
            {t("settings.xServerLaunch")}
          </button>
        </div>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={sshDraft.managedXServerEnabled ?? false}
              onChange={(checked) =>
                setSshDraft((settings) => ({ ...settings, managedXServerEnabled: checked }))
              }
            />
            <span>
              <strong>{t("settings.xServerManaged")}</strong>
              <small>{t("settings.xServerManagedHint")}</small>
            </span>
          </label>
        </div>
        <div className="form-grid ssh-default-basic-grid">
          <label>
            <span>{t("settings.xServerPath")}</span>
            <input
              onChange={(event) => {
                const xServerPath = event.currentTarget.value;
                setSshDraft((settings) => ({ ...settings, xServerPath }));
              }}
              placeholder={t("settings.xServerPathPlaceholder")}
              value={sshDraft.xServerPath ?? ""}
            />
            <small className="field-hint">{t("settings.xServerPathHint")}</small>
          </label>
          <label>
            <span>{t("settings.xServerDisplay")}</span>
            <input
              inputMode="numeric"
              max={99}
              min={0}
              onChange={(event) => {
                const xServerDisplay = Number(event.currentTarget.value);
                setSshDraft((settings) => ({ ...settings, xServerDisplay }));
              }}
              type="number"
              value={sshDraft.xServerDisplay ?? 0}
            />
            <small className="field-hint">{t("settings.xServerDisplayHint")}</small>
          </label>
          <label>
            <span>{t("settings.xServerArgs")}</span>
            <input
              onChange={(event) => {
                const xServerArgs = event.currentTarget.value;
                setSshDraft((settings) => ({ ...settings, xServerArgs }));
              }}
              value={sshDraft.xServerArgs ?? "-multiwindow -clipboard -wgl"}
            />
            <small className="field-hint">{t("settings.xServerArgsHint")}</small>
          </label>
        </div>
      </fieldset>

      {keyEmailDialogOpen ? (
        <SshKeyEmailDialog
          email={keyEmailDraft}
          error={error}
          isGenerating={isGeneratingKey}
          onCancel={() => {
            if (isGeneratingKey) {
              return;
            }
            setKeyEmailDialogOpen(false);
            setKeyEmailDraft("");
          }}
          onChange={setKeyEmailDraft}
          onSubmit={(email) => void handleGenerateKeyPair(email)}
        />
      ) : null}
    </section>
  );
}

function SshKeyEmailDialog({
  email,
  error,
  isGenerating,
  onCancel,
  onChange,
  onSubmit,
}: {
  email: string;
  error: string;
  isGenerating: boolean;
  onCancel: () => void;
  onChange: (email: string) => void;
  onSubmit: (email: string) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = Boolean(email.trim()) && !isGenerating;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit(email);
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <form
        aria-label={t("settings.sshKeyEmailDialogTitle")}
        aria-modal="true"
        className="connection-dialog ssh-key-email-dialog"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <p className="panel-label">{t("settings.sectionSsh")}</p>
            <h2>{t("settings.sshKeyEmailDialogTitle")}</h2>
          </div>
        </header>
        <p className="field-hint">{t("settings.sshKeyEmailDialogHint")}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <label>
          <span>{t("settings.sshKeyEmailPrompt")}</span>
          <input
            autoComplete="email"
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder={t("settings.sshKeyEmailPlaceholder")}
            ref={inputRef}
            required
            type="email"
            value={email}
          />
        </label>
        <LegacyDialogActions
          primary={<button className="approve-button" disabled={!canSubmit} type="submit">
            <KeyRound size={15} />
            {isGenerating ? t("settings.sshKeyGenerating") : t("settings.generateSshKey")}
          </button>}
          cancel={<button className="toolbar-button" disabled={isGenerating} onClick={onCancel} type="button">
            {t("common.cancel")}
          </button>}
        />
      </form>
    </div>
  );
}
