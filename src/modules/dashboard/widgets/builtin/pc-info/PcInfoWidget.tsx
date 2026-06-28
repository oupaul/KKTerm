import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isTauriRuntime } from "../../../../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import {
  formatBitsPerSecond,
  formatBytes,
  formatDate,
  formatMhz,
  formatPercent,
  formatUptime,
  orDash,
} from "./format";
import { usePcInfoStore, usePcInfoSubscription } from "./store";
import type { PcInfoSnapshot } from "./types";

const SECTIONS = [
  "summary",
  "os",
  "cpu",
  "memory",
  "motherboard",
  "graphics",
  "storage",
  "network",
  "audio",
] as const;
type SectionId = (typeof SECTIONS)[number];

interface PcInfoConfig {
  activeSection: SectionId;
}

function normalizeConfig(value: unknown): PcInfoConfig {
  const fallback: PcInfoConfig = { activeSection: "summary" };
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<PcInfoConfig>;
  return SECTIONS.includes(candidate.activeSection as SectionId)
    ? { activeSection: candidate.activeSection as SectionId }
    : fallback;
}

export function PcInfoBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  usePcInfoSubscription();
  const snapshot = usePcInfoStore((s) => s.snapshot);
  const loading = usePcInfoStore((s) => s.loading);
  const refreshing = usePcInfoStore((s) => s.refreshing);
  const error = usePcInfoStore((s) => s.error);
  const refresh = usePcInfoStore((s) => s.refresh);
  const [config, setConfig] = useWidgetConfig(
    `kkterm.dashboard.pcInfo.${instance.id}.v1`,
    { activeSection: "summary" as SectionId },
    normalizeConfig,
  );

  if (!isTauriRuntime()) {
    return <div className="dw-pcinfo-empty">{t("dashboard.pcInfoDesktopOnly")}</div>;
  }

  const busy = loading || refreshing;

  return (
    <div className="dw-pcinfo">
      <div className="dw-pcinfo-tabs" role="tablist" aria-label={t("dashboard.pcInfoTitle")}>
        {SECTIONS.map((section) => (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={section === config.activeSection}
            className={`dw-pcinfo-tab${section === config.activeSection ? " is-active" : ""}`}
            onClick={() => setConfig({ activeSection: section })}
          >
            {t(`dashboard.pcInfoSection.${section}`)}
          </button>
        ))}
      </div>

      <div className="dw-pcinfo-body">
        {error ? <div className="dw-pcinfo-error">{error}</div> : null}
        {snapshot ? (
          <SectionView section={config.activeSection} snapshot={snapshot} />
        ) : (
          <div className="dw-pcinfo-empty">
            {loading ? t("dashboard.pcInfoLoading") : t("dashboard.pcInfoEmpty")}
          </div>
        )}
      </div>

      <div className="dw-pcinfo-footer">
        <span className="dw-pcinfo-stamp">
          {snapshot
            ? t("dashboard.pcInfoUpdatedAt", {
                time: new Date(snapshot.generatedAtUnixSeconds * 1000).toLocaleTimeString(),
              })
            : ""}
        </span>
        <button
          type="button"
          className="secondary-button dw-pcinfo-refresh"
          onClick={() => void refresh()}
          disabled={busy}
        >
          <RefreshCw size={12} className={busy ? "dw-pcinfo-spin" : undefined} />
          {t("common.refresh")}
        </button>
      </div>
    </div>
  );
}

function SectionView({ section, snapshot }: { section: SectionId; snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  switch (section) {
    case "summary":
      return <SummarySection snapshot={snapshot} />;
    case "os":
      return <OsSection snapshot={snapshot} />;
    case "cpu":
      return <CpuSection snapshot={snapshot} />;
    case "memory":
      return <MemorySection snapshot={snapshot} />;
    case "motherboard":
      return <MotherboardSection snapshot={snapshot} />;
    case "graphics":
      return <GraphicsSection snapshot={snapshot} />;
    case "storage":
      return <StorageSection snapshot={snapshot} />;
    case "network":
      return <NetworkSection snapshot={snapshot} />;
    case "audio":
      return <AudioSection snapshot={snapshot} />;
    default:
      return <div className="dw-pcinfo-empty">{t("dashboard.pcInfoEmpty")}</div>;
  }
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="dw-pcinfo-row">
      <span className="dw-pcinfo-label">{label}</span>
      <span className="dw-pcinfo-value">{value}</span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="dw-pcinfo-group">
      <div className="dw-pcinfo-group-title">{title}</div>
      {children}
    </div>
  );
}

function EmptyHint() {
  const { t } = useTranslation();
  return <div className="dw-pcinfo-section-empty">{t("dashboard.pcInfoSectionEmpty")}</div>;
}

function SummarySection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  const gpu = snapshot.graphics[0];
  return (
    <div className="dw-pcinfo-section">
      <Row label={t("dashboard.pcInfoField.os")} value={orDash(snapshot.os.name)} />
      <Row label={t("dashboard.pcInfoField.hostname")} value={orDash(snapshot.os.hostname)} />
      <Row label={t("dashboard.pcInfoField.cpu")} value={orDash(snapshot.cpu.name)} />
      <Row label={t("dashboard.pcInfoField.ram")} value={formatBytes(snapshot.memory.totalBytes)} />
      <Row label={t("dashboard.pcInfoField.gpu")} value={orDash(gpu?.name)} />
      <Row
        label={t("dashboard.pcInfoField.motherboard")}
        value={orDash(snapshot.motherboard.product)}
      />
      <Row label={t("dashboard.pcInfoField.uptime")} value={formatUptime(snapshot.os.uptimeSeconds)} />
    </div>
  );
}

function OsSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  const { os } = snapshot;
  return (
    <div className="dw-pcinfo-section">
      <Row label={t("dashboard.pcInfoField.name")} value={orDash(os.name)} />
      <Row label={t("dashboard.pcInfoField.version")} value={orDash(os.version)} />
      <Row label={t("dashboard.pcInfoField.build")} value={orDash(os.build)} />
      <Row label={t("dashboard.pcInfoField.architecture")} value={orDash(os.architecture)} />
      <Row label={t("dashboard.pcInfoField.hostname")} value={orDash(os.hostname)} />
      <Row label={t("dashboard.pcInfoField.loggedInUser")} value={orDash(os.loggedInUser)} />
      <Row label={t("dashboard.pcInfoField.registeredUser")} value={orDash(os.registeredUser)} />
      <Row label={t("dashboard.pcInfoField.locale")} value={orDash(os.locale)} />
      <Row
        label={t("dashboard.pcInfoField.installDate")}
        value={formatDate(os.installDateUnixSeconds)}
      />
      <Row label={t("dashboard.pcInfoField.uptime")} value={formatUptime(os.uptimeSeconds)} />
    </div>
  );
}

function CpuSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  const { cpu } = snapshot;
  return (
    <div className="dw-pcinfo-section">
      <Row label={t("dashboard.pcInfoField.name")} value={orDash(cpu.name)} />
      <Row label={t("dashboard.pcInfoField.vendor")} value={orDash(cpu.vendor)} />
      <Row
        label={t("dashboard.pcInfoField.cores")}
        value={cpu.physicalCores ? String(cpu.physicalCores) : "—"}
      />
      <Row
        label={t("dashboard.pcInfoField.threads")}
        value={cpu.logicalProcessors ? String(cpu.logicalProcessors) : "—"}
      />
      <Row label={t("dashboard.pcInfoField.maxClock")} value={formatMhz(cpu.maxClockMhz)} />
      <Row label={t("dashboard.pcInfoField.l2Cache")} value={formatBytes(cpu.l2CacheBytes)} />
      <Row label={t("dashboard.pcInfoField.l3Cache")} value={formatBytes(cpu.l3CacheBytes)} />
      <Row label={t("dashboard.pcInfoField.socket")} value={orDash(cpu.socket)} />
      <Row
        label={t("dashboard.pcInfoField.addressWidth")}
        value={cpu.addressWidthBits ? `${cpu.addressWidthBits}-bit` : "—"}
      />
    </div>
  );
}

function MemorySection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  const { memory } = snapshot;
  return (
    <div className="dw-pcinfo-section">
      <Row label={t("dashboard.pcInfoField.total")} value={formatBytes(memory.totalBytes)} />
      <Row label={t("dashboard.pcInfoField.available")} value={formatBytes(memory.availableBytes)} />
      <Row label={t("dashboard.pcInfoField.used")} value={formatPercent(memory.usedPercent)} />
      {memory.modules.length > 0 ? (
        memory.modules.map((module, index) => (
          <Group
            key={module.slot ?? index}
            title={orDash(module.slot) === "—" ? `#${index + 1}` : orDash(module.slot)}
          >
            <Row
              label={t("dashboard.pcInfoField.capacity")}
              value={formatBytes(module.capacityBytes)}
            />
            <Row label={t("dashboard.pcInfoField.speed")} value={formatMhz(module.speedMhz)} />
            <Row label={t("dashboard.pcInfoField.type")} value={orDash(module.memoryType)} />
            <Row label={t("dashboard.pcInfoField.formFactor")} value={orDash(module.formFactor)} />
            <Row
              label={t("dashboard.pcInfoField.manufacturer")}
              value={orDash(module.manufacturer)}
            />
            <Row label={t("dashboard.pcInfoField.partNumber")} value={orDash(module.partNumber)} />
          </Group>
        ))
      ) : (
        <EmptyHint />
      )}
    </div>
  );
}

function MotherboardSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  const { motherboard } = snapshot;
  return (
    <div className="dw-pcinfo-section">
      <Row
        label={t("dashboard.pcInfoField.manufacturer")}
        value={orDash(motherboard.manufacturer)}
      />
      <Row label={t("dashboard.pcInfoField.product")} value={orDash(motherboard.product)} />
      <Row label={t("dashboard.pcInfoField.version")} value={orDash(motherboard.version)} />
      <Row label={t("dashboard.pcInfoField.serialNumber")} value={orDash(motherboard.serialNumber)} />
      <Group title={t("dashboard.pcInfoField.bios")}>
        <Row label={t("dashboard.pcInfoField.vendor")} value={orDash(motherboard.biosVendor)} />
        <Row label={t("dashboard.pcInfoField.version")} value={orDash(motherboard.biosVersion)} />
        <Row label={t("dashboard.pcInfoField.date")} value={orDash(motherboard.biosDate)} />
      </Group>
    </div>
  );
}

function GraphicsSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  return (
    <div className="dw-pcinfo-section">
      {snapshot.graphics.length > 0 ? (
        snapshot.graphics.map((gpu, index) => (
          <Group key={gpu.name ?? index} title={orDash(gpu.name)}>
            <Row label={t("dashboard.pcInfoField.vendor")} value={orDash(gpu.vendor)} />
            <Row label={t("dashboard.pcInfoField.vram")} value={formatBytes(gpu.vramBytes)} />
            <Row label={t("dashboard.pcInfoField.driver")} value={orDash(gpu.driverVersion)} />
            <Row label={t("dashboard.pcInfoField.mode")} value={orDash(gpu.currentMode)} />
          </Group>
        ))
      ) : (
        <EmptyHint />
      )}
      {snapshot.displays.length > 0 ? (
        <Group title={t("dashboard.pcInfoField.displays")}>
          {snapshot.displays.map((display, index) => (
            <Row
              key={display.name ?? index}
              label={orDash(display.name)}
              value={`${orDash(display.resolution)}${
                display.refreshHz ? ` @ ${display.refreshHz} Hz` : ""
              }`}
            />
          ))}
        </Group>
      ) : null}
    </div>
  );
}

function StorageSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  return (
    <div className="dw-pcinfo-section">
      {snapshot.storage.length > 0 ? (
        snapshot.storage.map((disk, index) => (
          <Group key={disk.serialNumber ?? disk.model ?? index} title={orDash(disk.model)}>
            <Row label={t("dashboard.pcInfoField.capacity")} value={formatBytes(disk.sizeBytes)} />
            <Row label={t("dashboard.pcInfoField.type")} value={orDash(disk.mediaType)} />
            <Row label={t("dashboard.pcInfoField.interface")} value={orDash(disk.interface)} />
            <Row label={t("dashboard.pcInfoField.serialNumber")} value={orDash(disk.serialNumber)} />
          </Group>
        ))
      ) : (
        <EmptyHint />
      )}
      {snapshot.volumes.length > 0 ? (
        <Group title={t("dashboard.pcInfoField.volumes")}>
          {snapshot.volumes.map((volume, index) => (
            <Row
              key={volume.mount ?? index}
              label={`${orDash(volume.mount)}${
                volume.label?.trim() ? ` (${volume.label.trim()})` : ""
              }`}
              value={`${formatBytes(volume.freeBytes)} / ${formatBytes(volume.totalBytes)}${
                volume.fileSystem?.trim() ? ` · ${volume.fileSystem.trim()}` : ""
              }`}
            />
          ))}
        </Group>
      ) : null}
    </div>
  );
}

function NetworkSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  return (
    <div className="dw-pcinfo-section">
      {snapshot.network.length > 0 ? (
        snapshot.network.map((adapter, index) => (
          <Group key={adapter.macAddress ?? adapter.name ?? index} title={orDash(adapter.name)}>
            <Row label={t("dashboard.pcInfoField.macAddress")} value={orDash(adapter.macAddress)} />
            <Row label={t("dashboard.pcInfoField.adapterType")} value={orDash(adapter.adapterType)} />
            <Row
              label={t("dashboard.pcInfoField.linkSpeed")}
              value={formatBitsPerSecond(adapter.speedBitsPerSecond)}
            />
            <Row
              label={t("dashboard.pcInfoField.ipAddresses")}
              value={adapter.ipAddresses.length > 0 ? adapter.ipAddresses.join(", ") : "—"}
            />
            {adapter.gateways.length > 0 ? (
              <Row label={t("dashboard.pcInfoField.gateway")} value={adapter.gateways.join(", ")} />
            ) : null}
            {adapter.dnsServers.length > 0 ? (
              <Row label={t("dashboard.pcInfoField.dns")} value={adapter.dnsServers.join(", ")} />
            ) : null}
          </Group>
        ))
      ) : (
        <EmptyHint />
      )}
    </div>
  );
}

function AudioSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  return (
    <div className="dw-pcinfo-section">
      {snapshot.audio.length > 0 ? (
        snapshot.audio.map((device, index) => (
          <Row
            key={device.name ?? index}
            label={orDash(device.name)}
            value={orDash(device.manufacturer)}
          />
        ))
      ) : (
        <EmptyHint />
      )}
    </div>
  );
}
