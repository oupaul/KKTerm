// TypeScript mirror of `src-tauri/src/pc_info.rs` (serde camelCase). Every field
// is optional because a partial gather is a normal, non-error outcome.

export interface PcInfoOs {
  name?: string | null;
  version?: string | null;
  build?: string | null;
  architecture?: string | null;
  hostname?: string | null;
  registeredUser?: string | null;
  loggedInUser?: string | null;
  locale?: string | null;
  installDateUnixSeconds?: number | null;
  uptimeSeconds?: number | null;
}

export interface PcInfoCpu {
  name?: string | null;
  vendor?: string | null;
  physicalCores?: number | null;
  logicalProcessors?: number | null;
  maxClockMhz?: number | null;
  l2CacheBytes?: number | null;
  l3CacheBytes?: number | null;
  addressWidthBits?: number | null;
  socket?: string | null;
}

export interface PcInfoMemoryModule {
  slot?: string | null;
  capacityBytes?: number | null;
  speedMhz?: number | null;
  manufacturer?: string | null;
  partNumber?: string | null;
  formFactor?: string | null;
  memoryType?: string | null;
}

export interface PcInfoMemory {
  totalBytes?: number | null;
  availableBytes?: number | null;
  usedPercent?: number | null;
  modules: PcInfoMemoryModule[];
}

export interface PcInfoMotherboard {
  manufacturer?: string | null;
  product?: string | null;
  version?: string | null;
  serialNumber?: string | null;
  biosVendor?: string | null;
  biosVersion?: string | null;
  biosDate?: string | null;
}

export interface PcInfoGpu {
  name?: string | null;
  vendor?: string | null;
  vramBytes?: number | null;
  driverVersion?: string | null;
  currentMode?: string | null;
}

export interface PcInfoDisplay {
  name?: string | null;
  resolution?: string | null;
  refreshHz?: number | null;
}

export interface PcInfoDisk {
  model?: string | null;
  sizeBytes?: number | null;
  mediaType?: string | null;
  interface?: string | null;
  serialNumber?: string | null;
}

export interface PcInfoVolume {
  mount?: string | null;
  label?: string | null;
  fileSystem?: string | null;
  totalBytes?: number | null;
  freeBytes?: number | null;
}

export interface PcInfoNetworkAdapter {
  name?: string | null;
  macAddress?: string | null;
  adapterType?: string | null;
  speedBitsPerSecond?: number | null;
  ipAddresses: string[];
  gateways: string[];
  dnsServers: string[];
}

export interface PcInfoAudioDevice {
  name?: string | null;
  manufacturer?: string | null;
}

export interface PcInfoSnapshot {
  generatedAtUnixSeconds: number;
  source: string;
  warnings: string[];
  os: PcInfoOs;
  cpu: PcInfoCpu;
  memory: PcInfoMemory;
  motherboard: PcInfoMotherboard;
  graphics: PcInfoGpu[];
  displays: PcInfoDisplay[];
  storage: PcInfoDisk[];
  volumes: PcInfoVolume[];
  network: PcInfoNetworkAdapter[];
  audio: PcInfoAudioDevice[];
}
