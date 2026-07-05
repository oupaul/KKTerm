// One chat message in the Assistant Panel: bubble, attachments, markdown
// body, work panel, copy/expand actions, image preview, and the inline
// secret-entry cards (which store secrets locally without exposing them to
// the model). Extracted verbatim from AssistantPanel.tsx.
import { Copy, Eye, EyeOff, FileImage, KeyRound, LoaderCircle, X } from "../lib/reicon";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import i18next from "../i18n/config";
import { dialogButtonAria } from "../lib/aria";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import { useDashboardStore } from "../modules/dashboard/state/dashboardStore";
import {
  assistantSecretStorageBackendKey,
  parseAssistantSecretRequests,
  secretRequestStorageNotice,
  type AssistantSecretRequest,
} from "./secretRequest";
import { MarkdownContent } from "./AssistantMarkdownContent";
import { AssistantWorkPanel } from "./AssistantWorkPanel";
import { assistantIntentLabel, formatAssistantMessageTime } from "./assistantComposer";
import type { AssistantChatMessage, AssistantImageAttachment } from "./assistantTypes";

export function AssistantMessageView({
  message,
  onCopyCode,
  onCopyMessage,
  onOpenLink,
  onSecretStored,
  onSendCode,
}: {
  message: AssistantChatMessage;
  onCopyCode: (code: string) => void;
  onCopyMessage: (message: AssistantChatMessage) => void;
  onOpenLink: (url: string) => void;
  onSecretStored: (request: AssistantSecretRequest) => void;
  onSendCode: (code: string) => void;
}) {
  const { t } = useTranslation();
  const userMessageLineCount = message.role === "user" ? message.content.split(/\r?\n/).length : 0;
  const shouldTruncateUserMessage = message.role === "user" && userMessageLineCount > 10;
  const canSendCode = message.intent !== "extensionCreation";
  const [isUserMessageExpanded, setIsUserMessageExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<AssistantImageAttachment | null>(null);
  const secretRequestContent = useMemo(
    () => parseAssistantSecretRequests(message.content),
    [message.content],
  );

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    function handlePreviewKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    }

    window.addEventListener("keydown", handlePreviewKeyDown);
    return () => window.removeEventListener("keydown", handlePreviewKeyDown);
  }, [previewImage]);

  return (
    <article className={`assistant-message ${message.role}`}>
      <div className="assistant-message-content">
        <div
          className={`assistant-message-bubble${shouldTruncateUserMessage && !isUserMessageExpanded ? " assistant-message-bubble-truncated" : ""}`}
        >
          {message.role === "user" && message.intent && message.intent !== "chat" ? (
            <span className="assistant-message-intent-label" data-intent={message.intent}>
              {assistantIntentLabel(message.intent, t)}
            </span>
          ) : null}
          {message.textAttachments?.length ? (
            <div className="assistant-message-text-attachments">
              {message.textAttachments.map((attachment) => (
                <figure className="assistant-message-text-attachment" key={attachment.id}>
                  <figcaption>{attachment.sourceLabel}</figcaption>
                  <pre>
                    <code>{attachment.text}</code>
                  </pre>
                </figure>
              ))}
            </div>
          ) : null}
          {message.imageAttachments?.length ? (
            <div className="assistant-message-attachments">
              {message.imageAttachments.map((image) => (
                <figure className="assistant-message-attachment" key={image.id}>
                  <button
                    {...dialogButtonAria(previewImage?.id === image.id)}
                    aria-label={t("ai.openImagePreview", { label: image.sourceLabel })}
                    className="assistant-message-attachment-button"
                    onClick={() => setPreviewImage(image)}
                    title={t("ai.openImagePreview", { label: image.sourceLabel })}
                    type="button"
                  >
                    <img alt={image.sourceLabel} src={image.imageDataUrl} />
                  </button>
                  <figcaption>
                    {image.sourceLabel} · {image.width} x {image.height}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
          {message.fileAttachments?.length ? (
            <div className="assistant-message-file-attachments">
              {message.fileAttachments.map((file) => (
                <div className="assistant-message-file-attachment" key={file.id}>
                  <FileImage size={13} />
                  <span>{file.sourceLabel}</span>
                  <small>{formatBytes(file.size)}</small>
                </div>
              ))}
            </div>
          ) : null}
          {message.role === "assistant" ? <AssistantWorkPanel message={message} /> : null}
          <MarkdownContent
            canSendCode={canSendCode}
            content={secretRequestContent.markdown}
            onCopyCode={onCopyCode}
            onOpenLink={onOpenLink}
            onSendCode={onSendCode}
          />
          {message.role === "assistant" && secretRequestContent.requests.length > 0 ? (
            <div className="assistant-secret-card-stack">
              {secretRequestContent.requests.map((request) => (
                <AssistantSecretEntryCard
                  key={secretRequestStorageNotice(request)}
                  request={request}
                  onStored={onSecretStored}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="assistant-message-actions">
          <time dateTime={message.createdAt}>{formatAssistantMessageTime(message.createdAt)}</time>
          <button
            aria-label={t("ai.copyMessage")}
            onClick={() => onCopyMessage(message)}
            title={t("ai.copyMessage")}
            type="button"
          >
            <Copy size={10} />
          </button>
        </div>
      </div>
      {shouldTruncateUserMessage ? (
        <button
          className="assistant-message-expand"
          onClick={() => setIsUserMessageExpanded((expanded) => !expanded)}
          type="button"
        >
          {isUserMessageExpanded ? t("ai.showLess") : t("ai.more")}
        </button>
      ) : null}
      {previewImage
        ? createPortal(
            <div
              className="assistant-image-preview-backdrop"
              onClick={() => setPreviewImage(null)}
              role="presentation"
            >
              <div
                aria-label={t("ai.imagePreviewTitle", { label: previewImage.sourceLabel })}
                className="assistant-image-preview-dialog"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <header>
                  <div>
                    <strong>{previewImage.sourceLabel}</strong>
                    <small>
                      {previewImage.width} x {previewImage.height}
                    </small>
                  </div>
                  <button
                    aria-label={t("ai.close")}
                    className="assistant-toolbar-button"
                    onClick={() => setPreviewImage(null)}
                    title={t("ai.close")}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </header>
                <img alt={previewImage.sourceLabel} src={previewImage.imageDataUrl} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}

function AssistantSecretEntryCard({
  onStored,
  request,
}: {
  onStored: (request: AssistantSecretRequest) => void;
  request: AssistantSecretRequest;
}) {
  const { t } = useTranslation();
  const setAiProviderHasApiKey = useWorkspaceStore((state) => state.setAiProviderHasApiKey);
  const credentialSecretStore = useWorkspaceStore(
    (state) => state.credentialSettings.secretStore,
  );
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState(false);
  const [error, setError] = useState("");
  const canSave = secret.trim().length > 0 && !saving && !stored;
  const storageBackend = t(assistantSecretStorageBackendKey(credentialSecretStore));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await storeAssistantSecretRequest(request, secret.trim());
      setSecret("");
      setStored(true);
      if (request.kind === "aiApiKey") {
        setAiProviderHasApiKey(true);
      }
      if (request.kind === "widgetSecret") {
        await useDashboardStore.getState().load();
      }
      showStatusBarNotice(
        t("ai.secretCardStoredStatus", {
          backend: storageBackend,
          label: request.label,
        }),
        { tone: "success" },
      );
      onStored(request);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="assistant-secret-card" onSubmit={(event) => void handleSubmit(event)}>
      <header>
        <KeyRound size={15} />
        <div>
          <strong>{request.label}</strong>
          <small>
            {request.description ??
              t("ai.secretCardDefaultDescription", { backend: storageBackend })}
          </small>
        </div>
      </header>
      <p>{t("ai.secretCardPrivacy")}</p>
      <label>
        <span>{t("ai.secretCardInputLabel")}</span>
        <div className="assistant-secret-input-row">
          <input
            autoComplete="off"
            disabled={saving || stored}
            onChange={(event) => setSecret(event.currentTarget.value)}
            placeholder={request.placeholder ?? t("ai.secretCardPlaceholder")}
            type={showSecret ? "text" : "password"}
            value={secret}
          />
          <button
            aria-label={showSecret ? t("ai.secretCardHide") : t("ai.secretCardShow")}
            className="assistant-secret-icon-button"
            disabled={saving || stored}
            onClick={() => setShowSecret((show) => !show)}
            title={showSecret ? t("ai.secretCardHide") : t("ai.secretCardShow")}
            type="button"
          >
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>
      <footer>
        <span aria-live="polite">
          {stored ? t("ai.secretCardStoredInline", { backend: storageBackend }) : error}
        </span>
        <button className="toolbar-button" disabled={!canSave} type="submit">
          {saving ? <LoaderCircle size={14} /> : <KeyRound size={14} />}
          {stored ? t("ai.secretCardSaved") : t("ai.secretCardSave")}
        </button>
      </footer>
    </form>
  );
}

async function storeAssistantSecretRequest(
  request: AssistantSecretRequest,
  secret: string,
) {
  if (!isTauriRuntime()) {
    throw new Error(i18next.t("ai.secretCardRuntimeRequired"));
  }

  if (request.kind === "widgetSecret") {
    await storeWidgetSecretRequest(request, secret);
    return;
  }

  await invokeCommand("store_secret", {
    request: {
      kind: request.kind,
      ownerId: request.ownerId,
      secret,
    },
  });
}

async function storeWidgetSecretRequest(
  request: AssistantSecretRequest,
  secret: string,
) {
  if (!request.instanceId || !request.fieldKey) {
    throw new Error(i18next.t("ai.secretCardInvalidWidgetRequest"));
  }

  const state = await invokeCommand("dashboard_load_state", undefined);
  const instance = state.instances.find((item) => item.id === request.instanceId);
  if (!instance) {
    throw new Error(i18next.t("ai.secretCardMissingWidget"));
  }

  const currentValues = parseObjectJson(instance.settingsValuesJson);
  const nextValues = {
    ...currentValues,
    [request.fieldKey]: {
      type: "secretRef",
      ownerId: request.ownerId,
      hasSecret: true,
      updatedAt: new Date().toISOString(),
    },
  };

  await invokeCommand("store_secret", {
    request: {
      kind: request.kind,
      ownerId: request.ownerId,
      secret,
    },
  });

  try {
    await invokeCommand("dashboard_update_instance", {
      id: request.instanceId,
      patch: { settingsValuesJson: JSON.stringify(nextValues) },
    });
  } catch (error) {
    await invokeCommand("delete_secret", {
      request: {
        kind: request.kind,
        ownerId: request.ownerId,
      },
    }).catch(() => undefined);
    throw error;
  }
}

function parseObjectJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
