import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "../../../state/dashboardStore";
import { ClaudeCodeIcon, CodexIcon } from "./providerIcons";
import { parseAiCodingUsageSettingsJson } from "./settings";
import { useAiCodingUsageStore, useAiCodingUsageSubscription } from "./store";
import type { AiCodingUsageProvider, AiCodingUsageProviderState } from "./types";

const TICK_MS = 60_000;

export function AiCodingUsageStatusBar({
  onOpenDashboardView,
}: {
  onOpenDashboardView: (viewId: string) => void;
}) {
  const instances = useDashboardStore((s) => s.instances);
  const dashboardReady = useDashboardStore((s) => s.ready);
  const loadDashboard = useDashboardStore((s) => s.load);
  const state = useAiCodingUsageStore((s) => s.state);

  useEffect(() => {
    if (!dashboardReady) {
      void loadDashboard();
    }
  }, [dashboardReady, loadDashboard]);

  const usageInstance = instances.find(
    (instance) => instance.kind === "builtIn" && instance.sourceId === "aiCodingUsage",
  );
  const settings = usageInstance
    ? parseAiCodingUsageSettingsJson(usageInstance.settingsValuesJson)
    : null;

  const shouldSubscribe = Boolean(settings?.showInStatusBar && settings.providers.length > 0);

  if (!shouldSubscribe) {
    return null;
  }

  return (
    <AiCodingUsageStatusBarBody
      onOpenDashboardView={onOpenDashboardView}
      providerIds={settings!.providers}
      state={state.providers}
      viewId={usageInstance!.viewId}
    />
  );
}

function AiCodingUsageStatusBarBody({
  onOpenDashboardView,
  providerIds,
  state,
  viewId,
}: {
  onOpenDashboardView: (viewId: string) => void;
  providerIds: AiCodingUsageProvider[];
  state: AiCodingUsageProviderState[];
  viewId: string;
}) {
  const { t } = useTranslation();
  useAiCodingUsageSubscription();
  const visibleProviders = providerIds
    .map((id) => state.find((candidate) => candidate.provider === id))
    .filter(
      (candidate): candidate is AiCodingUsageProviderState =>
        Boolean(candidate) &&
        candidate!.authState === "connected" &&
        typeof candidate!.fiveHour.usedPercent === "number",
    );

  if (visibleProviders.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      className="status-bar-ai-coding"
      onClick={() => onOpenDashboardView(viewId)}
      aria-label={t("dashboard.aiCodingUsageTitle")}
      title={t("dashboard.aiCodingUsageTitle")}
    >
      {visibleProviders.map((provider) => (
        <AiCodingUsageStatusBarItem key={provider.provider} provider={provider} />
      ))}
    </button>
  );
}

function AiCodingUsageStatusBarItem({ provider }: { provider: AiCodingUsageProviderState }) {
  const { t } = useTranslation();
  const label = t(`dashboard.aiCodingUsageProvider.${provider.provider}`);
  const Icon = provider.provider === "codex" ? CodexIcon : ClaudeCodeIcon;
  const percent = clamp(provider.fiveHour.usedPercent ?? 0, 0, 100);
  const meterState = percent >= 95 ? "danger" : percent >= 80 ? "warning" : "normal";
  const resetIso = provider.fiveHour.resetsAt ?? null;
  const showResetRemaining = meterState !== "normal";
  const remaining = useRelativeCountdown(showResetRemaining ? resetIso : null);
  const tooltipParts = [
    `${label} · ${t("dashboard.aiCodingUsageFiveHour")} ${t("dashboard.aiCodingUsagePercent", {
      percent: Math.round(percent),
    })}`,
  ];
  if (resetIso) {
    tooltipParts.push(t("dashboard.aiCodingUsageResetsAt", { time: formatAbsolute(resetIso) }));
  }

  return (
    <span
      className="status-bar-ai-coding-provider"
      data-state={meterState}
      title={tooltipParts.join(" · ")}
      aria-label={`${label} ${Math.round(percent)}%${
        showResetRemaining && remaining
          ? `, ${t("dashboard.aiCodingUsageStatusBarResetsIn", { time: remaining })}`
          : ""
      }`}
    >
      <Icon size={11} />
      <span className="status-bar-ai-coding-bar" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
      <span className="status-bar-ai-coding-percent">
        {t("dashboard.aiCodingUsagePercent", { percent: Math.round(percent) })}
      </span>
      {showResetRemaining && remaining ? (
        <span className="status-bar-ai-coding-reset">{remaining}</span>
      ) : null}
    </span>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function useRelativeCountdown(iso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [iso]);
  if (!iso) {
    return null;
  }
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) {
    return null;
  }
  const diff = target - now;
  if (diff <= 0) {
    return "0m";
  }
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatAbsolute(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}
