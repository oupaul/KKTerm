// Pure IPv4 subnet math for the Subnet Calculator widget. No DOM, no deps.

export interface SubnetInfo {
  /** "cidr" when parsed from a CIDR/mask, "range" when derived from an IP range. */
  kind: "cidr" | "range";
  prefix: number;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  netmask: string;
  wildcard: string;
  usableHosts: number;
  /** Network address as unsigned 32-bit int, for the bit visualization. */
  networkU32: number;
}

export function parseIPv4(text: string): number | null {
  const parts = text.trim().split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = ((value << 8) | octet) >>> 0;
  }
  return value;
}

export function formatIPv4(value: number): string {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join(".");
}

function maskForPrefix(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/** Returns the prefix length if the value is a contiguous netmask, else null. */
function prefixFromMask(mask: number): number | null {
  for (let prefix = 0; prefix <= 32; prefix++) {
    if (maskForPrefix(prefix) === mask) return prefix;
  }
  return null;
}

function buildInfo(kind: SubnetInfo["kind"], ip: number, prefix: number): SubnetInfo {
  const mask = maskForPrefix(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  let firstHost = network;
  let lastHost = broadcast;
  let usableHosts: number;
  if (prefix >= 32) {
    usableHosts = 1;
  } else if (prefix === 31) {
    usableHosts = 2;
  } else {
    firstHost = (network + 1) >>> 0;
    lastHost = (broadcast - 1) >>> 0;
    usableHosts = 2 ** (32 - prefix) - 2;
  }
  return {
    kind,
    prefix,
    network: formatIPv4(network),
    broadcast: formatIPv4(broadcast),
    firstHost: formatIPv4(firstHost),
    lastHost: formatIPv4(lastHost),
    netmask: formatIPv4(mask),
    wildcard: formatIPv4(~mask >>> 0),
    usableHosts,
    networkU32: network,
  };
}

/** Smallest single CIDR block that covers both addresses (inclusive). */
export function smallestCoveringCidr(a: number, b: number): { ip: number; prefix: number } {
  const low = Math.min(a >>> 0, b >>> 0);
  const high = Math.max(a >>> 0, b >>> 0);
  let prefix = 32;
  while (prefix > 0) {
    const mask = maskForPrefix(prefix);
    if (((low & mask) >>> 0) === ((high & mask) >>> 0)) break;
    prefix--;
  }
  return { ip: low, prefix };
}

/**
 * Parses a subnet query. Accepted forms:
 *   "192.168.1.0/24"            CIDR
 *   "192.168.1.0/255.255.255.0" IP with dotted mask after the slash
 *   "192.168.1.0 255.255.255.0" IP and dotted mask separated by spaces
 *   "10.0.0.5 - 10.0.0.200"     range -> smallest covering CIDR
 * Returns null while the input is incomplete or invalid.
 */
export function parseSubnetQuery(input: string): SubnetInfo | null {
  const text = input.trim();
  if (!text) return null;

  if (text.includes("-")) {
    const [left, right] = text.split("-", 2).map((part) => part.trim());
    const a = left ? parseIPv4(left) : null;
    const b = right ? parseIPv4(right) : null;
    if (a === null || b === null) return null;
    const { ip, prefix } = smallestCoveringCidr(a, b);
    return buildInfo("range", ip, prefix);
  }

  let ipText: string;
  let suffix: string;
  if (text.includes("/")) {
    const [left, right] = text.split("/", 2);
    ipText = left.trim();
    suffix = (right ?? "").trim();
  } else {
    const parts = text.split(/\s+/);
    if (parts.length !== 2) return null;
    [ipText, suffix] = parts as [string, string];
  }

  const ip = parseIPv4(ipText);
  if (ip === null || !suffix) return null;

  if (/^\d{1,2}$/.test(suffix)) {
    const prefix = Number(suffix);
    if (prefix > 32) return null;
    return buildInfo("cidr", ip, prefix);
  }

  const mask = parseIPv4(suffix);
  if (mask === null) return null;
  const prefix = prefixFromMask(mask);
  if (prefix === null) return null;
  return buildInfo("cidr", ip, prefix);
}
