import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isTauriRuntime } from "../../../../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import {
  formatBitsPerSecond,
  formatBytes,
  formatMhz,
  formatUptime,
  gigabytes,
  orDash,
  ringGeometry,
  sparklinePoints,
} from "./format";
import { usePcInfoStore, usePcInfoSubscription } from "./store";
import type { PcInfoSnapshot, PcInfoSystem } from "./types";
import { useHostUsageHistory, type HostUsageHistory } from "./useHostUsageHistory";

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
  "battery",
] as const;
type SectionId = (typeof SECTIONS)[number];

interface PcInfoConfig {
  activeSection: SectionId;
}

// Lucide-style 24×24 icon path pairs, one per tab. Ported from the reference
// design so the tab bar reads at a glance.
const TAB_ICONS: Record<SectionId, [string, string]> = {
  summary: ["M4 5h16v11H4z", "M9 20h6M12 16v4"],
  os: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  cpu: ["M7 7h10v10H7z", "M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"],
  memory: ["M3 8h18v8H3z", "M7 16v3M11 16v3M15 16v3M19 16v3"],
  motherboard: ["M4 4h16v16H4z", "M8 4v4h4M16 8h-4v4h4M8 12H4M12 16v4"],
  graphics: ["M3 6h18v9H3z", "M9.5 10.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0M6 15v4M18 15v4"],
  storage: ["M4 5h16v6H4zM4 13h16v6H4z", "M7 8h.01M7 16h.01"],
  network: [
    "M6 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM6 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    "M8 7h6a2 2 0 0 1 2 2v6M7 13v2",
  ],
  audio: ["M5 9v6h4l5 4V5L9 9H5z", "M17 9a4 4 0 0 1 0 6"],
  battery: ["M3 8h15v8H3z", "M21 11v2"],
};

function normalizeConfig(value: unknown): PcInfoConfig {
  const fallback: PcInfoConfig = { activeSection: "summary" };
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<PcInfoConfig>;
  return SECTIONS.includes(candidate.activeSection as SectionId)
    ? { activeSection: candidate.activeSection as SectionId }
    : fallback;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const ease = (p: number): number => 1 - Math.pow(1 - p, 3);

function formatPcModel(system: PcInfoSystem | undefined): string | null {
  const manufacturer = system?.manufacturer?.trim();
  const model = system?.model?.trim();
  if (!manufacturer) {
    return model || null;
  }
  if (!model || model.toLocaleLowerCase().startsWith(manufacturer.toLocaleLowerCase())) {
    return model || manufacturer;
  }
  return `${manufacturer} ${model}`;
}

/**
 * Eased 0→1 progress that replays whenever `key` changes (section switch or
 * refresh), driving ring fills and count-ups. Honors reduced-motion by snapping
 * straight to 1.
 */
function useEnterProgress(key: string | number, durationMs = 900): number {
  const [progress, setProgress] = useState(prefersReducedMotion() ? 1 : 0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    setProgress(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setProgress(t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, durationMs]);
  return progress;
}

export function PcInfoBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  usePcInfoSubscription();
  const snapshot = usePcInfoStore((s) => s.snapshot);
  const loading = usePcInfoStore((s) => s.loading);
  const refreshing = usePcInfoStore((s) => s.refreshing);
  const error = usePcInfoStore((s) => s.error);
  const refresh = usePcInfoStore((s) => s.refresh);
  const usage = useHostUsageHistory();
  const [config, setConfig] = useWidgetConfig(
    `kkterm.dashboard.pcInfo.${instance.id}.v1`,
    { activeSection: "summary" as SectionId },
    normalizeConfig,
  );

  if (!isTauriRuntime()) {
    return <div className="dw-pcinfo-empty">{t("dashboard.pcInfoDesktopOnly")}</div>;
  }

  const busy = loading || refreshing;
  // The Battery tab only appears on machines that actually have a battery.
  const visibleSections = SECTIONS.filter(
    (section) => section !== "battery" || (snapshot?.battery.length ?? 0) > 0,
  );
  const activeSection = visibleSections.includes(config.activeSection)
    ? config.activeSection
    : "summary";

  const stamp = snapshot
    ? new Date(snapshot.generatedAtUnixSeconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="dw-pcinfo">
      <div className="dw-pcinfo-ambient dw-pcinfo-ambient-a" aria-hidden="true" />
      <div className="dw-pcinfo-ambient dw-pcinfo-ambient-b" aria-hidden="true" />

      <header className="dw-pcinfo-header">
        <span className="dw-pcinfo-badge" aria-hidden="true">
          &gt;_
        </span>
        <div className="dw-pcinfo-heading">
          <span className="dw-pcinfo-eyebrow">{t("dashboard.pcInfoTitle")}</span>
          <span className="dw-pcinfo-title">{t("dashboard.pcInfoLabel.systemInventory")}</span>
        </div>
        <div className="dw-pcinfo-headmeta">
          <span className="dw-pcinfo-host">{orDash(snapshot?.os.hostname)}</span>
          {snapshot ? (
            <span className="dw-pcinfo-stamp">{t("dashboard.pcInfoUpdatedAt", { time: stamp })}</span>
          ) : null}
        </div>
        <button
          type="button"
          className="dw-pcinfo-refresh"
          onClick={() => void refresh()}
          disabled={busy}
          title={t("common.refresh")}
          aria-label={t("common.refresh")}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={busy ? "dw-pcinfo-spin" : undefined}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </header>

      <div className="dw-pcinfo-tabs" role="tablist" aria-label={t("dashboard.pcInfoTitle")}>
        {visibleSections.map((section) => {
          const [p1, p2] = TAB_ICONS[section];
          const isActive = section === activeSection;
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`dw-pcinfo-tab${isActive ? " is-active" : ""}`}
              onClick={() => setConfig({ activeSection: section })}
              title={t(`dashboard.pcInfoTab.${section}`)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={p1} />
                {p2 ? <path d={p2} /> : null}
              </svg>
              <span className="dw-pcinfo-tab-label">{t(`dashboard.pcInfoTab.${section}`)}</span>
            </button>
          );
        })}
      </div>

      <div className="dw-pcinfo-body">
        {error ? <div className="dw-pcinfo-error">{error}</div> : null}
        {snapshot ? (
          <div
            className="dw-pcinfo-enter"
            key={`${activeSection}:${snapshot.generatedAtUnixSeconds}`}
          >
            <SectionView section={activeSection} snapshot={snapshot} usage={usage} />
          </div>
        ) : (
          <div className="dw-pcinfo-empty">
            {loading ? t("dashboard.pcInfoLoading") : t("dashboard.pcInfoEmpty")}
          </div>
        )}
      </div>

      <footer className="dw-pcinfo-footer">
        <span className="dw-pcinfo-foot-source">
          {snapshot ? t("dashboard.pcInfoLabel.sourceCached", { source: snapshot.source }) : ""}
        </span>
        <span className="dw-pcinfo-foot-arch">
          {!usage.live ? (
            <span className="dw-pcinfo-foot-hint">{t("dashboard.pcInfoLabel.monitorOff")}</span>
          ) : null}
          {orDash(snapshot?.os.architecture)}
        </span>
      </footer>
    </div>
  );
}

function SectionView({
  section,
  snapshot,
  usage,
}: {
  section: SectionId;
  snapshot: PcInfoSnapshot;
  usage: HostUsageHistory;
}) {
  const progress = useEnterProgress(section);
  switch (section) {
    case "summary":
      return <SummarySection snapshot={snapshot} usage={usage} progress={progress} />;
    case "os":
      return <OsSection snapshot={snapshot} progress={progress} />;
    case "cpu":
      return <CpuSection snapshot={snapshot} usage={usage} progress={progress} />;
    case "memory":
      return <MemorySection snapshot={snapshot} usage={usage} progress={progress} />;
    case "motherboard":
      return <MotherboardSection snapshot={snapshot} />;
    case "graphics":
      return <GraphicsSection snapshot={snapshot} />;
    case "storage":
      return <StorageSection snapshot={snapshot} progress={progress} />;
    case "network":
      return <NetworkSection snapshot={snapshot} usage={usage} />;
    case "audio":
      return <AudioSection snapshot={snapshot} />;
    case "battery":
      return <BatterySection snapshot={snapshot} progress={progress} />;
    default:
      return null;
  }
}

// ── Shared building blocks ────────────────────────────────────────────────────

function Ring({
  size,
  radius,
  stroke,
  color,
  fraction,
}: {
  size: number;
  radius: number;
  stroke: number;
  color: string;
  fraction: number;
}) {
  const { circumference, offset } = ringGeometry(radius, fraction);
  const center = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="dw-pcinfo-ring">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function Sparkline({
  values,
  max,
  color,
  fillId,
}: {
  values: number[];
  max: number;
  color: string;
  fillId: string;
}) {
  const width = 240;
  const height = 48;
  const line = sparklinePoints(values, width, height, max);
  const hasData = values.length >= 2;
  const area = hasData ? `${line} ${width},${height} 0,${height}` : "";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className="dw-pcinfo-spark"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {hasData ? <polygon points={area} fill={`url(#${fillId})`} /> : null}
      {line ? (
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={hasData ? 1 : 0.4}
        />
      ) : null}
    </svg>
  );
}

function KeyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="dw-pcinfo-row">
      <span className="dw-pcinfo-label">{label}</span>
      <span className="dw-pcinfo-value">{value}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="dw-pcinfo-fact">
      <span className="dw-pcinfo-fact-label">{label}</span>
      <span className="dw-pcinfo-fact-value">{value}</span>
    </div>
  );
}

function Stat({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="dw-pcinfo-stat">
      <span className={`dw-pcinfo-stat-value${accent ? " is-accent" : ""}`}>{value}</span>
      <span className="dw-pcinfo-stat-label">{label}</span>
    </div>
  );
}

function EmptyHint() {
  const { t } = useTranslation();
  return <div className="dw-pcinfo-section-empty">{t("dashboard.pcInfoSectionEmpty")}</div>;
}

function pct(value: number | null | undefined): number {
  return value === null || value === undefined || !Number.isFinite(value) ? 0 : value;
}

// ── Sections ──────────────────────────────────────────────────────────────────

function SummarySection({
  snapshot,
  usage,
  progress,
}: {
  snapshot: PcInfoSnapshot;
  usage: HostUsageHistory;
  progress: number;
}) {
  const { t } = useTranslation();
  const ep = ease(progress);
  const gpu = orderGpus(snapshot.graphics)[0];
  const memUsed = usage.live ? usage.ramPercent : snapshot.memory.usedPercent;
  const cpuLoad = usage.cpuPercent;
  const pcModel = formatPcModel(snapshot.system);
  return (
    <div className="dw-pcinfo-section">
      <div className="dw-pcinfo-hero">
        <div className="dw-pcinfo-illu" aria-hidden="true">
          <div className="dw-pcinfo-breathe" />
          <svg viewBox="0 0 132 132" className="dw-pcinfo-illu-svg">
            <rect x="40" y="30" width="52" height="74" rx="9" fill="var(--surface-muted)" stroke="var(--border-strong)" strokeWidth="1.5" />
            <rect x="48" y="40" width="36" height="5" rx="2.5" fill="var(--accent)" opacity="0.85" />
            <rect x="48" y="50" width="36" height="3" rx="1.5" fill="var(--text-faint)" opacity="0.5" />
            <circle cx="51" cy="92" r="3" fill="var(--green)" />
            <circle cx="51" cy="92" r="6" fill="none" stroke="var(--green)" strokeWidth="1.2" opacity="0.5" />
            <g stroke="var(--text-faint)" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
              <path d="M62 88h22" />
              <path d="M62 93h22" />
              <path d="M62 98h22" />
            </g>
            <circle cx="66" cy="66" r="58" fill="none" stroke="color-mix(in srgb, var(--accent) 30%, transparent)" strokeWidth="1" strokeDasharray="3 6" opacity="0.6" />
          </svg>
        </div>
        <div className="dw-pcinfo-hero-main">
          <div className="dw-pcinfo-gauges">
            <div className="dw-pcinfo-gauge">
              <div className="dw-pcinfo-gauge-ring">
                <Ring size={58} radius={24} stroke={5} color="var(--accent)" fraction={(pct(cpuLoad) / 100) * ep} />
                <span className="dw-pcinfo-gauge-text">
                  {usage.live && cpuLoad !== undefined ? `${Math.round(cpuLoad * ep)}%` : "—"}
                </span>
              </div>
              <span className="dw-pcinfo-gauge-label">{t("dashboard.pcInfoLabel.cpuLoad")}</span>
            </div>
            <div className="dw-pcinfo-gauge">
              <div className="dw-pcinfo-gauge-ring">
                <Ring size={58} radius={24} stroke={5} color="var(--green)" fraction={(pct(memUsed) / 100) * ep} />
                <span className="dw-pcinfo-gauge-text">
                  {memUsed !== undefined && memUsed !== null ? `${Math.round(memUsed * ep)}%` : "—"}
                </span>
              </div>
              <span className="dw-pcinfo-gauge-label">{t("dashboard.pcInfoSection.memory")}</span>
            </div>
          </div>
          <Sparkline values={usage.cpuHistory} max={100} color="var(--accent)" fillId="dw-pcinfo-sum-fill" />
        </div>
      </div>
      <div className="dw-pcinfo-facts">
        <Fact label={t("dashboard.pcInfoField.pcModel")} value={orDash(pcModel)} />
        <Fact label={t("dashboard.pcInfoField.os")} value={orDash(snapshot.os.name)} />
        <Fact label={t("dashboard.pcInfoField.cpu")} value={orDash(snapshot.cpu.name)} />
        <Fact label={t("dashboard.pcInfoField.gpu")} value={orDash(gpu?.name)} />
        <Fact
          label={t("dashboard.pcInfoSection.memory")}
          value={<span className="dw-pcinfo-mono">{formatBytes(snapshot.memory.totalBytes)}</span>}
        />
        <Fact label={t("dashboard.pcInfoField.motherboard")} value={orDash(snapshot.motherboard.product)} />
        <Fact
          label={t("dashboard.pcInfoField.uptime")}
          value={<span className="dw-pcinfo-mono">{formatUptime(snapshot.os.uptimeSeconds)}</span>}
        />
      </div>
    </div>
  );
}

function OsSection({ snapshot, progress }: { snapshot: PcInfoSnapshot; progress: number }) {
  const { t } = useTranslation();
  const ep = ease(progress);
  const { os } = snapshot;
  const uptime = os.uptimeSeconds ?? 0;
  const days = Math.floor(uptime / 86_400);
  const hours = Math.floor((uptime % 86_400) / 3_600);
  const minutes = Math.floor((uptime % 3_600) / 60);
  // Fill the ring as a fraction of a week, matching the reference's cadence.
  const fraction = (uptime / 86_400 / 7) * ep;
  const rows: Array<[string, ReactNode]> = [
    [t("dashboard.pcInfoField.version"), orDash(os.version)],
    [t("dashboard.pcInfoField.build"), orDash(os.build)],
    [t("dashboard.pcInfoField.hostname"), orDash(os.hostname)],
    [t("dashboard.pcInfoField.loggedInUser"), orDash(os.loggedInUser)],
    [t("dashboard.pcInfoField.locale"), orDash(os.locale)],
    [t("dashboard.pcInfoField.architecture"), orDash(os.architecture)],
  ];
  return (
    <div className="dw-pcinfo-section dw-pcinfo-split">
      <div className="dw-pcinfo-bigring">
        <Ring size={128} radius={52} stroke={8} color="var(--accent)" fraction={fraction} />
        <div className="dw-pcinfo-bigring-center">
          <span className="dw-pcinfo-bigring-value">{Math.round(days * ep)}</span>
          <span className="dw-pcinfo-bigring-unit">{t("dashboard.pcInfoLabel.daysUp")}</span>
          <span className="dw-pcinfo-bigring-sub">
            {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}h
          </span>
        </div>
      </div>
      <div className="dw-pcinfo-rows">
        {rows.map(([label, value]) => (
          <KeyRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function CpuSection({
  snapshot,
  usage,
  progress,
}: {
  snapshot: PcInfoSnapshot;
  usage: HostUsageHistory;
  progress: number;
}) {
  const { t } = useTranslation();
  const ep = ease(progress);
  const { cpu } = snapshot;
  const coreCount = cpu.physicalCores ?? 0;
  const cells = Math.min(16, Math.max(coreCount, 0));
  const cores = Array.from({ length: 16 }, (_, i) => i);
  const maxGhz = cpu.maxClockMhz ? cpu.maxClockMhz / 1000 : null;
  const cpuLoad = usage.cpuPercent;
  return (
    <div className="dw-pcinfo-section">
      <div className="dw-pcinfo-hero">
        <div className="dw-pcinfo-illu dw-pcinfo-illu-cpu" aria-hidden="true">
          <div className="dw-pcinfo-breathe dw-pcinfo-breathe-cpu" />
          <svg viewBox="0 0 116 116" className="dw-pcinfo-illu-svg">
            <rect x="30" y="30" width="56" height="56" rx="8" fill="var(--surface-muted)" stroke="var(--border-strong)" strokeWidth="1.5" />
            <g>
              {cores.map((i) => {
                const row = Math.floor(i / 4);
                const col = i % 4;
                const lit = i < cells;
                return (
                  <rect
                    key={i}
                    x={35 + col * 12.5}
                    y={35 + row * 12.5}
                    width="9"
                    height="9"
                    rx="2"
                    fill={lit ? (i % 5 === 2 ? "var(--accent)" : "var(--green)") : "var(--hairline)"}
                    className={lit ? "dw-pcinfo-core" : undefined}
                    style={lit ? { animationDelay: `${(i * 0.09).toFixed(2)}s` } : undefined}
                  />
                );
              })}
            </g>
            <g stroke="var(--text-faint)" strokeWidth="1.4" strokeLinecap="round" opacity="0.65">
              <path d="M40 30v-8M52 30v-8M64 30v-8M76 30v-8M40 86v8M52 86v8M64 86v8M76 86v8M30 40h-8M30 52h-8M30 64h-8M30 76h-8M86 40h8M86 52h8M86 64h8M86 76h8" />
            </g>
          </svg>
        </div>
        <div className="dw-pcinfo-hero-main">
          <div className="dw-pcinfo-title-lg">{orDash(cpu.name)}</div>
          <div className="dw-pcinfo-subtle">
            {orDash(cpu.vendor)} · {orDash(cpu.socket)}
          </div>
          <div className="dw-pcinfo-stats">
            <Stat value={cpu.physicalCores ? Math.round(cpu.physicalCores * ep) : "—"} label={t("dashboard.pcInfoField.cores")} />
            <Stat value={cpu.logicalProcessors ? Math.round(cpu.logicalProcessors * ep) : "—"} label={t("dashboard.pcInfoField.threads")} />
            <Stat value={maxGhz ? (maxGhz * ep).toFixed(1) : "—"} label={t("dashboard.pcInfoLabel.maxGhz")} accent />
          </div>
        </div>
      </div>
      <div className="dw-pcinfo-panel">
        <div className="dw-pcinfo-panel-head">
          <span className="dw-pcinfo-panel-title">{t("dashboard.pcInfoLabel.liveLoad")}</span>
          <span className="dw-pcinfo-panel-metric">
            {usage.live && cpuLoad !== undefined ? `${Math.round(cpuLoad)}%` : "—"}
          </span>
        </div>
        <Sparkline values={usage.cpuHistory} max={100} color="var(--accent)" fillId="dw-pcinfo-cpu-fill" />
        <div className="dw-pcinfo-panel-foot">
          <span>L2 {formatBytes(cpu.l2CacheBytes)}</span>
          <span>L3 {formatBytes(cpu.l3CacheBytes)}</span>
          <span>{cpu.addressWidthBits ? `${cpu.addressWidthBits}-bit` : "—"}</span>
        </div>
      </div>
    </div>
  );
}

function MemorySection({
  snapshot,
  usage,
  progress,
}: {
  snapshot: PcInfoSnapshot;
  usage: HostUsageHistory;
  progress: number;
}) {
  const { t } = useTranslation();
  const ep = ease(progress);
  const { memory } = snapshot;
  const used = usage.live ? usage.ramPercent : memory.usedPercent;
  const totalGb = gigabytes(memory.totalBytes);
  const freeGb = gigabytes(memory.availableBytes);
  const sticks = memory.modules.length > 0 ? memory.modules : [];
  const firstModule = memory.modules[0];
  const spec =
    firstModule?.memoryType || firstModule?.speedMhz
      ? `${orDash(firstModule?.memoryType)} · ${formatMhz(firstModule?.speedMhz)}`
      : "—";
  const slots = memory.slotsTotal
    ? t("dashboard.pcInfoSlotsValue", {
        used: memory.slotsUsed ?? memory.modules.length,
        total: memory.slotsTotal,
      })
    : memory.slotsUsed
      ? String(memory.slotsUsed)
      : "—";
  return (
    <div className="dw-pcinfo-section">
      <div className="dw-pcinfo-hero">
        <div className="dw-pcinfo-bigring dw-pcinfo-bigring-sm">
          <Ring size={116} radius={46} stroke={9} color="var(--green)" fraction={(pct(used) / 100) * ep} />
          <div className="dw-pcinfo-bigring-center">
            <span className="dw-pcinfo-bigring-value">
              {used !== undefined && used !== null ? `${Math.round(used * ep)}%` : "—"}
            </span>
            <span className="dw-pcinfo-bigring-unit">{t("dashboard.pcInfoLabel.inUse")}</span>
          </div>
        </div>
        <div className="dw-pcinfo-hero-main">
          <div className="dw-pcinfo-stats">
            <Stat value={totalGb !== null ? Math.round(totalGb * ep) : "—"} label={t("dashboard.pcInfoLabel.gbTotal")} />
            <Stat value={freeGb !== null ? Math.round(freeGb * ep) : "—"} label={t("dashboard.pcInfoLabel.gbFree")} accent />
          </div>
          {sticks.length > 0 ? (
            <div className="dw-pcinfo-sticks">
              {sticks.map((module, index) => (
                <div className="dw-pcinfo-stick" key={module.slot ?? index}>
                  <div className="dw-pcinfo-stick-body">
                    <div className="dw-pcinfo-stick-fill" style={{ height: `${Math.round(ep * 100)}%` }} />
                    <div className="dw-pcinfo-stick-pins">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <span className="dw-pcinfo-stick-cap">{formatBytes(module.capacityBytes)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="dw-pcinfo-rows">
        <KeyRow label={t("dashboard.pcInfoLabel.typeSpeed")} value={<span className="dw-pcinfo-mono">{spec}</span>} />
        <KeyRow
          label={t("dashboard.pcInfoField.manufacturer")}
          value={<span className="dw-pcinfo-mono">{orDash(firstModule?.manufacturer)}</span>}
        />
        <KeyRow label={t("dashboard.pcInfoLabel.slotsPopulated")} value={<span className="dw-pcinfo-mono">{slots}</span>} />
      </div>
    </div>
  );
}

function MotherboardSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  const { motherboard: mb, system } = snapshot;
  const rows: Array<[string, ReactNode]> = [
    [t("dashboard.pcInfoField.pcModel"), orDash(formatPcModel(system))],
    [t("dashboard.pcInfoField.manufacturer"), orDash(system.manufacturer ?? mb.manufacturer)],
    [t("dashboard.pcInfoField.family"), orDash(system.family)],
    [t("dashboard.pcInfoField.product"), orDash(mb.product)],
    [t("dashboard.pcInfoField.version"), orDash(mb.version)],
    [
      t("dashboard.pcInfoField.bios"),
      mb.biosVendor || mb.biosVersion ? `${orDash(mb.biosVendor)} ${orDash(mb.biosVersion)}`.trim() : "—",
    ],
    [t("dashboard.pcInfoField.date"), orDash(mb.biosDate)],
    [t("dashboard.pcInfoField.serialNumber"), orDash(system.serialNumber ?? mb.serialNumber)],
    [t("dashboard.pcInfoField.systemType"), orDash(system.systemType ?? mb.systemType)],
    [t("dashboard.pcInfoField.chassis"), orDash(system.chassisType ?? mb.chassisType)],
    [t("dashboard.pcInfoField.systemSku"), orDash(system.sku ?? mb.systemSku)],
    [t("dashboard.pcInfoField.systemUuid"), orDash(system.uuid ?? mb.systemUuid)],
  ];
  return (
    <div className="dw-pcinfo-section dw-pcinfo-split">
      <div className="dw-pcinfo-illu dw-pcinfo-illu-board" aria-hidden="true">
        <svg viewBox="0 0 134 128" className="dw-pcinfo-illu-svg">
          <rect x="6" y="6" width="122" height="116" rx="10" fill="var(--surface-muted)" stroke="var(--border-strong)" strokeWidth="1.5" />
          <rect x="20" y="20" width="40" height="40" rx="5" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
          <rect x="29" y="29" width="22" height="22" rx="3" fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="var(--accent)" strokeWidth="1.2" />
          <g fill="none" stroke="var(--text-faint)" strokeWidth="1.4">
            <rect x="74" y="18" width="48" height="5" rx="2" />
            <rect x="74" y="26" width="48" height="5" rx="2" />
            <rect x="74" y="34" width="48" height="5" rx="2" />
            <rect x="74" y="42" width="48" height="5" rx="2" />
          </g>
          <rect x="92" y="92" width="26" height="20" rx="3" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.3" />
          <text x="105" y="105" fontSize="7" fill="var(--text-muted)" textAnchor="middle">
            BIOS
          </text>
          <rect x="18" y="100" width="56" height="6" rx="2" fill="none" stroke="var(--text-faint)" strokeWidth="1.4" />
          <g fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="6 5" opacity="0.75" className="dw-pcinfo-trace">
            <path d="M60 40h10M70 40v34h-8M40 60v30M40 90h-22" />
          </g>
        </svg>
      </div>
      <div className="dw-pcinfo-rows">
        {rows.map(([label, value]) => (
          <KeyRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

// Software/indirect display adapters (Remote Desktop, virtual KVM/streaming
// drivers, hypervisor framebuffers) are not real graphics hardware, so they are
// hidden from the GPU section.
function isVirtualGpu(gpu: PcInfoSnapshot["graphics"][number]): boolean {
  const haystack = `${gpu.name ?? ""} ${gpu.vendor ?? ""} ${gpu.chip ?? ""}`.toLowerCase();
  return /virtual|basic (?:display|render)|microsoft basic|remote display|indirect display|\bidd\b|displaylink|spacedesk|parsec|citrix|vmware|virtualbox|\brdp\b|mirage|sunshine|duet display/.test(
    haystack,
  );
}

// Sort weight so discrete GPUs come before integrated/embedded ones: 0 discrete,
// 1 unknown, 2 integrated. Name keywords decide first; a card with >= 2 GB of
// dedicated VRAM is treated as discrete when the name is ambiguous.
function gpuRank(gpu: PcInfoSnapshot["graphics"][number]): number {
  const haystack = `${gpu.name ?? ""} ${gpu.chip ?? ""}`.toLowerCase();
  if (
    /geforce|\brtx\b|\bgtx\b|quadro|tesla|titan|radeon (?:rx|pro)|\brx ?\d|\bmx ?\d{3}|firepro|\barc\b|instinct/.test(
      haystack,
    )
  ) {
    return 0;
  }
  if (/uhd|\bhd graphics|iris|integrated|\bvega\b|apple m\d|radeon graphics|aspeed|matrox/.test(haystack)) {
    return 2;
  }
  return (gpu.vramBytes ?? 0) >= 2 * 1024 ** 3 ? 0 : 1;
}

// Hide virtual adapters (unless every GPU is virtual — then show them so the
// section is not empty) and order discrete cards before embedded ones, keeping
// the original order as a stable tie-breaker.
function orderGpus(
  list: PcInfoSnapshot["graphics"],
): PcInfoSnapshot["graphics"] {
  const real = list.filter((gpu) => !isVirtualGpu(gpu));
  const base = real.length > 0 ? real : list;
  return base
    .map((gpu, index) => ({ gpu, index }))
    .sort((a, b) => gpuRank(a.gpu) - gpuRank(b.gpu) || a.index - b.index)
    .map((entry) => entry.gpu);
}

function GraphicsSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  const gpus = orderGpus(snapshot.graphics);
  const gpu = gpus[0];
  const others = gpus.slice(1);
  if (!gpu && snapshot.displays.length === 0) {
    return (
      <div className="dw-pcinfo-section">
        <EmptyHint />
      </div>
    );
  }
  return (
    <div className="dw-pcinfo-section">
      <div className="dw-pcinfo-hero">
        <div className="dw-pcinfo-illu dw-pcinfo-illu-gpu" aria-hidden="true">
          <svg viewBox="0 0 130 100" className="dw-pcinfo-illu-svg">
            <rect x="8" y="20" width="114" height="56" rx="8" fill="var(--surface-muted)" stroke="var(--border-strong)" strokeWidth="1.5" />
            <rect x="8" y="76" width="14" height="14" rx="2" fill="var(--surface-muted)" stroke="var(--border-strong)" strokeWidth="1.3" />
            <rect x="40" y="76" width="14" height="14" rx="2" fill="var(--surface-muted)" stroke="var(--border-strong)" strokeWidth="1.3" />
            <g className="dw-pcinfo-fan" style={{ transformOrigin: "40px 48px" }}>
              <circle cx="40" cy="48" r="17" fill="none" stroke="var(--border-strong)" strokeWidth="1.3" />
              <path d="M40 48 L40 33 M40 48 L53 56 M40 48 L27 56" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </g>
            <g className="dw-pcinfo-fan dw-pcinfo-fan-slow" style={{ transformOrigin: "90px 48px" }}>
              <circle cx="90" cy="48" r="17" fill="none" stroke="var(--border-strong)" strokeWidth="1.3" />
              <path d="M90 48 L90 33 M90 48 L103 56 M90 48 L77 56" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </div>
        <div className="dw-pcinfo-hero-main">
          <div className="dw-pcinfo-title-lg">{orDash(gpu?.name)}</div>
          <div className="dw-pcinfo-subtle">
            {orDash(gpu?.vendor)}
            {gpu?.driverVersion ? ` · ${t("dashboard.pcInfoField.driver")} ${gpu.driverVersion}` : ""}
          </div>
          <div className="dw-pcinfo-vram">
            <span className="dw-pcinfo-vram-value">{formatBytes(gpu?.vramBytes)}</span>
            <span className="dw-pcinfo-vram-label">{t("dashboard.pcInfoField.vram")}</span>
          </div>
        </div>
      </div>
      {others.length > 0 ? (
        <div className="dw-pcinfo-drives">
          {others.map((other, index) => (
            <div className="dw-pcinfo-drive" key={other.name ?? index}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="6" width="18" height="9" rx="2" />
                <path d="M9.5 10.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0M6 15v4M18 15v4" />
              </svg>
              <div className="dw-pcinfo-drive-text">
                <span className="dw-pcinfo-drive-name">{orDash(other.name)}</span>
                <span className="dw-pcinfo-drive-sub">
                  {orDash(other.vendor)}
                  {other.driverVersion ? ` · ${t("dashboard.pcInfoField.driver")} ${other.driverVersion}` : ""}
                </span>
              </div>
              <span className="dw-pcinfo-mono dw-pcinfo-drive-size">{formatBytes(other.vramBytes)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {snapshot.displays.length > 0 ? (
        <>
          <div className="dw-pcinfo-panel-title dw-pcinfo-block-title">{t("dashboard.pcInfoField.displays")}</div>
          <div className="dw-pcinfo-display-grid">
            {snapshot.displays.map((display, index) => (
              <div className="dw-pcinfo-display" key={display.name ?? index}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M9 20h6M12 16v4" />
                </svg>
                <div className="dw-pcinfo-display-text">
                  <span className="dw-pcinfo-display-name">{orDash(display.name)}</span>
                  <span className="dw-pcinfo-mono dw-pcinfo-display-sub">{describeDisplay(display)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function describeDisplay(display: PcInfoSnapshot["displays"][number]): string {
  const parts: string[] = [];
  if (display.resolution?.trim()) {
    parts.push(`${display.resolution.trim()}${display.refreshHz ? ` @ ${display.refreshHz} Hz` : ""}`);
  }
  if (display.sizeInches) {
    parts.push(`${display.sizeInches}"`);
  }
  if (display.year) {
    parts.push(String(display.year));
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function StorageSection({ snapshot, progress }: { snapshot: PcInfoSnapshot; progress: number }) {
  const { t } = useTranslation();
  const ep = ease(progress);
  if (snapshot.storage.length === 0 && snapshot.volumes.length === 0) {
    return (
      <div className="dw-pcinfo-section">
        <EmptyHint />
      </div>
    );
  }
  const palette = ["var(--accent)", "var(--green)", "var(--amber)"];
  return (
    <div className="dw-pcinfo-section">
      {snapshot.volumes.length > 0 ? (
        <div className="dw-pcinfo-vol-grid">
          {snapshot.volumes.map((volume, index) => {
            const total = volume.totalBytes ?? 0;
            const free = volume.freeBytes ?? 0;
            const usedFrac = total > 0 ? (total - free) / total : 0;
            const color = palette[index % palette.length];
            return (
              <div className="dw-pcinfo-vol" key={volume.mount ?? index}>
                <div className="dw-pcinfo-vol-ring">
                  <Ring size={84} radius={34} stroke={8} color={color} fraction={usedFrac * ep} />
                  <div className="dw-pcinfo-vol-center">
                    <span className="dw-pcinfo-vol-mount">{orDash(volume.mount)}</span>
                    <span className="dw-pcinfo-mono dw-pcinfo-vol-pct">{Math.round(usedFrac * 100 * ep)}%</span>
                  </div>
                </div>
                <span className="dw-pcinfo-vol-label">{orDash(volume.label)}</span>
                <span className="dw-pcinfo-mono dw-pcinfo-vol-sub">
                  {t("dashboard.pcInfoLabel.freeOfTotal", {
                    free: formatBytes(volume.freeBytes),
                    total: formatBytes(volume.totalBytes),
                  })}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      {snapshot.storage.length > 0 ? (
        <div className="dw-pcinfo-drives">
          {snapshot.storage.map((disk, index) => (
            <div className="dw-pcinfo-drive" key={disk.serialNumber ?? disk.model ?? index}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="7" rx="2" />
                <rect x="3" y="13" width="18" height="7" rx="2" />
                <path d="M7 7.5h.01M7 16.5h.01" />
              </svg>
              <div className="dw-pcinfo-drive-text">
                <span className="dw-pcinfo-drive-name">{orDash(disk.model)}</span>
                <span className="dw-pcinfo-drive-sub">
                  {orDash(disk.mediaType)} · {orDash(disk.interface)}
                </span>
              </div>
              <span className="dw-pcinfo-mono dw-pcinfo-drive-size">{formatBytes(disk.sizeBytes)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isWifi(adapter: PcInfoSnapshot["network"][number]): boolean {
  const haystack = `${adapter.name ?? ""} ${adapter.adapterType ?? ""}`.toLowerCase();
  return /wi-?fi|wireless|802\.11/.test(haystack);
}

function NetworkSection({
  snapshot,
  usage,
}: {
  snapshot: PcInfoSnapshot;
  usage: HostUsageHistory;
}) {
  const { t } = useTranslation();
  if (snapshot.network.length === 0) {
    return (
      <div className="dw-pcinfo-section">
        {usage.live ? <LiveThroughput usage={usage} /> : null}
        <EmptyHint />
      </div>
    );
  }
  return (
    <div className="dw-pcinfo-section dw-pcinfo-net">
      {usage.live ? <LiveThroughput usage={usage} /> : null}
      {snapshot.network.map((adapter, index) => {
        const wifi = isWifi(adapter);
        const ip = adapter.ipAddresses[0];
        return (
          <div className="dw-pcinfo-adapter" key={adapter.macAddress ?? adapter.name ?? index}>
            <div className="dw-pcinfo-adapter-head">
              <span className="dw-pcinfo-adapter-icon" aria-hidden="true">
                {wifi ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path className="dw-pcinfo-wifi" style={{ animationDelay: "0.3s" }} d="M5 12.5a10 10 0 0 1 14 0" />
                    <path className="dw-pcinfo-wifi" style={{ animationDelay: "0.15s" }} d="M8 15.5a6 6 0 0 1 8 0" />
                    <path className="dw-pcinfo-wifi" d="M12 18.5h.01" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="9" width="16" height="11" rx="2" />
                    <path d="M8 9V6h8v3M8 13v3M12 13v3M16 13v3" />
                  </svg>
                )}
              </span>
              <div className="dw-pcinfo-adapter-id">
                <span className="dw-pcinfo-adapter-name">{orDash(adapter.name)}</span>
                <span className="dw-pcinfo-adapter-type">{orDash(adapter.adapterType)}</span>
              </div>
              <div className="dw-pcinfo-adapter-speed">
                <span className={`dw-pcinfo-dot${adapter.connected ? " is-on" : ""}`} aria-hidden="true" />
                <span className="dw-pcinfo-mono">{formatBitsPerSecond(adapter.speedBitsPerSecond)}</span>
              </div>
            </div>
            <div className="dw-pcinfo-packet" aria-hidden="true">
              <span className="dw-pcinfo-packet-line" />
              <span className="dw-pcinfo-packet-dot" style={{ animationDelay: `${(index * 0.7).toFixed(1)}s` }} />
            </div>
            <div className="dw-pcinfo-adapter-foot">
              <span className="dw-pcinfo-mono">
                {t("dashboard.pcInfoField.ipAddresses")} <span className="dw-pcinfo-strong">{ip ?? "—"}</span>
              </span>
              <span className="dw-pcinfo-mono dw-pcinfo-muted">{orDash(adapter.macAddress)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveThroughput({ usage }: { usage: HostUsageHistory }) {
  const { t } = useTranslation();
  const max = Math.max(...usage.netHistory, 1);
  return (
    <div className="dw-pcinfo-throughput">
      <div className="dw-pcinfo-throughput-head">
        <span className="dw-pcinfo-panel-title">{t("dashboard.pcInfoLabel.liveThroughput")}</span>
        <span className="dw-pcinfo-mono dw-pcinfo-throughput-rate">
          ↓ {formatRate(usage.downBytesPerSecond)} · ↑ {formatRate(usage.upBytesPerSecond)}
        </span>
      </div>
      <Sparkline values={usage.netHistory} max={max} color="var(--green)" fillId="dw-pcinfo-net-fill" />
    </div>
  );
}

function formatRate(bytesPerSecond: number | undefined): string {
  if (bytesPerSecond === undefined || !Number.isFinite(bytesPerSecond)) {
    return "—";
  }
  const mb = bytesPerSecond / 1_000_000;
  if (mb < 0.1) {
    return `${Math.round(bytesPerSecond / 1000)} KB/s`;
  }
  if (mb < 10) {
    return `${mb.toFixed(1)} MB/s`;
  }
  return `${Math.round(mb)} MB/s`;
}

function AudioSection({ snapshot }: { snapshot: PcInfoSnapshot }) {
  const { t } = useTranslation();
  if (snapshot.audio.length === 0) {
    return (
      <div className="dw-pcinfo-section">
        <EmptyHint />
      </div>
    );
  }
  const bars = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div className="dw-pcinfo-section dw-pcinfo-split">
      <div className="dw-pcinfo-eq" aria-hidden="true">
        {bars.map((i) => (
          <span
            key={i}
            className="dw-pcinfo-eq-bar"
            style={{
              animationDuration: `${(0.7 + (i % 3) * 0.25).toFixed(2)}s`,
              animationDelay: `${(i * 0.11).toFixed(2)}s`,
            }}
          />
        ))}
      </div>
      <div className="dw-pcinfo-rows dw-pcinfo-rows-grow">
        <div className="dw-pcinfo-panel-title dw-pcinfo-block-title">{t("dashboard.pcInfoLabel.audioDevices")}</div>
        {snapshot.audio.map((device, index) => (
          <KeyRow key={device.name ?? index} label={orDash(device.name)} value={orDash(device.manufacturer)} />
        ))}
      </div>
    </div>
  );
}

function BatterySection({ snapshot, progress }: { snapshot: PcInfoSnapshot; progress: number }) {
  const { t } = useTranslation();
  const ep = ease(progress);
  if (snapshot.battery.length === 0) {
    return (
      <div className="dw-pcinfo-section">
        <EmptyHint />
      </div>
    );
  }
  return (
    <div className="dw-pcinfo-section">
      {snapshot.battery.map((battery, index) => {
        const charge = battery.chargePercent;
        return (
          <div className="dw-pcinfo-hero" key={battery.name ?? index}>
            <div className="dw-pcinfo-bigring dw-pcinfo-bigring-sm">
              <Ring size={116} radius={46} stroke={9} color="var(--green)" fraction={(pct(charge) / 100) * ep} />
              <div className="dw-pcinfo-bigring-center">
                <span className="dw-pcinfo-bigring-value">
                  {charge !== undefined && charge !== null ? `${Math.round(charge * ep)}%` : "—"}
                </span>
                <span className="dw-pcinfo-bigring-unit">{orDash(battery.status)}</span>
              </div>
            </div>
            <div className="dw-pcinfo-rows dw-pcinfo-rows-grow">
              <KeyRow label={t("dashboard.pcInfoField.name")} value={orDash(battery.name)} />
              <KeyRow
                label={t("dashboard.pcInfoField.wear")}
                value={
                  battery.wearPercent !== null && battery.wearPercent !== undefined
                    ? `${Math.round(battery.wearPercent)}%`
                    : "—"
                }
              />
              <KeyRow
                label={t("dashboard.pcInfoField.designCapacity")}
                value={battery.designCapacityMwh ? `${battery.designCapacityMwh} mWh` : "—"}
              />
              <KeyRow
                label={t("dashboard.pcInfoField.fullCapacity")}
                value={battery.fullChargeCapacityMwh ? `${battery.fullChargeCapacityMwh} mWh` : "—"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
