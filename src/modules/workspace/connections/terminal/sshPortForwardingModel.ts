import type { SshPortForwarding } from "../../../../types";

type NormalizedBindAddress = {
  family: "ipv4" | "ipv6" | "name";
  value: string;
  wildcard: boolean;
};

export type LocalTcpListener = {
  address: string;
  port: number;
};

function normalizeBindAddress(value: string): NormalizedBindAddress {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "localhost") {
    return { family: "ipv4", value: "127.0.0.1", wildcard: false };
  }
  if (trimmed.includes(":")) {
    try {
      const hostname = new URL(`http://[${trimmed}]/`).hostname.slice(1, -1);
      return { family: "ipv6", value: hostname, wildcard: hostname === "::" };
    } catch {
      return { family: "name", value: trimmed, wildcard: false };
    }
  }
  if (/^\d+(?:\.\d+){3}$/.test(trimmed)) {
    try {
      const hostname = new URL(`http://${trimmed}/`).hostname;
      return { family: "ipv4", value: hostname, wildcard: hostname === "0.0.0.0" };
    } catch {
      return { family: "name", value: trimmed, wildcard: false };
    }
  }
  return { family: "name", value: trimmed, wildcard: false };
}

function bindAddressesOverlap(left: string, right: string) {
  const normalizedLeft = normalizeBindAddress(left);
  const normalizedRight = normalizeBindAddress(right);
  if (normalizedLeft.family !== normalizedRight.family) {
    return false;
  }
  return normalizedLeft.value === normalizedRight.value || normalizedLeft.wildcard || normalizedRight.wildcard;
}

export function sshForwardBindConflict(
  candidate: SshPortForwarding,
  existing: SshPortForwarding[],
) {
  if (!candidate.enabled) {
    return false;
  }
  if (candidate.mode === "R") {
    return false;
  }
  return existing.some((forwarding) => (
    forwarding.enabled &&
    forwarding.mode !== "R" &&
    forwarding.id !== candidate.id &&
    forwarding.listenPort === candidate.listenPort &&
    bindAddressesOverlap(forwarding.bind, candidate.bind)
  ));
}

export function sshForwardBrowserUrl(bind: string, port: number) {
  const protocol = port === 443 || port === 8443 ? "https" : "http";
  const normalized = bind.trim().toLowerCase();
  const host = normalized === "0.0.0.0"
    ? "127.0.0.1"
    : normalized === "::"
      ? "[::1]"
      : normalized.includes(":") && !normalized.startsWith("[")
        ? `[${normalized}]`
        : normalized || "127.0.0.1";
  return `${protocol}://${host}:${port}`;
}

export function localListenerPortOptions(host: string, listeners: LocalTcpListener[]) {
  const target = normalizeBindAddress(host);
  return [...new Set(listeners.filter((listener) => {
    const bound = normalizeBindAddress(listener.address);
    return target.family === bound.family && (target.value === bound.value || bound.wildcard);
  }).map((listener) => listener.port))]
    .sort((left, right) => left - right)
    .map(String);
}

function forwardingEndpoint(host: string | undefined, port: number | undefined) {
  return `${host?.trim() || "localhost"}:${port ?? ""}`;
}

export function sshForwardDisplayEndpoints(forwarding: SshPortForwarding) {
  if (forwarding.mode === "R") {
    return {
      left: forwardingEndpoint(forwarding.destHost, forwarding.destPort),
      right: forwardingEndpoint(forwarding.bind, forwarding.listenPort),
    };
  }
  return {
    left: forwardingEndpoint(forwarding.bind, forwarding.listenPort),
    right: forwarding.mode === "D"
      ? "SOCKS5"
      : forwardingEndpoint(forwarding.destHost, forwarding.destPort),
  };
}

function browserHost(value: string) {
  const trimmed = value.trim();
  return trimmed.includes(":") && !trimmed.startsWith("[") ? `[${trimmed}]` : trimmed;
}

export function sshRemoteForwardBrowserUrl(bind: string, port: number, connectionHost: string) {
  const normalized = normalizeBindAddress(bind);
  const loopback = normalized.value === "::1" || normalized.value.startsWith("127.");
  if (loopback) {
    return null;
  }
  const host = normalized.wildcard ? connectionHost.trim() : bind.trim();
  if (!host) {
    return null;
  }
  const protocol = port === 443 || port === 8443 ? "https" : "http";
  return `${protocol}://${browserHost(host)}:${port}`;
}
