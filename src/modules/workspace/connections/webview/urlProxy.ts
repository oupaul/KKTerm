import type { Connection, GeneralSettings, UrlSettings } from "../../../../types";

export type UrlProxyMode = "direct" | "http" | "socks5";

type UrlProxyConnection = Pick<Connection, "urlProxy" | "urlProxyInheritDefaults">;
type UrlDataPartitionConnection = Pick<Connection, "dataPartition" | "urlProxyInheritDefaults">;
type UrlUserAgentConnection = Pick<Connection, "urlUserAgent" | "urlProxyInheritDefaults">;
type GlobalProxySettings = Pick<GeneralSettings, "proxyMode" | "proxyUrl">;

/**
 * The proxy value handed to the URL WebView2 backend. A per-Connection override
 * wins; otherwise the URL Session inherits the global app proxy (Settings →
 * Settings → Proxy). "No Proxy" maps to the `direct://` sentinel the backend
 * interprets as a forced direct connection; "Use system settings" maps to
 * `undefined` so the WebView2 uses the operating system proxy.
 */
export function resolveUrlProxy(
  connection: UrlProxyConnection,
  general: GlobalProxySettings,
): string | undefined {
  if (connection.urlProxyInheritDefaults === false) {
    return connection.urlProxy?.trim() || undefined;
  }
  return globalWebviewProxy(general);
}

/** Translate the global app proxy into a WebView2 proxy value. */
export function globalWebviewProxy(general: GlobalProxySettings): string | undefined {
  switch (general.proxyMode) {
    case "none":
      return "direct://";
    case "manual":
      return general.proxyUrl?.trim() || undefined;
    default:
      return undefined;
  }
}

export function resolveUrlDataPartition(
  connection: UrlDataPartitionConnection,
  settings: UrlSettings,
): string | undefined {
  const value =
    connection.urlProxyInheritDefaults !== false ? settings.defaultDataPartition : connection.dataPartition;
  return value?.trim() || undefined;
}

export function resolveUrlUserAgent(
  connection: UrlUserAgentConnection,
  settings: UrlSettings,
): string | undefined {
  const value = connection.urlProxyInheritDefaults !== false ? settings.defaultUserAgent : connection.urlUserAgent;
  return value?.trim() || undefined;
}

export function parseUrlProxyDraft(mode: UrlProxyMode, host: string, port: string): string | undefined {
  if (mode === "direct") {
    return undefined;
  }

  const normalizedHost = host.trim();
  if (!normalizedHost) {
    throw new Error("Proxy host is required");
  }

  const normalizedPort = Number(port);
  if (!Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65_535) {
    throw new Error("Proxy port must be between 1 and 65535");
  }

  const bracketedHost = normalizedHost.includes(":") && !normalizedHost.startsWith("[")
    ? `[${normalizedHost}]`
    : normalizedHost;
  return `${mode}://${bracketedHost}:${normalizedPort}`;
}

export function splitUrlProxy(value?: string): { mode: UrlProxyMode; host: string; port: string } {
  if (!value?.trim()) {
    return { mode: "direct", host: "", port: "" };
  }

  try {
    const parsed = new URL(value);
    if ((parsed.protocol === "http:" || parsed.protocol === "socks5:") && parsed.hostname && parsed.port) {
      return {
        mode: parsed.protocol === "http:" ? "http" : "socks5",
        host: parsed.hostname.replace(/^\[|\]$/g, ""),
        port: parsed.port,
      };
    }
  } catch {
    // Invalid persisted values are shown as direct and rejected by the backend on save/start.
  }
  return { mode: "direct", host: "", port: "" };
}
