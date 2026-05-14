import { KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import type { StoredCredentialKind, StoredCredentialSummary } from "../types";
import { groupCredentialsByKind, groupCredentialsForSettings } from "./credentialGroups";
import { SettingsSectionHeader } from "./shared";

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function credentialKindKey(kind: StoredCredentialKind) {
  switch (kind) {
    case "connectionPassword":
      return "settings.credentialKindConnectionPassword";
    case "urlPassword":
      return "settings.credentialKindUrlPassword";
    case "aiApiKey":
      return "settings.credentialKindAiApiKey";
    case "widgetSecret":
      return "settings.credentialKindWidgetSecret";
    default:
      return "settings.credentialKindConnectionPassword";
  }
}

export function CredentialsSettings() {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const setAiProviderHasApiKey = useWorkspaceStore((state) => state.setAiProviderHasApiKey);
  const [credentials, setCredentials] = useState<StoredCredentialSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const { storedCredentials, widgetCredentials } = useMemo(
    () => groupCredentialsForSettings(credentials),
    [credentials],
  );
  const storedCredentialGroups = useMemo(
    () => groupCredentialsByKind(storedCredentials),
    [storedCredentials],
  );

  async function load() {
    if (!isTauriRuntime()) {
      setCredentials([]);
      return;
    }
    setLoading(true);
    try {
      setCredentials(await invokeCommand("list_stored_credentials", undefined));
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function deleteCredential(credential: StoredCredentialSummary) {
    try {
      await invokeCommand("delete_stored_credential", {
        request: {
          kind: credential.kind,
          ownerId: credential.ownerId,
        },
      });
      if (credential.kind === "aiApiKey") {
        setAiProviderHasApiKey(false);
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

      <fieldset className="settings-subsection settings-fieldset">
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
                    onDelete={deleteCredential}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
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
                onDelete={deleteCredential}
              />
            ))}
          </div>
        )}
      </fieldset>
    </section>
  );
}

function CredentialRow({
  credential,
  onDelete,
}: {
  credential: StoredCredentialSummary;
  onDelete: (credential: StoredCredentialSummary) => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <div className="settings-list-row">
      <div>
        <strong>{credential.label}</strong>
        {credential.detail ? <span>{credential.detail}</span> : null}
        <small>
          {[
            credential.username
              ? t("settings.credentialUsername", { username: credential.username })
              : null,
            credential.updatedAt
              ? t("settings.credentialUpdated", { updatedAt: formatDate(credential.updatedAt) })
              : null,
            credential.exists
              ? t("settings.credentialStored")
              : t("settings.credentialMissingSecret"),
          ].filter(Boolean).join(" · ")}
        </small>
      </div>
      <button
        className="secondary-button danger"
        type="button"
        onClick={() => void onDelete(credential)}
      >
        <Trash2 size={15} />
        {t("common.delete")}
      </button>
    </div>
  );
}
