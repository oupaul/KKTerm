import type {
  PcInfoAudioDevice,
  PcInfoBattery,
  PcInfoCpu,
  PcInfoDisk,
  PcInfoDisplay,
  PcInfoGpu,
  PcInfoMemory,
  PcInfoMemoryModule,
  PcInfoMotherboard,
  PcInfoNetworkAdapter,
  PcInfoOs,
  PcInfoSnapshot,
  PcInfoVolume,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordArray<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter(isRecord).map((entry) => ({ ...entry }) as T)
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function normalizePcInfoSnapshot(value: unknown): PcInfoSnapshot | null {
  if (!isRecord(value) || !Number.isFinite(value.generatedAtUnixSeconds)) {
    return null;
  }
  if (
    !isRecord(value.os) ||
    !isRecord(value.cpu) ||
    !isRecord(value.memory) ||
    !isRecord(value.motherboard)
  ) {
    return null;
  }

  const memory = value.memory;
  const network = recordArray<PcInfoNetworkAdapter>(value.network).map((adapter) => ({
    ...adapter,
    ipAddresses: stringArray(adapter.ipAddresses),
    subnetMasks: stringArray(adapter.subnetMasks),
    gateways: stringArray(adapter.gateways),
    dnsServers: stringArray(adapter.dnsServers),
  }));

  return {
    ...value,
    generatedAtUnixSeconds: value.generatedAtUnixSeconds as number,
    source: typeof value.source === "string" ? value.source : "",
    warnings: stringArray(value.warnings),
    os: value.os as PcInfoOs,
    cpu: value.cpu as PcInfoCpu,
    memory: {
      ...memory,
      modules: recordArray<PcInfoMemoryModule>(memory.modules),
    } as PcInfoMemory,
    motherboard: value.motherboard as PcInfoMotherboard,
    graphics: recordArray<PcInfoGpu>(value.graphics),
    displays: recordArray<PcInfoDisplay>(value.displays),
    storage: recordArray<PcInfoDisk>(value.storage),
    volumes: recordArray<PcInfoVolume>(value.volumes),
    network,
    audio: recordArray<PcInfoAudioDevice>(value.audio),
    battery: recordArray<PcInfoBattery>(value.battery),
  };
}

export function parsePcInfoSnapshotCache(raw: string | null): PcInfoSnapshot | null {
  if (!raw) {
    return null;
  }
  try {
    return normalizePcInfoSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}
