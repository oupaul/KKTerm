import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Play, Square } from "../../../../../lib/reicon";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../../lib/inputBehavior";
import { invokeCommand, isTauriRuntime } from "../../../../../lib/tauri";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import {
  formatMs,
  formatPercent,
  parsePingTargets,
  summarizePingReplies,
  type PingReplyLike,
} from "./pingTool";

interface PingConfig {
  targetsText: string;
  durationSeconds: number;
  intervalMs: number;
}

type HostRun = {
  host: string;
  subscriptionId: string;
  replies: PingReplyLike[];
  done: boolean;
  error: string | null;
};

type NetEvent = {
  subscriptionId: string;
  kind: "event" | "done";
  payload?: PingReplyLike;
  ok?: boolean;
  error?: unknown;
};

const DEFAULT_CONFIG: PingConfig = {
  targetsText: "1.1.1.1\n8.8.8.8",
  durationSeconds: 10,
  intervalMs: 1000,
};

function storageKey(instanceId: string) {
  return `kkterm.dashboard.pingTool.${instanceId}.v1`;
}

function normalizeConfig(value: unknown): PingConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<PingConfig>;
  return {
    targetsText: typeof candidate.targetsText === "string" ? candidate.targetsText : "",
    durationSeconds: clampNumber(candidate.durationSeconds, 1, 3600, DEFAULT_CONFIG.durationSeconds),
    intervalMs: clampNumber(candidate.intervalMs, 250, 60000, DEFAULT_CONFIG.intervalMs),
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function pingCount(durationSeconds: number, intervalMs: number) {
  return Math.max(1, Math.min(256, Math.ceil((durationSeconds * 1000) / intervalMs)));
}

export function PingToolBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const [runs, setRuns] = useState<HostRun[]>([]);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const activeSubscriptionIdsRef = useRef<string[]>([]);
  const running = runs.some((run) => !run.done);
  const parsed = useMemo(() => parsePingTargets(config.targetsText), [config.targetsText]);

  useEffect(
    () => () => {
      for (const subscriptionId of activeSubscriptionIdsRef.current) {
        void invokeCommand("network_stream_cancel", { subscriptionId }).catch(() => undefined);
      }
      unlistenRef.current?.();
    },
    [],
  );

  async function start() {
    if (!isTauriRuntime() || parsed.targets.length === 0 || running) return;
    const startedAt = Date.now();
    const nextRuns = parsed.targets.map((target, index) => ({
      host: target.host,
      subscriptionId: `ping-${instance.id}-${startedAt}-${index}`,
      replies: [],
      done: false,
      error: null,
    }));
    activeSubscriptionIdsRef.current = nextRuns.map((run) => run.subscriptionId);
    setRuns(nextRuns);
    unlistenRef.current?.();
    unlistenRef.current = await listen<NetEvent>("net://event", (event) => {
      const payload = event.payload;
      setRuns((current) =>
        current.map((run) => {
          if (run.subscriptionId !== payload.subscriptionId) return run;
          if (payload.kind === "event" && payload.payload) {
            return { ...run, replies: [...run.replies, payload.payload] };
          }
          if (payload.kind === "done") {
            return { ...run, done: true, error: payload.ok === false ? stringifyNetError(payload.error) : null };
          }
          return run;
        }),
      );
    });
    for (const target of nextRuns) {
      void invokeCommand("network_ping_start", {
        args: {
          subscriptionId: target.subscriptionId,
          host: target.host,
          count: pingCount(config.durationSeconds, config.intervalMs),
          intervalMs: config.intervalMs,
        },
      }).catch((error) => {
        setRuns((current) =>
          current.map((run) =>
            run.subscriptionId === target.subscriptionId
              ? { ...run, done: true, error: error instanceof Error ? error.message : String(error) }
              : run,
          ),
        );
      });
    }
  }

  async function stop() {
    const activeRuns = runs.filter((run) => !run.done);
    for (const run of activeRuns) {
      void invokeCommand("network_stream_cancel", { subscriptionId: run.subscriptionId }).catch(
        () => undefined,
      );
    }
    activeSubscriptionIdsRef.current = [];
    unlistenRef.current?.();
    unlistenRef.current = null;
    setRuns((current) => current.map((run) => ({ ...run, done: true })));
  }

  return (
    <div className="dw-ping">
      <textarea
        className="dw-ping-targets"
        value={config.targetsText}
        onChange={(event) => setConfig({ ...config, targetsText: event.currentTarget.value })}
        placeholder={t("dashboard.pingTargetsPlaceholder")}
        aria-label={t("dashboard.pingTargetsLabel")}
        rows={3}
        {...technicalInputProps}
      />
      <div className="dw-ping-controls">
        <label>
          <span>{t("dashboard.pingDuration")}</span>
          <input
            type="number"
            min={1}
            max={3600}
            value={config.durationSeconds}
            onChange={(event) =>
              setConfig({ ...config, durationSeconds: Number(event.currentTarget.value) })
            }
          />
        </label>
        <label>
          <span>{t("dashboard.pingInterval")}</span>
          <input
            type="number"
            min={250}
            max={60000}
            step={250}
            value={config.intervalMs}
            onChange={(event) =>
              setConfig({ ...config, intervalMs: Number(event.currentTarget.value) })
            }
          />
        </label>
        <button
          type="button"
          className="secondary-button dw-ping-action"
          disabled={!isTauriRuntime() || parsed.targets.length === 0}
          onClick={() => (running ? void stop() : void start())}
        >
          {running ? <Square size={12} /> : <Play size={12} />}
          {running ? t("dashboard.pingStop") : t("dashboard.pingStart")}
        </button>
      </div>
      <div className="dw-ping-meta">
        {parsed.truncated
          ? t("dashboard.pingTargetCountCapped", { count: parsed.targets.length })
          : t("dashboard.pingTargetCount", { count: parsed.targets.length })}
      </div>
      <div className="dw-ping-results">
        {runs.length > 0 ? (
          runs.map((run) => <PingRunRow key={run.subscriptionId} run={run} />)
        ) : (
          <div className="dw-ping-empty">
            {isTauriRuntime() ? t("dashboard.pingHint") : t("dashboard.pingDesktopOnly")}
          </div>
        )}
      </div>
    </div>
  );
}

function PingRunRow({ run }: { run: HostRun }) {
  const { t } = useTranslation();
  const summary = summarizePingReplies(run.replies);
  return (
    <div className="dw-ping-row">
      <div className="dw-ping-host">
        <span>{run.host}</span>
        <span>{run.done ? t("dashboard.pingDone") : t("dashboard.pingRunning")}</span>
      </div>
      <div className="dw-ping-stats">
        <span>{formatMs(summary.currentMs)}</span>
        <span>{formatMs(summary.averageMs)}</span>
        <span>{formatPercent(summary.packetLossPercent)}</span>
      </div>
      <div className="dw-ping-labels">
        <span>{t("dashboard.pingCurrent")}</span>
        <span>{t("dashboard.pingAverage")}</span>
        <span>{t("dashboard.pingLoss")}</span>
      </div>
      {run.error ? <div className="dw-ping-error">{run.error}</div> : null}
    </div>
  );
}

function stringifyNetError(error: unknown) {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "reason" in error && typeof error.reason === "string") {
    return error.reason;
  }
  return JSON.stringify(error);
}
