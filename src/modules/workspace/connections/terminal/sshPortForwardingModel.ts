import type { SshPortForwarding } from "../../../../types";

type NormalizedBindAddress = {
  family: "ipv4" | "ipv6" | "name";
  value: string;
  wildcard: boolean;
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
  return existing.some((forwarding) => (
    forwarding.enabled &&
    forwarding.id !== candidate.id &&
    forwarding.listenPort === candidate.listenPort &&
    bindAddressesOverlap(forwarding.bind, candidate.bind)
  ));
}
