import type {
  RackItem,
  RackItemMetadata,
  RackNetworkPort,
  RackPortSpeed,
  RackSnmpHint,
} from "../../types";

export type NormalizedRackItemMetadata = Omit<
  RackItemMetadata,
  "networkPorts" | "snmp"
> & {
  networkPorts?: RackNetworkPort[] | null;
  snmp?: RackSnmpHint | null;
};

function compact(values: (string | null | undefined)[]): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => !!value);
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeVendor(value: string | null | undefined): string | null {
  const trimmed = trimOrNull(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

export function normalizeConnectionIds(value: RackItemMetadata["connectionIds"]): string[] | null {
  const deduped = [...new Set(compact(Array.isArray(value) ? value : []))];
  return deduped.length > 0 ? deduped : null;
}

function normalizePortSpeed(value: string | null | undefined): RackPortSpeed {
  const speed = value?.trim().toLowerCase();
  if (speed === "10g") return "10g";
  if (speed === "25g") return "25g";
  if (speed === "40g") return "40g";
  if (speed === "100g") return "100g";
  if (speed === "gigabit" || speed === "1g") return "gigabit";
  return "custom";
}

export function normalizeNetworkPorts(value: RackItemMetadata["networkPorts"]): RackNetworkPort[] | null {
  if (!Array.isArray(value)) return null;
  const ports = value.flatMap((entry, index) => {
    if (typeof entry !== "string") {
      const name = trimOrNull(entry?.name);
      return name ? [{ ...entry, name, speed: normalizePortSpeed(entry.speed) }] : [];
    }
    const [nameRaw, speedRaw] = entry.split(":");
    const name = trimOrNull(nameRaw) ?? `${index + 1}`;
    return [{ name, speed: normalizePortSpeed(speedRaw ?? nameRaw) }];
  });
  return ports.length > 0 ? ports : null;
}

export function normalizeSnmpHint(value: RackItemMetadata["snmp"]): RackSnmpHint | null {
  if (!value) return null;
  if (typeof value !== "string") {
    const target = trimOrNull(value.target);
    return target ? { ...value, target } : null;
  }
  const raw = value.trim();
  if (!raw) return null;
  const [, targetAndOid = raw] = raw.split("@");
  const [target, ...oidParts] = targetAndOid.split(":");
  const normalizedTarget = trimOrNull(target);
  if (!normalizedTarget) return null;
  return { target: normalizedTarget, oid: trimOrNull(oidParts.join(":")) };
}

export function normalizeRackItemMetadata(metadata: RackItemMetadata): NormalizedRackItemMetadata {
  return {
    ...metadata,
    tags: compact(metadata.tags ?? []),
    connectionIds: normalizeConnectionIds(metadata.connectionIds),
    networkPorts: normalizeNetworkPorts(metadata.networkPorts),
    snmp: normalizeSnmpHint(metadata.snmp),
    vendor: normalizeVendor(metadata.vendor),
  };
}

export function summarizeRackDeviceMetadata(metadata: RackItemMetadata): string[] {
  const port = normalizeNetworkPorts(metadata.networkPorts)?.[0];
  return compact([
    port ? `${port.name} ${port.speed.toUpperCase()} ${port.state ?? "unknown"}` : null,
    ...(metadata.tags ?? []).slice(0, 2),
  ]).slice(0, 3);
}

export interface RackInventoryCallout {
  itemId: string;
  label: string;
  text: string | null;
  connectionIds: string[];
}

export function selectRandomRackCallouts(items: RackItem[], seed: string, limit: number): RackInventoryCallout[] {
  const candidates = items.flatMap((item) => {
    const metadata = normalizeRackItemMetadata(item.metadata ?? {});
    const text = item.metadata?.notes?.trim() || metadata.tags?.slice(0, 2).join(", ") || null;
    const connectionIds = metadata.connectionIds ?? [];
    return text || connectionIds.length > 0
      ? [{ itemId: item.id, label: item.label, text, connectionIds }]
      : [];
  });
  return candidates
    .sort((a, b) => `${seed}:${a.itemId}`.localeCompare(`${seed}:${b.itemId}`))
    .slice(0, limit);
}
