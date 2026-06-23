import { Globe, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { technicalInputProps } from "../../lib/inputBehavior";
import {
  parseUrlProxyDraft,
  splitUrlProxy,
  type UrlProxyMode,
} from "../workspace/connections/webview/urlProxy";
import { useWorkspaceStore } from "../../store";
import type { UrlCredentialSummary, UrlDataPartitionSummary } from "../../types";
import { CredentialDeleteConfirmDialog } from "./CredentialDeleteConfirmDialog";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

interface UrlCredentialEditDraft {
  username: string;
  password: string;
  usernameSelector: string;
  passwordSelector: string;
  fieldValues: string;
}

function draftFromCredential(credential: UrlCredentialSummary): UrlCredentialEditDraft {
  return {
    username: credential.username,
    password: "",
    usernameSelector: credential.usernameSelector ?? "",
    passwordSelector: credential.passwordSelector ?? "",
    fieldValues: credential.fieldValues ?? "",
  };
}

export function UrlSettings() {
  const { t } = useTranslation();
  const urlSettings = useWorkspaceStore((state) => state.urlSettings);
  const setUrlSettings = useWorkspaceStore((state) => state.setUrlSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState(urlSettings);
  const initialProxy = splitUrlProxy(urlSettings.defaultProxyUrl);
  const [proxyMode, setProxyMode] = useState<UrlProxyMode>(initialProxy.mode);
  const [proxyHost, setProxyHost] = useState(initialProxy.host);
  const [proxyPort, setProxyPort] = useState(initialProxy.port);
  const [credentials, setCredentials] = useState<UrlCredentialSummary[]>([]);
  const [partitions, setPartitions] = useState<UrlDataPartitionSummary[]>([]);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [credentialDraft, setCredentialDraft] = useState<UrlCredentialEditDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UrlCredentialSummary | null>(null);
  let proxyDraftUrl: string | undefined;
  try {
    proxyDraftUrl = parseUrlProxyDraft(proxyMode, proxyHost, proxyPort);
  } catch {
    proxyDraftUrl = `${proxyMode}://${proxyHost.trim()}:${proxyPort.trim()}`;
  }
  const hasChanges =
    JSON.stringify({
      ...draft,
      defaultProxyUrl: proxyDraftUrl || undefined,
      defaultDataPartition: draft.defaultDataPartition?.trim() || undefined,
    }) !==
    JSON.stringify({
      ...urlSettings,
      defaultProxyUrl: urlSettings.defaultProxyUrl || undefined,
      defaultDataPartition: urlSettings.defaultDataPartition?.trim() || undefined,
    });

  useEffect(() => {
    setDraft(urlSettings);
    const proxy = splitUrlProxy(urlSettings.defaultProxyUrl);
    setProxyMode(proxy.mode);
    setProxyHost(proxy.host);
    setProxyPort(proxy.port);
  }, [urlSettings]);

  async function load() {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const [credentialRows, partitionRows] = await Promise.all([
        invokeCommand("list_url_credentials", undefined),
        invokeCommand("list_url_data_partitions", undefined),
      ]);
      setCredentials(credentialRows);
      setPartitions(partitionRows);
      if (editingCredentialId && !credentialRows.some((credential) => credential.secretOwnerId === editingCredentialId)) {
        setEditingCredentialId(null);
        setCredentialDraft(null);
      }
    } catch (loadError) {
      showStatusBarNotice(loadError instanceof Error ? loadError.message : String(loadError), { tone: "error" });
    }
  }

  useEffect(() => {
    // Load once on mount; `load` is recreated each render and must not retrigger the effect.
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    try {
      const request = {
        ...draft,
        defaultProxyUrl: parseUrlProxyDraft(proxyMode, proxyHost, proxyPort),
        defaultDataPartition: draft.defaultDataPartition?.trim() || undefined,
      };
      const saved = isTauriRuntime() ? await invokeCommand("update_url_settings", { request }) : request;
      setUrlSettings(saved);
      setDraft(saved);
      showStatusBarNotice(t("settings.urlSettingsSaved"), { tone: "success" });
    } catch (saveError) {
      showStatusBarNotice(saveError instanceof Error ? saveError.message : String(saveError), { tone: "error" });
    }
  }

  async function deleteCredential(connectionId: string) {
    try {
      await invokeCommand("delete_url_credential", { connectionId });
      showStatusBarNotice(t("settings.urlPasswordDeleted"), { tone: "success" });
      if (editingCredentialId === connectionId) {
        setEditingCredentialId(null);
        setCredentialDraft(null);
      }
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      await load();
    } catch (deleteError) {
      showStatusBarNotice(deleteError instanceof Error ? deleteError.message : String(deleteError), { tone: "error" });
    }
  }

  function beginCredentialEdit(credential: UrlCredentialSummary) {
    setEditingCredentialId(credential.secretOwnerId);
    setCredentialDraft(draftFromCredential(credential));
  }

  function cancelCredentialEdit() {
    setEditingCredentialId(null);
    setCredentialDraft(null);
  }

  function updateCredentialDraft(field: keyof UrlCredentialEditDraft, value: string) {
    setCredentialDraft((currentDraft) => (currentDraft ? { ...currentDraft, [field]: value } : currentDraft));
  }

  async function saveCredentialEdit(secretOwnerId: string) {
    if (!credentialDraft) {
      return;
    }
    const credential = credentials.find((candidate) => candidate.secretOwnerId === secretOwnerId);
    try {
      if (credentialDraft.password) {
        await invokeCommand("store_secret", {
          request: {
            kind: "urlPassword",
            ownerId: secretOwnerId,
            secret: credentialDraft.password,
          },
        });
      }
      await invokeCommand("upsert_url_credential", {
        request: {
          connectionId: credential?.connectionId ?? secretOwnerId,
          username: credentialDraft.username,
          pageUrl: credential?.pageUrl,
          usernameSelector: credentialDraft.usernameSelector || undefined,
          passwordSelector: credentialDraft.passwordSelector || undefined,
          fieldValues: credentialDraft.fieldValues || undefined,
        },
      });
      showStatusBarNotice(t("settings.urlPasswordUpdated"), { tone: "success" });
      setEditingCredentialId(null);
      setCredentialDraft(null);
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      await load();
    } catch (saveError) {
      showStatusBarNotice(saveError instanceof Error ? saveError.message : String(saveError), { tone: "error" });
    }
  }

  async function clearPartition(name: string) {
    try {
      await invokeCommand("clear_url_data_partition", { name });
      showStatusBarNotice(t("settings.urlDataShardCleared", { name }), { tone: "success" });
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      await load();
    } catch (clearError) {
      showStatusBarNotice(clearError instanceof Error ? clearError.message : String(clearError), { tone: "error" });
    }
  }

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<Globe size={18} />}
        label={t("settings.sectionUrl")}
        title={t("settings.urlDefaults")}
      />

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.urlSecurity")}</legend>
        <div>
          <p className="field-hint">{t("settings.urlSecurityHint")}</p>
        </div>
        <div className="settings-toggle-list">
          <label
            className="settings-toggle-row"
            data-tutorial-id="settings.ignoreCertificateErrors"
          >
            <ToggleSwitch
              checked={draft.ignoreCertificateErrors}
              onChange={(checked) =>
                setDraft((settings) => ({ ...settings, ignoreCertificateErrors: checked }))
              }
            />
            <span>
              <strong>{t("settings.ignoreCertificateErrors")}</strong>
              <small>{t("settings.ignoreCertificateErrorsHint")}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.urlProxy")}</legend>
        <div>
          <p className="field-hint">{t("settings.urlProxyHint")}</p>
        </div>
        <div className="form-grid three-columns">
          <label>
            <span>{t("settings.urlProxyMode")}</span>
            <select value={proxyMode} onChange={(event) => setProxyMode(event.currentTarget.value as UrlProxyMode)}>
              <option value="direct">{t("settings.urlProxyDirect")}</option>
              <option value="http">{t("settings.urlProxyHttp")}</option>
              <option value="socks5">{t("settings.urlProxySocks5")}</option>
            </select>
          </label>
          <label>
            <span>{t("settings.urlProxyHost")}</span>
            <input
              {...technicalInputProps}
              disabled={proxyMode === "direct"}
              onChange={(event) => setProxyHost(event.currentTarget.value)}
              placeholder={t("settings.urlProxyHostPlaceholder")}
              required={proxyMode !== "direct"}
              value={proxyHost}
            />
          </label>
          <label>
            <span>{t("settings.urlProxyPort")}</span>
            <input
              {...technicalInputProps}
              disabled={proxyMode === "direct"}
              inputMode="numeric"
              max={65535}
              min={1}
              onChange={(event) => setProxyPort(event.currentTarget.value)}
              placeholder={proxyMode === "socks5" ? "1080" : "3128"}
              required={proxyMode !== "direct"}
              type="number"
              value={proxyPort}
            />
          </label>
        </div>
        <small className="field-hint">{t("settings.urlProxyPlatformHint")}</small>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend data-tutorial-id="settings.urlSavedPasswords">{t("settings.savedWebsitePasswords")}</legend>
        <div>
          <p className="field-hint">{t("settings.savedWebsitePasswordsHint")}</p>
        </div>
        {credentials.length === 0 ? (
          <p className="settings-empty-state">{t("settings.noSavedWebsitePasswords")}</p>
        ) : (
          <div className="settings-list" aria-label={t("settings.savedWebsitePasswords")}>
            {credentials.map((credential) => (
              <div className="settings-list-row" key={credential.secretOwnerId}>
                {editingCredentialId === credential.secretOwnerId && credentialDraft ? (
                  <>
                    <div className="settings-credential-edit">
                      <div className="settings-list-row-heading">
                        <strong>{credential.connectionName}</strong>
                        <span>{credential.pageUrl ?? credential.url ?? t("settings.notSet")}</span>
                      </div>
                      <div className="form-grid two-columns">
                        <label>
                          <span>{t("settings.urlCredentialUsername")}</span>
                          <input
                            autoComplete="username"
                            value={credentialDraft.username}
                            onChange={(event) => updateCredentialDraft("username", event.currentTarget.value)}
                          />
                        </label>
                        <label>
                          <span>{t("settings.urlCredentialPassword")}</span>
                          <input
                            autoComplete="new-password"
                            placeholder={t("settings.urlCredentialPasswordPlaceholder")}
                            type="password"
                            value={credentialDraft.password}
                            onChange={(event) => updateCredentialDraft("password", event.currentTarget.value)}
                          />
                        </label>
                        <label>
                          <span>{t("settings.urlCredentialUsernameSelector")}</span>
                          <input
                            value={credentialDraft.usernameSelector}
                            onChange={(event) => updateCredentialDraft("usernameSelector", event.currentTarget.value)}
                          />
                        </label>
                        <label>
                          <span>{t("settings.urlCredentialPasswordSelector")}</span>
                          <input
                            value={credentialDraft.passwordSelector}
                            onChange={(event) => updateCredentialDraft("passwordSelector", event.currentTarget.value)}
                          />
                        </label>
                      </div>
                      <small>{t("settings.urlPasswordDetails", {
                        username: credential.username,
                        updatedAt: formatDate(credential.updatedAt),
                      })}</small>
                    </div>
                    <div className="settings-list-actions">
                      <button
                        className="secondary-button"
                        disabled={credentialDraft.username.trim().length === 0}
                        type="button"
                        onClick={() => void saveCredentialEdit(credential.secretOwnerId)}
                      >
                        <Save size={15} />
                        {t("common.save")}
                      </button>
                      <button className="secondary-button" type="button" onClick={cancelCredentialEdit}>
                        <X size={15} />
                        {t("common.cancel")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="settings-credential-summary">
                      <strong>{credential.connectionName}</strong>
                      <span>{credential.pageUrl ?? credential.url ?? t("settings.credentialSavedPassword")}</span>
                    </div>
                    <div className="settings-list-actions">
                      <button className="secondary-button" type="button" onClick={() => beginCredentialEdit(credential)}>
                        <Pencil size={15} />
                        {t("common.edit")}
                      </button>
                      <button
                        aria-label={t("settings.deleteCredential")}
                        className="settings-icon-danger-button"
                        type="button"
                        onClick={() => setDeleteTarget(credential)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {deleteTarget ? (
        <CredentialDeleteConfirmDialog
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            const credential = deleteTarget;
            setDeleteTarget(null);
            void deleteCredential(credential.secretOwnerId);
          }}
        />
      ) : null}

      <fieldset className="settings-subsection settings-fieldset">
        <legend data-tutorial-id="settings.urlDataShards">{t("settings.urlDataShards")}</legend>
        <div>
          <p className="field-hint">{t("settings.urlDataShardsHint")}</p>
        </div>
        <div className="form-grid two-columns">
          <label>
            <span>{t("connections.dataPartition")}</span>
            <input
              {...technicalInputProps}
              onChange={(event) =>
                setDraft((settings) => ({ ...settings, defaultDataPartition: event.currentTarget.value }))
              }
              placeholder={t("connections.default")}
              value={draft.defaultDataPartition ?? ""}
            />
          </label>
        </div>
        {partitions.length === 0 ? (
          <p className="settings-empty-state">{t("settings.noUrlDataShards")}</p>
        ) : (
          <div className="settings-list" aria-label={t("settings.urlDataShards")}>
            {partitions.map((partition) => (
              <div className="settings-list-row" key={partition.name}>
                <div>
                  <strong>{partition.name}</strong>
                  <span>
                    {t(
                      partition.connectionCount === 1
                        ? "settings.urlDataShardConnectionCount"
                        : "settings.urlDataShardConnectionCountPlural",
                      { count: partition.connectionCount },
                    )}
                  </span>
                </div>
                <button
                  className="secondary-button danger"
                  type="button"
                  onClick={() => void clearPartition(partition.name)}
                >
                  <Trash2 size={15} />
                  {t("settings.clearShard")}
                </button>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </section>
  );
}
