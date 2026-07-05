import { useTranslation } from "react-i18next";
import { Eye, CheckCircle2, AlertTriangle } from "../lib/reicon";
import {
  useWatchdogStore,
  useWatchdogSubscription,
  useWatchdogSummariesSorted,
} from "./store";
import { isTerminalState, type WatchdogState, type WatchdogSummary } from "./types";
import { WatchdogDetail } from "./WatchdogDetail";

/// Top-level. Mount inside `.status-bar-actions`. Renders nothing when no
/// watchdogs exist (active or terminal-undismissed) — keeps the status bar
/// quiet for users who don't use the feature.
export function WatchdogStatusBar() {
  useWatchdogSubscription();
  const summaries = useWatchdogSummariesSorted();
  const selectedId = useWatchdogStore((s) => s.selectedId);
  const setSelected = useWatchdogStore((s) => s.setSelected);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <>
      {summaries.map((summary) => (
        <WatchdogStatusIcon key={summary.id} summary={summary} />
      ))}
      {selectedId ? (
        <WatchdogDetail id={selectedId} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}

function WatchdogStatusIcon({ summary }: { summary: WatchdogSummary }) {
  const { t } = useTranslation();
  const setSelected = useWatchdogStore((s) => s.setSelected);
  const label = t("watchdog.openDetail", { name: summary.name });

  return (
    <button
      type="button"
      className="status-bar-action watchdog-status-button"
      aria-label={label}
      onClick={() => setSelected(summary.id)}
      title={label}
    >
      <WatchdogStateIcon state={summary.state} />
    </button>
  );
}

export function WatchdogStateIcon({ state }: { state: WatchdogState }) {
  if (state.kind === "completed") {
    return <CheckCircle2 size={14} className="watchdog-state-icon is-completed" />;
  }
  if (isTerminalState(state)) {
    return <AlertTriangle size={14} className="watchdog-state-icon is-stopped" />;
  }
  return <Eye size={14} className="watchdog-state-icon is-running" />;
}

export function WatchdogStateLabel({ state }: { state: WatchdogState }) {
  const { t } = useTranslation();
  return <>{t(`watchdog.state.${state.kind}`)}</>;
}

function formatLastValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    // Heuristics: percent-like ≤100 keeps one decimal; bigger numbers use
    // SI-ish formatting so RAM/network values stay readable.
    if (Math.abs(value) < 100) {
      return value.toFixed(1);
    }
    if (Math.abs(value) < 1_000_000) {
      return Math.round(value).toLocaleString();
    }
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (typeof value === "string") {
    return value.length > 24 ? value.slice(0, 24) + "…" : value;
  }
  return JSON.stringify(value);
}

export { formatLastValue };
