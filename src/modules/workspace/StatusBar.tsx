import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleCheck,
  CircleX,
  Coffee,
  Cpu,
  Info,
  LoaderCircle,
  MemoryStick,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RailTooltip } from "../../app/RailTooltip";
import { showNativeContextMenu } from "../../lib/nativeContextMenu";
import { AiCodingUsageStatusBar } from "../dashboard/widgets/builtin/ai-coding-usage/AiCodingUsageStatusBar";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { StatusBarNotice } from "../../types";
import { WatchdogStatusBar } from "../../watchdog/WatchdogStatusBar";

const NOTIFICATION_FADE_MS = 220;

export function StatusBar({
  onOpenAssistant,
  onOpenDashboardView,
}: {
  onOpenAssistant: () => void;
  onOpenDashboardView: (viewId: string) => void;
}) {
  const { t } = useTranslation();
  const notice = useWorkspaceStore((state) => state.statusBarNotice);
  const statusBarMonitorEnabled = useWorkspaceStore(
    (state) => state.generalSettings.statusBarMonitorEnabled,
  );
  const clearStatusBarNotice = useWorkspaceStore((state) => state.clearStatusBarNotice);
  const [renderedNotice, setRenderedNotice] = useState(notice);
  const [isNoticeExiting, setIsNoticeExiting] = useState(false);

  useEffect(() => {
    if (!notice) {
      return;
    }
    setRenderedNotice(notice);
    setIsNoticeExiting(false);
    if (notice.expiresAt === null) {
      return;
    }
    const remainingMs = Math.max(0, notice.expiresAt - Date.now());
    const fadeDelayMs = Math.max(0, remainingMs - NOTIFICATION_FADE_MS);
    const fadeTimeout = window.setTimeout(() => setIsNoticeExiting(true), fadeDelayMs);
    const clearTimeout = window.setTimeout(() => clearStatusBarNotice(notice.id), remainingMs);
    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(clearTimeout);
    };
  }, [clearStatusBarNotice, notice]);

  useEffect(() => {
    if (notice) {
      return;
    }
    if (!isNoticeExiting) {
      setRenderedNotice(undefined);
      return;
    }
    const timeout = window.setTimeout(() => {
      setRenderedNotice(undefined);
      setIsNoticeExiting(false);
    }, NOTIFICATION_FADE_MS);
    return () => window.clearTimeout(timeout);
  }, [isNoticeExiting, notice]);

  function dismissRenderedNotice() {
    const noticeId = renderedNotice?.id;
    if (!noticeId || isNoticeExiting) {
      return;
    }
    setIsNoticeExiting(true);
    window.setTimeout(() => clearStatusBarNotice(noticeId), NOTIFICATION_FADE_MS);
  }

  return (
    <footer className="status-bar" data-tutorial-id="workspace.statusBar">
      <div className={`status-bar-module ${statusBarMonitorEnabled ? "" : "metrics-disabled"}`}>
        {statusBarMonitorEnabled ? <WorkspaceHostMetrics t={t} /> : null}
        <AiCodingUsageStatusBar onOpenDashboardView={onOpenDashboardView} />
      </div>
      <div className="status-bar-notice-area">
        {renderedNotice ? (
          <StatusNoticePopup
            dismissLabel={t("app.titlebar.close")}
            isExiting={isNoticeExiting}
            notice={renderedNotice}
            onDismiss={dismissRenderedNotice}
          />
        ) : null}
      </div>
      <div className="status-bar-actions">
        <WatchdogStatusBar />
        <AssistantWorkingStatusButton onOpenAssistant={onOpenAssistant} />
        <XServerStatusIcon />
        <DontSleepStatusIcon />
      </div>
    </footer>
  );
}

function StatusNoticePopup({
  dismissLabel,
  isExiting,
  notice,
  onDismiss,
}: {
  dismissLabel: string;
  isExiting: boolean;
  notice: StatusBarNotice;
  onDismiss: () => void;
}) {
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const popup = popupRef.current;
    const bar = popup?.querySelector<HTMLElement>(".status-popup-timer i");
    if (!popup || !bar) {
      return;
    }
    bar.style.transitionDuration = "0ms";
    bar.style.transform = "scaleX(1)";
    void popup.offsetWidth;
    if (notice.expiresAt !== null) {
      bar.style.transitionDuration = `${notice.durationMs}ms`;
      bar.style.transform = "scaleX(0)";
    }
  }, [notice.durationMs, notice.expiresAt, notice.id]);

  return (
    <div
      ref={popupRef}
      className={`status-popup status-popup-pulse ${notice.tone} ${
        isExiting ? "is-exiting" : "is-entering"
      }`}
    >
      <span className="status-popup-icon" aria-hidden="true">
        <StatusNoticeIcon tone={notice.tone} />
      </span>
      <span className="status-popup-message" role="status">
        {notice.message}
      </span>
      <span className="status-popup-timer" aria-hidden="true">
        <i />
      </span>
      <button
        className="status-popup-close"
        aria-label={dismissLabel}
        onClick={onDismiss}
        type="button"
      >
        <X size={11} strokeWidth={2.6} />
      </button>
    </div>
  );
}

function StatusNoticeIcon({ tone }: { tone: "success" | "info" | "warning" | "error" }) {
  switch (tone) {
    case "success":
      return <CircleCheck size={21} strokeWidth={2.4} />;
    case "warning":
      return <TriangleAlert size={21} strokeWidth={2.2} />;
    case "error":
      return <CircleX size={21} strokeWidth={2.2} />;
    case "info":
    default:
      return <Info size={21} strokeWidth={2.2} />;
  }
}

function XServerStatusIcon() {
  const { t } = useTranslation();
  const managedXServerEnabled = useWorkspaceStore(
    (state) => state.sshSettings.managedXServerEnabled,
  );
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);

  async function restartXServer() {
    try {
      await invokeCommand("restart_ssh_x_server");
      showStatusBarNotice(t("settings.xServerLaunchStarted"), { tone: "success" });
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
  }

  async function stopXServer() {
    try {
      await invokeCommand("stop_ssh_x_server");
      showStatusBarNotice(t("app.xServerStopped"), { tone: "success" });
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
  }

  async function handleContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    await showNativeContextMenu(
      [
        {
          kind: "item",
          label: t("app.xServerRestart"),
          action: () => void restartXServer(),
        },
        {
          kind: "item",
          label: t("app.xServerStop"),
          action: () => void stopXServer(),
        },
      ],
      { x: event.clientX, y: event.clientY },
    );
  }

  if (!managedXServerEnabled) {
    return null;
  }

  return (
    <span
      className="status-bar-action status-bar-x-server-running"
      aria-label={t("app.xServer")}
      onContextMenu={(event) => void handleContextMenu(event)}
      role="status"
    >
      <span className="status-bar-x-server-glyph" aria-hidden="true">
        X
      </span>
      <RailTooltip label={t("app.xServer")} />
    </span>
  );
}

function DontSleepStatusIcon() {
  const { t } = useTranslation();
  const dontSleepEnabled = useWorkspaceStore(
    (state) => state.generalSettings.dontSleepEnabled,
  );

  if (!dontSleepEnabled) {
    return null;
  }

  return (
    <span
      className="status-bar-action status-bar-dont-sleep-enabled"
      aria-label={t("app.dontSleep")}
      role="status"
    >
      <Coffee size={14} />
      <RailTooltip label={t("app.dontSleep")} />
    </span>
  );
}

function AssistantWorkingStatusButton({
  onOpenAssistant,
}: {
  onOpenAssistant: () => void;
}) {
  const { t } = useTranslation();
  const assistantWorking = useWorkspaceStore((state) => state.assistantWorking);

  if (!assistantWorking) {
    return null;
  }

  return (
    <button
      className="status-bar-action status-bar-assistant-working"
      aria-label={t("app.aiAssistant")}
      aria-describedby="assistant-working-status-tooltip"
      onClick={onOpenAssistant}
      type="button"
    >
      <LoaderCircle size={14} />
      <span className="status-bar-tooltip" id="assistant-working-status-tooltip" role="tooltip">
        {t("app.aiAssistant")}
      </span>
    </button>
  );
}

function WorkspaceHostMetrics({ t }: { t: (key: string) => string }) {
  const hostUsage = useWorkspaceStore((state) => state.performanceMetrics.hostUsage);

  function openTaskManager() {
    if (!isTauriRuntime()) {
      return;
    }
    void invokeCommand("open_windows_task_manager").catch(() => undefined);
  }

  return (
    <button
      className="host-metrics"
      aria-label={t("workspace.hostUsage")}
      data-tutorial-id="workspace.hostUsage"
      onClick={openTaskManager}
      type="button"
    >
      <Metric
        icon={<Cpu size={13} />}
        label={t("workspace.cpu")}
        metric="percent"
        title={t("workspace.cpuUsage")}
        value={formatPercent(hostUsage?.cpuPercent)}
      />
      <Metric
        icon={<MemoryStick size={13} />}
        label={t("workspace.ram")}
        metric="percent"
        title={t("workspace.ramUsage")}
        value={formatPercent(hostUsage?.ramPercent)}
      />
      <NetworkMetric
        downstreamLabel={t("workspace.networkDownstream")}
        downstreamTitle={t("workspace.networkDownstreamUsage")}
        downstreamValue={formatNetwork(hostUsage?.networkDownstreamBytesPerSecond)}
        title={t("workspace.networkUsage")}
        upstreamLabel={t("workspace.networkUpstream")}
        upstreamTitle={t("workspace.networkUpstreamUsage")}
        upstreamValue={formatNetwork(hostUsage?.networkUpstreamBytesPerSecond)}
      />
    </button>
  );
}

function Metric({
  icon,
  label,
  metric,
  title,
  value,
}: {
  icon: ReactNode;
  label: string;
  metric: "network" | "percent";
  title: string;
  value: string;
}) {
  return (
    <span className={`host-metric host-metric-${metric}`} aria-label={`${label} ${value}`} title={title}>
      {icon}
      <strong className="host-metric-value">{value}</strong>
    </span>
  );
}

function NetworkMetric({
  downstreamLabel,
  downstreamTitle,
  downstreamValue,
  title,
  upstreamLabel,
  upstreamTitle,
  upstreamValue,
}: {
  downstreamLabel: string;
  downstreamTitle: string;
  downstreamValue: string;
  title: string;
  upstreamLabel: string;
  upstreamTitle: string;
  upstreamValue: string;
}) {
  return (
    <span
      className="host-metric host-metric-network"
      aria-label={`${downstreamLabel} ${downstreamValue}, ${upstreamLabel} ${upstreamValue}`}
      title={title}
    >
      <span className="host-metric-transfer" title={downstreamTitle}>
        <ArrowDownToLine size={13} />
        <strong className="host-metric-value">{downstreamValue}</strong>
      </span>
      <span className="host-metric-transfer" title={upstreamTitle}>
        <ArrowUpFromLine size={13} />
        <strong className="host-metric-value">{upstreamValue}</strong>
      </span>
    </span>
  );
}

function formatPercent(value: number | undefined) {
  if (value === undefined) {
    return "--%";
  }
  return `${Math.round(value)}%`;
}

function formatNetwork(bytesPerSecond: number | undefined) {
  if (bytesPerSecond === undefined) {
    return "-- MB/s";
  }
  const mb = bytesPerSecond / 1_000_000;
  if (mb < 10) {
    return `${mb.toFixed(1)} MB/s`;
  }
  if (mb < 100) {
    return `${Math.round(mb)} MB/s`;
  }
  return `${Math.min(9999, Math.round(mb))} MB/s`;
}
