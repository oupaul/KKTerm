import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleCheck,
  CircleGauge,
  CircleX,
  Coffee,
  Cpu,
  Info,
  Lock,
  LoaderCircle,
  MemoryStick,
  TriangleAlert,
  Unlock,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RailTooltip } from "../../app/RailTooltip";
import { showNativeContextMenu } from "../../lib/nativeContextMenu";
import { AiCodingUsageStatusBar } from "../dashboard/widgets/builtin/ai-coding-usage/AiCodingUsageStatusBar";
import { InstallerStatusSummary } from "../installer/InstallerStatusSummary";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { CredentialSecretStoreStatus, StatusBarNotice } from "../../types";
import { currentPlatform } from "../../lib/platform";
import { EncryptedSecretStoreDialog } from "../settings/EncryptedSecretStoreDialog";
import { WatchdogStatusBar } from "../../watchdog/WatchdogStatusBar";

const NOTIFICATION_FADE_MS = 220;

export function StatusBar({
  onOpenAssistant,
  onOpenDashboardView,
  installerActive,
}: {
  onOpenAssistant: () => void;
  onOpenDashboardView: (viewId: string) => void;
  installerActive: boolean;
}) {
  const { t } = useTranslation();
  const notice = useWorkspaceStore((state) => state.statusBarNotice);
  const statusBarMonitorEnabled = useWorkspaceStore(
    (state) => state.generalSettings.statusBarMonitorEnabled,
  );
  const clearStatusBarNotice = useWorkspaceStore((state) => state.clearStatusBarNotice);
  const setDocumentStatusSlot = useWorkspaceStore((state) => state.setDocumentStatusSlot);
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
    renderedNotice.onCancel?.();
    setIsNoticeExiting(true);
    window.setTimeout(() => clearStatusBarNotice(noticeId), NOTIFICATION_FADE_MS);
  }

  return (
    <footer className="status-bar" data-tutorial-id="workspace.statusBar">
      <div className={`status-bar-module ${statusBarMonitorEnabled ? "" : "metrics-disabled"}`}>
        {statusBarMonitorEnabled ? <WorkspaceHostMetrics t={t} /> : null}
        <AiCodingUsageStatusBar onOpenDashboardView={onOpenDashboardView} />
      </div>
      <div className="status-bar-document" ref={setDocumentStatusSlot} />
      <InstallerStatusSummary active={installerActive} />
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
        <CredentialStoreStatusButton />
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
  const isProgress = notice.progress !== undefined;
  const progress = notice.progress ?? 0;
  const showClose = !isProgress || Boolean(notice.onCancel) || notice.progress === 100;

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
        {isProgress ? (
          <CircleGauge size={21} strokeWidth={2.2} />
        ) : (
          <StatusNoticeIcon tone={notice.tone} />
        )}
      </span>
      <span className="status-popup-content">
        <span className="status-popup-message" role="status">
          {notice.message}
        </span>
        {isProgress ? (
          <span className="status-popup-progress-wrap">
            <span
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              aria-label={notice.message}
              className="status-popup-progress"
              role="progressbar"
            >
              <i style={{ width: `${progress}%` }} />
            </span>
            <span className="status-popup-progress-labels" aria-hidden="true">
              <span className="status-popup-progress-min">0%</span>
              <strong>{Math.round(progress)}%</strong>
              <span className="status-popup-progress-max">100%</span>
            </span>
          </span>
        ) : (
          <span className="status-popup-timer" aria-hidden="true">
            <i />
          </span>
        )}
      </span>
      {showClose ? (
        <button
          className="status-popup-close"
          aria-label={notice.cancelLabel ?? dismissLabel}
          onClick={onDismiss}
          type="button"
        >
          <X size={11} strokeWidth={2.6} />
        </button>
      ) : null}
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

function CredentialStoreStatusButton() {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [status, setStatus] = useState<CredentialSecretStoreStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!isTauriRuntime()) {
      setStatus(null);
      return;
    }
    try {
      setStatus(await invokeCommand("credential_secret_store_status", undefined));
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const handleStatusChanged = () => {
      void refreshStatus();
    };
    window.addEventListener("kkterm:credential-store-status-changed", handleStatusChanged);
    return () => {
      window.removeEventListener("kkterm:credential-store-status-changed", handleStatusChanged);
    };
  }, [refreshStatus]);

  if (!status || status.selectedStore !== "file") {
    return null;
  }

  async function submitUnlock(request: {
    password: string;
    createIfMissing: boolean;
    resetExisting?: boolean;
  }) {
    try {
      setBusy(true);
      setError(null);
      await invokeCommand("configure_encrypted_file_secret_store", { request });
      setDialogOpen(false);
      await refreshStatus();
      window.dispatchEvent(new CustomEvent("kkterm:credential-store-status-changed"));
      showStatusBarNotice(t("app.credentialStoreUnlocked"), { tone: "success" });
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : String(unlockError));
    } finally {
      setBusy(false);
    }
  }

  async function lockStore() {
    try {
      setBusy(true);
      const nextStatus = await invokeCommand("lock_encrypted_file_secret_store", undefined);
      setStatus(nextStatus);
      window.dispatchEvent(new CustomEvent("kkterm:credential-store-status-changed"));
      showStatusBarNotice(t("app.credentialStoreLocked"), { tone: "success" });
    } catch (lockError) {
      showStatusBarNotice(lockError instanceof Error ? lockError.message : String(lockError), {
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const unlocked = status.unlocked;
  const label = unlocked ? t("app.credentialStoreUnlocked") : t("app.credentialStoreLocked");
  const actionLabel = unlocked
    ? t("app.credentialStoreLockAction")
    : t("app.credentialStoreUnlockAction");

  return (
    <>
      <button
        aria-label={actionLabel}
        className={`status-bar-action credential-store-status ${
          unlocked ? "is-unlocked" : "is-locked"
        }`}
        disabled={busy}
        onClick={() => {
          if (unlocked) {
            void lockStore();
          } else {
            setError(null);
            setDialogOpen(true);
          }
        }}
        type="button"
      >
        {unlocked ? <Unlock size={14} /> : <Lock size={14} />}
        <RailTooltip label={label} />
      </button>
      {dialogOpen ? (
        <EncryptedSecretStoreDialog
          busy={busy}
          encryptedStoreExists={status.encryptedStoreExists}
          error={error}
          initialMode={status.encryptedStoreExists ? "unlock" : "create"}
          launchPrompt={false}
          platform={currentPlatform()}
          onCancel={() => {
            setDialogOpen(false);
            setError(null);
          }}
          onSubmit={submitUnlock}
        />
      ) : null}
    </>
  );
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
