import type { Connection, UrlSettings } from "../../../../types";

export type UrlProxyMode = "direct" | "http" | "socks5";

type UrlProxyConnection = Pick<Connection, "urlProxy" | "urlProxyInheritDefaults">;

export function resolveUrlProxy(connection: UrlProxyConnection, settings: UrlSettings): string | undefined {
  const value = connection.urlProxyInheritDefaults !== false ? settings.defaultProxyUrl : connection.urlProxy;
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
