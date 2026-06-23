import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LegacyDialogActions } from "../../app/ui/dialog";
import {
  describeMcpError,
  invokeCommand,
  type McpCreateServerRequest,
  type McpServer,
} from "../../lib/tauri";

interface ParsedConfig {
  name: string;
  url: string;
  headers: Record<string, string>;
  /** The non-stdio config flagged this as unsupported. */
  rejectReason?: string;
}

const SECRET_HEADER_PATTERN = /^(authorization|x-api-key|x-auth-token|api-key)$/i;
const SECRET_VALUE_HINT = /([A-Za-z0-9._-]{20,})/;

interface DetectedSecret {
  headerName: string;
  valueTemplate: string;
  secretValue: string;
}

export function AddMcpServerDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (server: McpServer) => void;
}) {
  const { t } = useTranslation();
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedConfig | null>(null);
  const [detected, setDetected] = useState<DetectedSecret | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stage = useMemo(() => {
    if (!parsed) return "paste" as const;
    if (parsed.rejectReason) return "rejected" as const;
    if (detected) return "secret" as const;
    return "confirm" as const;
  }, [parsed, detected]);

  function handleParse() {
    setParseError(null);
    setSubmitError(null);
    setSecretInput("");
    let value: unknown;
    try {
      value = JSON.parse(jsonText);
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : t("settings.mcpAddInvalidJson"),
      );
      return;
    }
    const result = extractConfig(value);
    if (!result.ok) {
      setParseError(t(result.reason));
      return;
    }
    setParsed(result.config);
    const detection = detectSecretInHeaders(result.config.headers);
    setDetected(detection);
    if (detection) {
      // Pre-fill the input with the actual secret bytes the user pasted, so
      // they can confirm or replace it before we send it to the keychain.
      setSecretInput(detection.secretValue);
    }
  }

  async function handleSubmit() {
    if (!parsed || parsed.rejectReason) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const request = buildCreateRequest(parsed, detected, secretInput);
      const created = await invokeCommand("mcp_create_server", { request });
      onCreated(created);
    } catch (error) {
      setSubmitError(describeMcpError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("settings.mcpAddServer")}
        aria-modal="true"
        className="connection-dialog settings-mcp-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <p className="panel-label">{t("settings.mcpServersTitle")}</p>
            <h2>{t("settings.mcpAddServer")}</h2>
          </div>
        </header>

        {stage === "paste" && (
          <div className="mcp-dialog-body">
            <p className="field-hint">{t("settings.mcpPasteHint")}</p>
            <textarea
              autoFocus
              className="mcp-dialog-textarea"
              onChange={(event) => setJsonText(event.target.value)}
              placeholder={t("settings.mcpPastePlaceholder")}
              rows={10}
              value={jsonText}
            />
            {parseError && <div className="settings-error">{parseError}</div>}
            <LegacyDialogActions
              primary={<button
                className="toolbar-button primary"
                disabled={jsonText.trim().length === 0}
                onClick={handleParse}
                type="button"
              >
                {t("settings.mcpPasteContinue")}
              </button>}
              cancel={<button className="toolbar-button" onClick={onClose} type="button">
                {t("common.cancel")}
              </button>}
            />
          </div>
        )}

        {stage === "rejected" && parsed?.rejectReason && (
          <div className="mcp-dialog-body">
            <div className="settings-error">{t(parsed.rejectReason)}</div>
            <p className="field-hint">{t("settings.mcpStdioGuidance")}</p>
            <div className="dialog-actions">
              <button className="toolbar-button" onClick={onClose} type="button">
                {t("common.close")}
              </button>
            </div>
          </div>
        )}

        {stage === "secret" && parsed && detected && (
          <div className="mcp-dialog-body">
            <p className="field-hint">{t("settings.mcpDetectedSecretHint")}</p>
            <div className="form-grid">
              <label>
                <span>{t("settings.mcpServerName")}</span>
                <input readOnly value={parsed.name} />
              </label>
              <label>
                <span>{t("settings.mcpServerUrl")}</span>
                <input readOnly value={parsed.url} />
              </label>
              <label>
                <span>{t("settings.mcpSecretHeaderName")}</span>
                <input readOnly value={detected.headerName} />
              </label>
              <label>
                <span>{t("settings.mcpSecretValueTemplate")}</span>
                <input readOnly value={detected.valueTemplate} />
              </label>
              <label>
                <span>{t("settings.mcpSecretValue")}</span>
                <input
                  autoFocus
                  onChange={(event) => setSecretInput(event.target.value)}
                  type="password"
                  value={secretInput}
                />
              </label>
            </div>
            {submitError && <div className="settings-error">{submitError}</div>}
            <LegacyDialogActions
              extraLeft={<button
                className="toolbar-button"
                onClick={() => {
                  setParsed(null);
                  setDetected(null);
                }}
                type="button"
              >
                {t("common.back")}
              </button>}
              primary={<button
                className="toolbar-button primary"
                disabled={submitting || secretInput.length === 0}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {t("settings.mcpCreateServer")}
              </button>}
              cancel={<button className="toolbar-button" disabled={submitting} onClick={onClose} type="button">
                {t("common.cancel")}
              </button>}
            />
          </div>
        )}

        {stage === "confirm" && parsed && (
          <div className="mcp-dialog-body">
            <p className="field-hint">{t("settings.mcpConfirmHint")}</p>
            <div className="form-grid">
              <label>
                <span>{t("settings.mcpServerName")}</span>
                <input readOnly value={parsed.name} />
              </label>
              <label>
                <span>{t("settings.mcpServerUrl")}</span>
                <input readOnly value={parsed.url} />
              </label>
            </div>
            {Object.keys(parsed.headers).length > 0 && (
              <div className="mcp-dialog-headers">
                <strong>{t("settings.mcpHeadersLabel")}</strong>
                <ul>
                  {Object.entries(parsed.headers).map(([name, value]) => (
                    <li key={name}>
                      <code>{name}</code>: {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {submitError && <div className="settings-error">{submitError}</div>}
            <LegacyDialogActions
              extraLeft={<button
                className="toolbar-button"
                onClick={() => setParsed(null)}
                type="button"
              >
                {t("common.back")}
              </button>}
              primary={<button
                className="toolbar-button primary"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {t("settings.mcpCreateServer")}
              </button>}
              cancel={<button className="toolbar-button" disabled={submitting} onClick={onClose} type="button">
                {t("common.cancel")}
              </button>}
            />
          </div>
        )}
      </div>
    </div>
  );
}

type ExtractResult = { ok: true; config: ParsedConfig } | { ok: false; reason: string };

function extractConfig(value: unknown): ExtractResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "settings.mcpAddInvalidShape" };
  }
  const wrapper = value as { mcpServers?: Record<string, unknown> };
  if (wrapper.mcpServers && typeof wrapper.mcpServers === "object") {
    const entries = Object.entries(wrapper.mcpServers);
    if (entries.length === 0) {
      return { ok: false, reason: "settings.mcpAddNoServers" };
    }
    const [name, serverConfig] = entries[0];
    return parseServerEntry(name, serverConfig);
  }
  return parseServerEntry("", value);
}

function parseServerEntry(name: string, value: unknown): ExtractResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "settings.mcpAddInvalidShape" };
  }
  const entry = value as {
    url?: unknown;
    command?: unknown;
    headers?: unknown;
    name?: unknown;
  };
  if (entry.command !== undefined) {
    return { ok: false, reason: "settings.mcpAddStdioUnsupported" };
  }
  if (typeof entry.url !== "string" || entry.url.trim().length === 0) {
    return { ok: false, reason: "settings.mcpAddMissingUrl" };
  }
  const headers: Record<string, string> = {};
  if (entry.headers && typeof entry.headers === "object" && !Array.isArray(entry.headers)) {
    for (const [k, v] of Object.entries(entry.headers as Record<string, unknown>)) {
      if (typeof v === "string") headers[k] = v;
    }
  }
  const finalName = (
    typeof entry.name === "string" && entry.name.trim()
      ? entry.name
      : name || deriveNameFromUrl(entry.url)
  ).trim();
  return {
    ok: true,
    config: {
      name: finalName,
      url: entry.url.trim(),
      headers,
    },
  };
}

function deriveNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "mcp-server";
  }
}

function detectSecretInHeaders(
  headers: Record<string, string>,
): DetectedSecret | null {
  for (const [name, value] of Object.entries(headers)) {
    if (!SECRET_HEADER_PATTERN.test(name)) continue;
    const trimmed = value.trim();
    if (trimmed.startsWith("Bearer ")) {
      const token = trimmed.slice("Bearer ".length).trim();
      if (token.length >= 8) {
        return {
          headerName: name,
          valueTemplate: "Bearer {SECRET}",
          secretValue: token,
        };
      }
    }
    const match = trimmed.match(SECRET_VALUE_HINT);
    if (match) {
      const token = match[1];
      const template = trimmed.replace(token, "{SECRET}");
      return {
        headerName: name,
        valueTemplate: template,
        secretValue: token,
      };
    }
  }
  return null;
}

function buildCreateRequest(
  parsed: ParsedConfig,
  detected: DetectedSecret | null,
  secretInput: string,
): McpCreateServerRequest {
  if (!detected) {
    return {
      name: parsed.name,
      url: parsed.url,
      headers: parsed.headers,
    };
  }
  const nonSecretHeaders: Record<string, string> = { ...parsed.headers };
  delete nonSecretHeaders[detected.headerName];
  return {
    name: parsed.name,
    url: parsed.url,
    headers: nonSecretHeaders,
    secretHeaderName: detected.headerName,
    secretValueTemplate: detected.valueTemplate,
    secret: secretInput,
  };
}
