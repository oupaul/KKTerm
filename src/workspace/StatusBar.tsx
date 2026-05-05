import { HardDrive } from "lucide-react";
import { useWorkspaceStore } from "../store";

const PERFORMANCE_BUDGETS = {
  frontendReadyMs: 1_000,
  localTerminalReadyMs: 100,
  sshTerminalReadyMs: 150,
  idleMemoryBytes: 150 * 1024 * 1024,
} as const;

export function StatusBar() {
  const performanceMetrics = useWorkspaceStore((state) => state.performanceMetrics);
  const launchLabel = performanceMetrics.frontendLaunchMs
    ? `UI ready ${formatDuration(performanceMetrics.frontendLaunchMs)}`
    : "UI timing pending";
  const localSessionLabel = performanceMetrics.lastLocalTerminalStart
    ? `Local ready ${formatDuration(performanceMetrics.lastLocalTerminalStart.durationMs)}`
    : "Local timing pending";
  const sshSessionLabel = performanceMetrics.lastSshTerminalStart
    ? `SSH ready ${formatDuration(performanceMetrics.lastSshTerminalStart.durationMs)}`
    : "SSH timing pending";
  const memoryLabel = performanceMetrics.workingSetBytes
    ? `Memory ${formatBytes(performanceMetrics.workingSetBytes)}`
    : "Memory pending";

  return (
    <footer className="status-bar">
      <span>
        <HardDrive size={13} />
        Local-first
      </span>
      <span>Telemetry off</span>
      <span
        className={budgetClass(performanceMetrics.frontendLaunchMs, PERFORMANCE_BUDGETS.frontendReadyMs)}
        title={`Budget: <= ${formatDuration(PERFORMANCE_BUDGETS.frontendReadyMs)} to usable UI`}
      >
        {launchLabel}
      </span>
      <span
        className={budgetClass(
          performanceMetrics.lastLocalTerminalStart?.durationMs,
          PERFORMANCE_BUDGETS.localTerminalReadyMs,
        )}
        title={`Budget: <= ${formatDuration(PERFORMANCE_BUDGETS.localTerminalReadyMs)} for new local terminal tabs`}
      >
        {localSessionLabel}
      </span>
      <span
        className={budgetClass(
          performanceMetrics.lastSshTerminalStart?.durationMs,
          PERFORMANCE_BUDGETS.sshTerminalReadyMs,
        )}
        title={`Budget: <= ${formatDuration(PERFORMANCE_BUDGETS.sshTerminalReadyMs)} after SSH authentication, excluding network time`}
      >
        {sshSessionLabel}
      </span>
      <span
        className={budgetClass(
          performanceMetrics.workingSetBytes,
          PERFORMANCE_BUDGETS.idleMemoryBytes,
        )}
        title={`${performanceMetrics.memorySource ?? "Memory source pending"} | Budget: <= ${formatBytes(
          PERFORMANCE_BUDGETS.idleMemoryBytes,
        )} idle working set`}
      >
        {memoryLabel}
      </span>
    </footer>
  );
}

function budgetClass(value: number | undefined, budget: number) {
  if (value === undefined) {
    return "metric-pending";
  }

  return value <= budget ? "metric-ok" : "metric-over";
}

function formatDuration(durationMs: number) {
  return durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}

function formatBytes(bytes: number) {
  const mib = bytes / (1024 * 1024);
  return `${mib.toFixed(mib >= 100 ? 0 : 1)} MiB`;
}
