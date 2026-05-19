import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "../dashboard/state/dashboardStore";
import { ClaudeCodeIcon, CodexIcon } from "./providerIcons";
import { parseAiCodingUsageSettingsJson } from "./settings";
import { useAiCodingUsageStore, useAiCodingUsageSubscription } from "./store";
import type { AiCodingUsageProvider, AiCodingUsageProviderState } from "./types";

const TICK_MS = 60_000;

export function AiCodingUsageStatusBar() {
  const instances = useDashboardStore((s) => s.instances);
  const state = useAiCodingUsageStore((s) => s.state);
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

  return <AiCodingUsageStatusBarBody providers={settings!.providers} state={state.providers} />;
}

function AiCodingUsageStatusBarBody({
  providers,
  state,
}: {
  providers: AiCodingUsageProvider[];
  state: AiCodingUsageProviderState[];
}) {
  useAiCodingUsageSubscription();
  const visible = providers
    .map((id) => state.find((candidate) => candidate.provider === id))
    .filter(
      (candidate): candidate is AiCodingUsageProviderState =>
        Boolean(candidate) &&
        candidate!.authState === "connected" &&
        typeof candidate!.fiveHour.usedPercent === "number",
    );

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="status-bar-ai-coding" role="group">
      {visible.map((provider) => (
        <AiCodingUsageStatusBarItem key={provider.provider} provider={provider} />
      ))}
    </div>
  );
}

function AiCodingUsageStatusBarItem({ provider }: { provider: AiCodingUsageProviderState }) {
  const { t } = useTranslation();
  const label = t(`dashboard.aiCodingUsageProvider.${provider.provider}`);
  const Icon = provider.provider === "codex" ? CodexIcon : ClaudeCodeIcon;
  const percent = clamp(provider.fiveHour.usedPercent ?? 0, 0, 100);
  const meterState = percent >= 95 ? "danger" : percent >= 80 ? "warning" : "normal";
  const resetIso = provider.fiveHour.resetsAt ?? null;
  const remaining = useRelativeCountdown(resetIso);
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
        remaining ? `, ${t("dashboard.aiCodingUsageStatusBarResetsIn", { time: remaining })}` : ""
      }`}
    >
      <Icon size={13} />
      <span className="status-bar-ai-coding-bar" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
      {remaining ? <span className="status-bar-ai-coding-reset">{remaining}</span> : null}
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
