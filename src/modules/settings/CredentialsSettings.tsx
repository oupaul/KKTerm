import { KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AI_PROVIDER_SECRET_OWNER_ID,
  aiProviderSecretOwnerId,
} from "../../lib/settings";
import { recordEncryptedStoreUnlockAt } from "../../lib/encryptedStoreLaunchPromptPolicy";
import { currentPlatform } from "../../lib/platform";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type {
  KeychainStatus,
  EncryptedStoreLaunchPromptPolicy,
  SecretStoreKind,
  StoredCredentialKind,
  StoredCredentialSummary,
} from "../../types";
import { CredentialDeleteConfirmDialog } from "./CredentialDeleteConfirmDialog";
import { EncryptedSecretStoreDialog } from "./EncryptedSecretStoreDialog";
import {
  credentialStorageSelectionAction,
  encryptedDatabaseSecurityReminderKey,
  encryptedSecretStoreInitialMode,
  normalizeAvailableSecretStores,
  normalizeSecretStoreKind,
} from "./credentialStorageModel";
import { groupCredentialsByKind, groupCredentialsForSettings } from "./credentialGroups";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";

function credentialKindKey(kind: StoredCredentialKind) {
  switch (kind) {
    case "connectionPassword":
      return "settings.credentialKindConnectionPassword";
    case "urlPassword":
      return "settings.credentialKindUrlPassword";
    case "aiApiKey":
      return "settings.credentialKindAiApiKey";
    case "emailApiKey":
      return "settings.credentialKindEmailApiKey";
    case "emailSmtpPassword":
      return "settings.credentialKindEmailSmtpPassword";
    case "widgetSecret":
      return "settings.credentialKindWidgetSecret";
    default:
      return "settings.credentialKindConnectionPassword";
  }
}

function credentialDescriptionKey(credential: StoredCredentialSummary) {
  if (!credential.exists) {
    return "settings.credentialMissingSecret";
  }
  switch (credential.kind) {
    case "aiApiKey":
    case "emailApiKey":
      return "settings.credentialSavedApiKey";
    case "emailSmtpPassword":
      return "settings.credentialSavedPassword";
    case "widgetSecret":
      return "settings.credentialSavedSecret";
    case "connectionPassword":
    case "urlPassword":
      return "settings.credentialSavedPassword";
    default:
      return "settings.credentialSavedPassword";
  }
}

export function CredentialsSettings() {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const credentialSettings = useWorkspaceStore((state) => state.credentialSettings);
  const setCredentialSettings = useWorkspaceStore((state) => state.setCredentialSettings);
  const aiProviderSettings = useWorkspaceStore((state) => state.aiProviderSettings);
  const setAiProviderHasApiKey = useWorkspaceStore((state) => state.setAiProviderHasApiKey);
  const [credentials, setCredentials] = useState<StoredCredentialSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StoredCredentialSummary | null>(null);
  const [draft, setDraft] = useState(credentialSettings);
  const [secretStatus, setSecretStatus] = useState<KeychainStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [encryptedStoreDialogOpen, setEncryptedStoreDialogOpen] = useState(false);
  const [encryptedStoreBusy, setEncryptedStoreBusy] = useState(false);
  const [encryptedStoreError, setEncryptedStoreError] = useState<string | null>(null);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(credentialSettings);

  const { storedCredentials, widgetCredentials } = useMemo(
    () => groupCredentialsForSettings(credentials),
    [credentials],
  );
  const storedCredentialGroups = useMemo(
    () => groupCredentialsByKind(storedCredentials),
    [storedCredentials],
  );
  const selectedSecretStore = normalizeSecretStoreKind(draft.secretStore);
  const platform = currentPlatform();
  const securityReminderKey = encryptedDatabaseSecurityReminderKey({
    platform,
    selectedStore: selectedSecretStore,
  });
  const availableSecretStores = useMemo(
    () => normalizeAvailableSecretStores(secretStatus?.availableStores, selectedSecretStore),
    [secretStatus?.availableStores, selectedSecretStore],
  );

  async function load() {
    if (!isTauriRuntime()) {
      setCredentials([]);
      return;
    }
    setLoading(true);
    try {
      const nextStatus = await invokeCommand("keychain_status", undefined);
      setSecretStatus(nextStatus);
      try {
        const nextCredentials = await invokeCommand("list_stored_credentials", undefined);
        setCredentials(nextCredentials);
      } catch (error) {
        setCredentials([]);
        showStatusBarNotice(error instanceof Error ? error.message : String(error), {
          tone: "error",
        });
      }
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setDraft(credentialSettings);
  }, [credentialSettings]);

  async function handleSave() {
    try {
      const saved = isTauriRuntime()
        ? await invokeCommand("update_credential_settings", { request: draft })
        : draft;
      setCredentialSettings(saved);
      setDraft(saved);
      showStatusBarNotice(t("settings.credentialStorageSaved"), { tone: "success" });
      await load();
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
  }

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  async function configureEncryptedStore(request: {
    password: string;
    createIfMissing: boolean;
    resetExisting?: boolean;
  }) {
    try {
      setEncryptedStoreBusy(true);
      setEncryptedStoreError(null);
      const result = isTauriRuntime()
        ? await invokeCommand("configure_encrypted_file_secret_store", { request })
        : {
            settings: {
              encryptedStoreLaunchPrompt: draft.encryptedStoreLaunchPrompt,
              secretStore: "file" as const,
            },
            status: {
              available: true,
              service: "com.kkterm.app",
              backend: t("settings.credentialStorageFile"),
              selectedStore: "file" as const,
              availableStores: ["os" as const, "file" as const],
              encryptedStoreExists: true,
            },
          };
      recordEncryptedStoreUnlockAt();
      setCredentialSettings(result.settings);
      setDraft(result.settings);
      setSecretStatus(result.status);
      setEncryptedStoreDialogOpen(false);
      showStatusBarNotice(t("settings.encryptedSecretStoreConfigured"), { tone: "success" });
      await load();
    } catch (error) {
      setEncryptedStoreError(error instanceof Error ? error.message : String(error));
    } finally {
      setEncryptedStoreBusy(false);
    }
  }

  function closeEncryptedStoreDialog() {
    setEncryptedStoreDialogOpen(false);
    setEncryptedStoreError(null);
  }

  function openEncryptedStoreDialog() {
    setEncryptedStoreError(null);
    setEncryptedStoreDialogOpen(true);
  }

  async function deleteCredential(credential: StoredCredentialSummary) {
    try {
      await invokeCommand("delete_stored_credential", {
        request: {
          kind: credential.kind,
          ownerId: credential.ownerId,
        },
      });
      if (credential.kind === "aiApiKey") {
        const [providerPresence, legacyPresence] = await Promise.all([
          invokeCommand("secret_exists", {
            request: {
              kind: "aiApiKey",
              ownerId: aiProviderSecretOwnerId(aiProviderSettings.providerKind),
            },
          }),
          invokeCommand("secret_exists", {
            request: {
              kind: "aiApiKey",
              ownerId: AI_PROVIDER_SECRET_OWNER_ID,
            },
          }),
        ]);
        setAiProviderHasApiKey(providerPresence.exists || legacyPresence.exists);
      }
      if (credential.kind === "urlPassword" || credential.kind === "connectionPassword") {
        window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      }
      showStatusBarNotice(t("settings.credentialDeleted"), { tone: "success" });
      await load();
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
  }

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        actions={
          <button className="toolbar-button" disabled={loading} onClick={() => void load()} type="button">
            <RefreshCw size={15} />
            {t("common.refresh")}
          </button>
        }
        icon={<KeyRound size={18} />}
        label={t("settings.sectionCredentials")}
        title={t("settings.credentialsTitle")}
      />

      <fieldset
        className="settings-subsection settings-fieldset"
        data-tutorial-id="settings.credentialStorage"
      >
        <legend>{t("settings.credentialStorage")}</legend>
        <p className="field-hint">{t("settings.credentialStorageHint")}</p>
        <div className="form-grid">
          <label>
            <span>{t("settings.credentialStorageBackend")}</span>
            <select
              disabled={availableSecretStores.length <= 1}
              onChange={(event) => {
                const secretStore = normalizeSecretStoreKind(event.currentTarget.value);
                if (
                  credentialStorageSelectionAction({
                    currentStore: normalizeSecretStoreKind(credentialSettings.secretStore),
                    nextStore: secretStore,
                    secretStatus,
                  }) === "setup-file"
                ) {
                  openEncryptedStoreDialog();
                  return;
                }
                setDraft((settings) => ({
                  ...settings,
                  secretStore,
                }));
              }}
              value={selectedSecretStore}
            >
              {availableSecretStores.map((store) => (
                <option key={store} value={store}>
                  {t(secretStoreLabelKey(store))}
                </option>
              ))}
            </select>
            <small className="field-hint">
              {secretStatus?.available
                ? t("settings.credentialStorageActive", { backend: secretStatus.backend })
                : t("settings.credentialStorageUnavailable", {
                    error: secretStatus?.backend ?? t("settings.credentialStorageUnknownStatus"),
                  })}
            </small>
          </label>
          {selectedSecretStore === "file" && !secretStatus?.available ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => openEncryptedStoreDialog()}
            >
              {t("settings.encryptedSecretStoreSetupAction")}
            </button>
          ) : null}
          {selectedSecretStore === "file" ? (
            <label>
              <span>{t("settings.encryptedStoreLaunchPrompt")}</span>
              <select
                onChange={(event) =>
                  setDraft((settings) => ({
                    ...settings,
                    encryptedStoreLaunchPrompt: event.currentTarget
                      .value as EncryptedStoreLaunchPromptPolicy,
                  }))
                }
                value={draft.encryptedStoreLaunchPrompt}
              >
                <option value="everyTime">
                  {t("settings.encryptedStoreLaunchPromptEveryTime")}
                </option>
                <option value="oneHour">
                  {t("settings.encryptedStoreLaunchPromptOneHour")}
                </option>
                <option value="fourHours">
                  {t("settings.encryptedStoreLaunchPromptFourHours")}
                </option>
                <option value="twentyFourHours">
                  {t("settings.encryptedStoreLaunchPromptTwentyFourHours")}
                </option>
                <option value="never">
                  {t("settings.encryptedStoreLaunchPromptNever")}
                </option>
              </select>
              <small className="field-hint">
                {t("settings.encryptedStoreLaunchPromptHint")}
              </small>
            </label>
          ) : null}
        </div>
        <p className="field-hint settings-security-note">{t(securityReminderKey)}</p>
        <p className="field-hint">{t("settings.credentialStorageSwitchNote")}</p>
      </fieldset>

      <fieldset
        className="settings-subsection settings-fieldset"
        data-tutorial-id="settings.credentialsStored"
      >
        <legend>{t("settings.credentialsStored")}</legend>
        <p className="field-hint">{t("settings.credentialsHint")}</p>
        {storedCredentials.length === 0 ? (
          <p className="settings-empty-state">
            {loading ? t("common.loading") : t("settings.credentialsEmpty")}
          </p>
        ) : (
          <div className="settings-list" aria-label={t("settings.credentialsStored")}>
            {storedCredentialGroups.map(({ kind, rows }) => (
              <div className="settings-credential-group" key={kind}>
                <h3>{t(credentialKindKey(kind))}</h3>
                {rows.map((credential) => (
                  <CredentialRow
                    credential={credential}
                    key={credential.id}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset
        className="settings-subsection settings-fieldset"
        data-tutorial-id="settings.widgetCredentialsStored"
      >
        <legend>{t("settings.widgetCredentialsStored")}</legend>
        <p className="field-hint">{t("settings.widgetCredentialsHint")}</p>
        {widgetCredentials.length === 0 ? (
          <p className="settings-empty-state">
            {loading ? t("common.loading") : t("settings.widgetCredentialsEmpty")}
          </p>
        ) : (
          <div className="settings-list" aria-label={t("settings.widgetCredentialsStored")}>
            {widgetCredentials.map((credential) => (
              <CredentialRow
                credential={credential}
                key={credential.id}
                onDelete={setDeleteTarget}
              />
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
            void deleteCredential(credential);
          }}
        />
      ) : null}
      {encryptedStoreDialogOpen ? (
        <EncryptedSecretStoreDialog
          busy={encryptedStoreBusy}
          encryptedStoreExists={secretStatus?.encryptedStoreExists}
          error={encryptedStoreError}
          initialMode={encryptedSecretStoreInitialMode({
            encryptedStoreExists: secretStatus?.encryptedStoreExists,
          })}
          launchPrompt={false}
          platform={platform}
          onCancel={closeEncryptedStoreDialog}
          onSubmit={configureEncryptedStore}
        />
      ) : null}
    </section>
  );
}

function secretStoreLabelKey(store: SecretStoreKind) {
  switch (store) {
    case "file":
      return "settings.credentialStorageFile";
    case "os":
    default:
      return "settings.credentialStorageOs";
  }
}

function CredentialRow({
  credential,
  onDelete,
}: {
  credential: StoredCredentialSummary;
  onDelete: (credential: StoredCredentialSummary) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="settings-list-row">
      <div className="settings-credential-summary">
        <strong>{credential.label}</strong>
        <span>
          {credential.detail
            ? `${credential.detail} - ${t(credentialDescriptionKey(credential))}`
            : t(credentialDescriptionKey(credential))}
        </span>
      </div>
      <button
        aria-label={t("settings.deleteCredential")}
        className="settings-icon-danger-button"
        type="button"
        onClick={() => void onDelete(credential)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
