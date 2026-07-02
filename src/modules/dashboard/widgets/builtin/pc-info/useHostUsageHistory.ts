import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../../../../../store";

// Rolling history length for the sparklines. The status-bar monitor samples at
// the user's configured interval, so this is "last N samples" rather than a
// fixed time window.
const HISTORY_LENGTH = 48;

export interface HostUsageHistory {
  /** True only while the toolbar host-usage monitor is actually feeding data. */
  live: boolean;
  cpuPercent?: number;
  ramPercent?: number;
  downBytesPerSecond?: number;
  upBytesPerSecond?: number;
  /** Most recent CPU-load samples (0–100), oldest first. */
  cpuHistory: number[];
  /** Most recent combined network throughput samples (bytes/s), oldest first. */
  netHistory: number[];
}

const EMPTY: HostUsageHistory = {
  live: false,
  cpuHistory: [],
  netHistory: [],
};

/**
 * Consume the existing toolbar host-usage monitor (no new data pipe). The
 * snapshot lives in `performanceMetrics.hostUsage` and is refreshed by
 * `useHostUsagePolling` at the user's `statusBarMonitorIntervalSeconds`, gated on
 * the status-bar monitor being enabled. When the monitor is off there is no live
 * data, so this hook reports `live: false` and an empty history; the widget then
 * falls back to static snapshot values.
 */
export function useHostUsageHistory(): HostUsageHistory {
  const hostUsage = useWorkspaceStore((state) => state.performanceMetrics.hostUsage);
  const statusBarEnabled = useWorkspaceStore((state) => state.generalSettings.statusBarEnabled);
  const statusBarMonitorEnabled = useWorkspaceStore(
    (state) => state.generalSettings.statusBarMonitorEnabled,
  );

  const live = Boolean(statusBarEnabled && statusBarMonitorEnabled && hostUsage);

  const [history, setHistory] = useState<{ cpu: number[]; net: number[] }>({
    cpu: [],
    net: [],
  });
  // Track the last sample we appended so re-renders that do not carry a new
  // sample (e.g. unrelated store updates) do not duplicate points.
  const lastSampleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!live || !hostUsage) {
      lastSampleRef.current = null;
      setHistory((prev) => (prev.cpu.length === 0 && prev.net.length === 0 ? prev : { cpu: [], net: [] }));
      return;
    }
    if (lastSampleRef.current === hostUsage.sampledAtUnixSeconds) {
      return;
    }
    lastSampleRef.current = hostUsage.sampledAtUnixSeconds;
    const cpu = clampPercent(hostUsage.cpuPercent);
    const net =
      (hostUsage.networkDownstreamBytesPerSecond ?? 0) +
      (hostUsage.networkUpstreamBytesPerSecond ?? 0);
    setHistory((prev) => ({
      cpu: pushCapped(prev.cpu, cpu),
      net: pushCapped(prev.net, net),
    }));
  }, [live, hostUsage]);

  if (!live || !hostUsage) {
    return EMPTY;
  }

  return {
    live: true,
    cpuPercent: hostUsage.cpuPercent,
    ramPercent: hostUsage.ramPercent,
    downBytesPerSecond: hostUsage.networkDownstreamBytesPerSecond,
    upBytesPerSecond: hostUsage.networkUpstreamBytesPerSecond,
    cpuHistory: history.cpu,
    netHistory: history.net,
  };
}

function pushCapped(arr: number[], value: number): number[] {
  const next = arr.length >= HISTORY_LENGTH ? arr.slice(arr.length - HISTORY_LENGTH + 1) : arr.slice();
  next.push(value);
  return next;
}

function clampPercent(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}
