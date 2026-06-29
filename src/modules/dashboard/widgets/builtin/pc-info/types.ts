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
  timeZone?: string | null;
  productId?: string | null;
  systemDrive?: string | null;
  installDateUnixSeconds?: number | null;
  lastBootUnixSeconds?: number | null;
  uptimeSeconds?: number | null;
}

export interface PcInfoCpu {
  name?: string | null;
  vendor?: string | null;
  family?: string | null;
  physicalCores?: number | null;
  enabledCores?: number | null;
  logicalProcessors?: number | null;
  maxClockMhz?: number | null;
  currentClockMhz?: number | null;
  l1CacheBytes?: number | null;
  l2CacheBytes?: number | null;
  l3CacheBytes?: number | null;
  addressWidthBits?: number | null;
  virtualizationEnabled?: boolean | null;
  socket?: string | null;
}

export interface PcInfoMemoryModule {
  slot?: string | null;
  bank?: string | null;
  capacityBytes?: number | null;
  speedMhz?: number | null;
  voltageMillivolts?: number | null;
  manufacturer?: string | null;
  partNumber?: string | null;
  formFactor?: string | null;
  memoryType?: string | null;
}

export interface PcInfoMemory {
  totalBytes?: number | null;
  availableBytes?: number | null;
  usedPercent?: number | null;
  slotsUsed?: number | null;
  slotsTotal?: number | null;
  maxCapacityBytes?: number | null;
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
  systemType?: string | null;
  chassisType?: string | null;
  systemSku?: string | null;
  systemUuid?: string | null;
}

export interface PcInfoGpu {
  name?: string | null;
  vendor?: string | null;
  chip?: string | null;
  vramBytes?: number | null;
  driverVersion?: string | null;
  driverDate?: string | null;
  currentMode?: string | null;
}

export interface PcInfoDisplay {
  name?: string | null;
  manufacturer?: string | null;
  resolution?: string | null;
  refreshHz?: number | null;
  sizeInches?: number | null;
  year?: number | null;
}

export interface PcInfoDisk {
  model?: string | null;
  sizeBytes?: number | null;
  mediaType?: string | null;
  interface?: string | null;
  serialNumber?: string | null;
  healthStatus?: string | null;
  spindleSpeedRpm?: number | null;
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
  connected?: boolean | null;
  dhcpEnabled?: boolean | null;
  dhcpServer?: string | null;
  dnsSuffix?: string | null;
  ipAddresses: string[];
  subnetMasks: string[];
  gateways: string[];
  dnsServers: string[];
}

export interface PcInfoAudioDevice {
  name?: string | null;
  manufacturer?: string | null;
}

export interface PcInfoBattery {
  name?: string | null;
  chargePercent?: number | null;
  status?: string | null;
  designCapacityMwh?: number | null;
  fullChargeCapacityMwh?: number | null;
  wearPercent?: number | null;
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
  battery: PcInfoBattery[];
}
