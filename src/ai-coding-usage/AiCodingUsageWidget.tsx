import { ExternalLink, LogOut, Plus, RefreshCw, X } from "lucide-react";
import { ClaudeCodeColorIcon, CodexColorIcon } from "./providerIcons";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "../dashboard/state/dashboardStore";
import type { DashboardWidgetInstance } from "../dashboard/types";
import { invokeCommand, isTauriRuntime, openExternalUrl } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import {
  addAiCodingUsageProvider,
  AI_CODING_USAGE_PROVIDER_ORDER,
  availableAiCodingUsageProviders,
  parseAiCodingUsageSettingsJson,
  removeAiCodingUsageProvider,
  serializeAiCodingUsageSettings,
  type AiCodingUsageWidgetSettings,
} from "./settings";
import type {
  AiCodingUsageProvider,
  AiCodingUsageProviderState,
  AiCodingUsageQuotaWindow,
  AiCodingUsageState,
} from "./types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const INSTALL_HELP_URLS: Record<AiCodingUsageProvider, string> = {
  codex: "https://developers.openai.com/codex/cli",
  claudeCode: "https://code.claude.com/docs/en/setup",
};

const EMPTY_STATE: AiCodingUsageState = {
  providers: AI_CODING_USAGE_PROVIDER_ORDER.map((provider) => ({
    provider,
    authState: "disconnected",
    accountLabel: null,
    accountEmail: null,
    subscriptionPlan: null,
    fiveHour: {},
    weekly: {},
    lastRefreshAt: null,
    lastError: null,
  })),
};

type AddMenuState = {
  x: number;
  y: number;
};

export function AiCodingUsageWidget({ instance }: { instance: DashboardWidgetInstance }) {
  const { t } = useTranslation();
  const updateInstance = useDashboardStore((state) => state.updateInstance);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [state, setState] = useState<AiCodingUsageState>(EMPTY_STATE);
  const [settings, setSettings] = useState<AiCodingUsageWidgetSettings>(() =>
    parseAiCodingUsageSettingsJson(instance.settingsValuesJson),
  );
  const [busyProvider, setBusyProvider] = useState<AiCodingUsageProvider | "all" | null>(null);
  const [loadError, setLoadError] = useState("");
  const [addMenuState, setAddMenuState] = useState<AddMenuState | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSettings(parseAiCodingUsageSettingsJson(instance.settingsValuesJson));
  }, [instance.settingsValuesJson]);

  useEffect(() => {
    if (!addMenuState) {
      return;
    }
    function closeMenu(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && addMenuRef.current?.contains(target)) {
        return;
      }
      setAddMenuState(null);
    }
    function closeMenuOnKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setAddMenuState(null);
      }
    }
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeMenuOnKey);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeMenuOnKey);
    };
  }, [addMenuState]);

  useLayoutEffect(() => {
    const node = addMenuRef.current;
    if (!node || !addMenuState) {
      return;
    }
    const bounds = node.getBoundingClientRect();
    node.style.left = `${Math.max(8, Math.min(addMenuState.x, window.innerWidth - bounds.width - 8))}px`;
    node.style.top = `${Math.max(8, Math.min(addMenuState.y, window.innerHeight - bounds.height - 8))}px`;
  }, [addMenuState]);

  const selectedProviders = settings.providers;

  const connectedProviders = useMemo(
    () =>
      state.providers.filter(
        (provider) =>
          selectedProviders.includes(provider.provider) &&
          provider.authState === "connected",
      ),
    [selectedProviders, state.providers],
  );
  const availableProviders = availableAiCodingUsageProviders(settings);

  const load = useCallback(async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      setState(await invokeCommand("ai_coding_usage_load"));
      setLoadError("");
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isTauriRuntime() || connectedProviders.length === 0 || busyProvider) {
      return;
    }
    setBusyProvider("all");
    try {
      let nextState = state;
      for (const provider of connectedProviders) {
        nextState = await invokeCommand("ai_coding_usage_refresh", {
          provider: provider.provider,
        });
      }
      setState(nextState);
      setLoadError("");
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setBusyProvider(null);
    }
  }, [busyProvider, connectedProviders, state]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (connectedProviders.length === 0) {
      return;
    }
    const id = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [connectedProviders.length, refresh]);

  function openAddMenuFromElement(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    setAddMenuState({ x: bounds.left, y: bounds.bottom + 4 });
  }

  async function saveSettings(nextSettings: AiCodingUsageWidgetSettings) {
    const normalized = parseAiCodingUsageSettingsJson(
      serializeAiCodingUsageSettings(nextSettings),
    );
    setSettings(normalized);
    try {
      await updateInstance(instance.id, {
        settingsValuesJson: serializeAiCodingUsageSettings(normalized),
      });
    } catch (error) {
      showStatusBarNotice(errorMessage(error), { tone: "error" });
    }
  }

  async function addProvider(provider: AiCodingUsageProvider) {
    await saveSettings(addAiCodingUsageProvider(settings, provider));
  }

  async function removeProvider(provider: AiCodingUsageProvider) {
    await saveSettings(removeAiCodingUsageProvider(settings, provider));
  }

  async function connectProvider(provider: AiCodingUsageProvider) {
    if (!isTauriRuntime() || busyProvider) {
      return;
    }
    setBusyProvider(provider);
    try {
      const nextProvider = await invokeCommand("ai_coding_usage_connect", { provider });
      setState((current) => replaceProvider(current, nextProvider));
      setLoadError("");
    } catch (error) {
      setLoadError(errorMessage(error));
      await load();
    } finally {
      setBusyProvider(null);
    }
  }

  async function disconnectProvider(provider: AiCodingUsageProvider) {
    if (!isTauriRuntime() || busyProvider) {
      return;
    }
    setBusyProvider(provider);
    try {
      const nextProvider = await invokeCommand("ai_coding_usage_disconnect", { provider });
      setState((current) => replaceProvider(current, nextProvider));
      setLoadError("");
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div
      className={`ai-coding-usage${addMenuState ? " is-adding" : ""}`}
      data-instance-id={instance.id}
    >
      <div className="ai-coding-usage-toolbar">
        <div>
          <div className="ai-coding-usage-title">{t("dashboard.aiCodingUsageTitle")}</div>
          <div className="ai-coding-usage-subtitle">{t("dashboard.aiCodingUsageSubtitle")}</div>
        </div>
        <div className="ai-coding-usage-actions">
          <button
            type="button"
            className="dashboard-widget-icon-button ai-coding-usage-add"
            onClick={(event) => openAddMenuFromElement(event.currentTarget)}
            disabled={busyProvider !== null || availableProviders.length === 0}
            aria-label={t("dashboard.aiCodingUsageAddTool")}
            title={t("dashboard.aiCodingUsageAddTool")}
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            className="dashboard-widget-icon-button ai-coding-usage-refresh"
            onClick={() => void refresh()}
            disabled={busyProvider !== null || connectedProviders.length === 0}
            aria-label={t("dashboard.aiCodingUsageRefreshNow")}
            title={t("dashboard.aiCodingUsageRefreshNow")}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {selectedProviders.length > 0 ? (
        <div className="ai-coding-usage-providers">
          {selectedProviders.map((provider) => {
            const providerState =
              state.providers.find((candidate) => candidate.provider === provider) ??
              EMPTY_STATE.providers.find((candidate) => candidate.provider === provider)!;
            return (
              <ProviderSlot
                busy={busyProvider === provider || busyProvider === "all"}
                key={provider}
                onConnect={() => void connectProvider(provider)}
                onDisconnect={() => void disconnectProvider(provider)}
                onRemove={() => void removeProvider(provider)}
                provider={providerState}
              />
            );
          })}
        </div>
      ) : (
        <div className="ai-coding-usage-empty">
          <h4>{t("dashboard.aiCodingUsageEmptyTitle")}</h4>
          <p>{t("dashboard.aiCodingUsageEmptyHint")}</p>
        </div>
      )}

      {loadError ? (
        <div className="ai-coding-usage-error" role="status">
          {t("dashboard.aiCodingUsageRefreshError", { message: loadError })}
        </div>
      ) : null}
      {addMenuState
        ? createAiCodingUsagePortal(
            <AiCodingUsageAddMenu
              menuRef={addMenuRef}
              onAddProvider={(provider) => {
                setAddMenuState(null);
                void addProvider(provider);
              }}
              onClose={() => setAddMenuState(null)}
              providers={availableProviders}
            />,
          )
        : null}
    </div>
  );
}

function ProviderSlot({
  busy,
  onConnect,
  onDisconnect,
  onRemove,
  provider,
}: {
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRemove: () => void;
  provider: AiCodingUsageProviderState;
}) {
  const { t } = useTranslation();
  const label = t(`dashboard.aiCodingUsageProvider.${provider.provider}`);
  const connected = provider.authState === "connected";
  const displayError = providerDisplayError(provider);
  const Icon = provider.provider === "codex" ? CodexColorIcon : ClaudeCodeColorIcon;

  return (
    <section className="ai-coding-provider" data-state={provider.authState}>
      <div className="ai-coding-provider-header">
        <div className="ai-coding-provider-identity">
          <span className="ai-coding-provider-icon" aria-hidden="true">
            <Icon size={15} />
          </span>
          <span>
            <span className="ai-coding-provider-name-row">
              <span className="ai-coding-provider-name">{label}</span>
              {provider.subscriptionPlan ? (
                <span className="ai-coding-provider-plan" title={provider.subscriptionPlan}>
                  {formatSubscriptionPlan(provider.subscriptionPlan)}
                </span>
              ) : null}
            </span>
            <span className="ai-coding-provider-account">
              {provider.accountLabel || provider.accountEmail || t("dashboard.aiCodingUsageNotConnected")}
            </span>
          </span>
        </div>
        {connected ? (
          <div className="ai-coding-provider-actions">
            <button
              type="button"
              className="dashboard-widget-icon-button"
              onClick={onDisconnect}
              disabled={busy}
              aria-label={t("dashboard.aiCodingUsageDisconnectProvider", { provider: label })}
              title={t("dashboard.aiCodingUsageDisconnectProvider", { provider: label })}
            >
              <LogOut size={13} />
            </button>
            <button
              type="button"
              className="dashboard-widget-icon-button"
              onClick={onRemove}
              disabled={busy}
              aria-label={t("dashboard.aiCodingUsageRemoveProvider", { provider: label })}
              title={t("dashboard.aiCodingUsageRemoveProvider", { provider: label })}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="ai-coding-provider-actions">
            <button
              type="button"
              className="dashboard-widget-icon-button"
              onClick={onRemove}
              disabled={busy}
              aria-label={t("dashboard.aiCodingUsageRemoveProvider", { provider: label })}
              title={t("dashboard.aiCodingUsageRemoveProvider", { provider: label })}
            >
              <X size={13} />
            </button>
            <button
              type="button"
              className="ai-coding-connect"
              onClick={onConnect}
              disabled={busy}
            >
              {busy
                ? t("dashboard.aiCodingUsageConnecting")
                : t("dashboard.aiCodingUsageConnectProvider", { provider: label })}
            </button>
          </div>
        )}
      </div>

      {connected ? (
        <>
          <UsageMeter
            label={t("dashboard.aiCodingUsageFiveHour")}
            quota={provider.fiveHour}
          />
          <UsageMeter
            label={t("dashboard.aiCodingUsageWeekly")}
            quota={provider.weekly}
          />
          <div className="ai-coding-provider-meta">
            {provider.lastRefreshAt
              ? t("dashboard.aiCodingUsageLastRefresh", {
                  time: formatDateTime(provider.lastRefreshAt),
                })
              : t("dashboard.aiCodingUsageNeverRefreshed")}
          </div>
        </>
      ) : (
        <div className="ai-coding-provider-empty">
          {displayError
            ? t("dashboard.aiCodingUsageProviderError", { message: displayError })
            : t("dashboard.aiCodingUsageProviderHint")}
          {displayError && isCliNotFoundError(displayError) ? (
            <button
              type="button"
              className="ai-coding-install-link"
              onClick={() => void openExternalUrl(INSTALL_HELP_URLS[provider.provider])}
            >
              <ExternalLink size={12} />
              {t("dashboard.aiCodingUsageInstallHelp", { provider: label })}
            </button>
          ) : null}
        </div>
      )}

      {connected && displayError ? (
        <div className="ai-coding-provider-warning">
          {t("dashboard.aiCodingUsageProviderError", { message: displayError })}
        </div>
      ) : null}
    </section>
  );
}

function AiCodingUsageAddMenu({
  menuRef,
  onAddProvider,
  onClose,
  providers,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  onAddProvider: (provider: AiCodingUsageProvider) => void;
  onClose: () => void;
  providers: AiCodingUsageProvider[];
}) {
  const { t } = useTranslation();
  return (
    <div
      ref={menuRef}
      className="terminal-menu ai-coding-add-menu"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      role="menu"
    >
      {providers.map((provider) => (
        <MenuButton
          icon={provider === "codex" ? <CodexColorIcon size={14} /> : <ClaudeCodeColorIcon size={14} />}
          key={provider}
          label={t(`dashboard.aiCodingUsageProvider.${provider}`)}
          onClick={() => {
            onClose();
            onAddProvider(provider);
          }}
        />
      ))}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="terminal-menu-item" onClick={onClick} role="menuitem" type="button">
      {icon}
      {label}
    </button>
  );
}

function UsageMeter({ label, quota }: { label: string; quota: AiCodingUsageQuotaWindow }) {
  const { t } = useTranslation();
  const percent = typeof quota.usedPercent === "number" ? clamp(quota.usedPercent, 0, 100) : null;
  const meterState = percent === null ? "unknown" : percent >= 95 ? "danger" : percent >= 80 ? "warning" : "normal";

  return (
    <div className="ai-coding-meter" data-state={meterState}>
      <div className="ai-coding-meter-row">
        <span>{label}</span>
        <span>
          {percent === null
            ? t("dashboard.aiCodingUsageUnknownUsage")
            : t("dashboard.aiCodingUsagePercent", { percent: Math.round(percent) })}
        </span>
      </div>
      <div className="ai-coding-meter-track" aria-hidden="true">
        <MeterFill percent={percent ?? 0} />
      </div>
      <div className="ai-coding-meter-reset">
        {quota.resetsAt
          ? t("dashboard.aiCodingUsageResetsAt", { time: formatDateTime(quota.resetsAt) })
          : t("dashboard.aiCodingUsageResetUnknown")}
      </div>
    </div>
  );
}

function MeterFill({ percent }: { percent: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${clamp(percent, 0, 100)}%`;
    }
  }, [percent]);
  return <span ref={ref} />;
}

function replaceProvider(
  current: AiCodingUsageState,
  provider: AiCodingUsageProviderState,
): AiCodingUsageState {
  return {
    providers: AI_CODING_USAGE_PROVIDER_ORDER.map((id) =>
      id === provider.provider
        ? provider
        : current.providers.find((candidate) => candidate.provider === id) ??
          EMPTY_STATE.providers.find((candidate) => candidate.provider === id)!,
    ),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatSubscriptionPlan(plan: string) {
  const trimmed = plan.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isCliNotFoundError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("program not found") || normalized.includes("failed to start");
}

function providerDisplayError(provider: AiCodingUsageProviderState) {
  if (!provider.lastError || isLegacyClaudeStatuslineNotice(provider)) {
    return null;
  }
  return provider.lastError;
}

function isLegacyClaudeStatuslineNotice(provider: AiCodingUsageProviderState) {
  return (
    provider.provider === "claudeCode" &&
    provider.lastError?.includes("did not expose quota windows in auth status")
  );
}

function createAiCodingUsagePortal(node: ReactNode) {
  return typeof document === "undefined" ? node : createPortal(node, document.body);
}
