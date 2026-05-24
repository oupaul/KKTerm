import { Check, ShieldAlert, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PendingToolApproval, ToolApprovalAction } from "./assistantTypes";
import { humanizeAssistantToolName } from "./assistantToolLabels";

export function AssistantToolApprovalCards({
  approvals,
  onAllow,
  onAllowSession,
  onDeny,
}: {
  approvals: PendingToolApproval[];
  onAllow: (request: PendingToolApproval) => void;
  onAllowSession: (request: PendingToolApproval) => void;
  onDeny: (request: PendingToolApproval) => void;
}) {
  return (
    <>
      {approvals.map((request) => (
        <AssistantToolApprovalCard
          key={request.requestId}
          request={request}
          onAllow={() => onAllow(request)}
          onAllowSession={() => onAllowSession(request)}
          onDeny={() => onDeny(request)}
        />
      ))}
    </>
  );
}

function AssistantToolApprovalCard({
  onAllow,
  onAllowSession,
  onDeny,
  request,
}: {
  onAllow: () => void;
  onAllowSession: () => void;
  onDeny: () => void;
  request: PendingToolApproval;
}) {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<ToolApprovalAction>("");
  const isPending = request.status === "pending";
  const argsPreview = formatToolApprovalArgs(request.args);
  const toolLabel = humanizeAssistantToolName(request.toolName);
  const watchdogConfig = extractWatchdogApprovalConfig(request);

  function handleApprovalActionChange(event: ChangeEvent<HTMLSelectElement>) {
    const action = event.currentTarget.value as ToolApprovalAction;
    setSelectedAction(action);
    if (action === "allow") {
      onAllow();
      return;
    }
    if (action === "allowSession") {
      onAllowSession();
      return;
    }
    if (action === "deny") {
      onDeny();
    }
  }

  if (!isPending) {
    return (
      <article className="assistant-message assistant">
        <div className="assistant-message-content">
          <section className="assistant-tool-approval-card assistant-tool-approval-summary" aria-live="polite">
            <span aria-hidden="true">
              {request.status === "denied" ? <X size={14} /> : <Check size={14} />}
            </span>
            <strong>{toolApprovalStatusLabel(request.status, t)}</strong>
            <small>{t("ai.toolApprovalTool", { tool: toolLabel })}</small>
          </section>
        </div>
      </article>
    );
  }

  return (
    <article className="assistant-message assistant">
      <div className="assistant-message-content">
        <section className="assistant-tool-approval-card" aria-live="polite">
          <header>
            <ShieldAlert size={15} />
            <div>
              <strong>{t("ai.toolApprovalTitle")}</strong>
              <small>
                {t("ai.toolApprovalTool", {
                  tool: toolLabel,
                })}
              </small>
            </div>
          </header>
          {watchdogConfig ? (
            <WatchdogApprovalBody config={watchdogConfig} />
          ) : (
            <>
              <p>{t("ai.toolApprovalBody")}</p>
              {argsPreview ? (
                <details>
                  <summary>{t("ai.toolApprovalDetails")}</summary>
                  <pre>
                    <code>{argsPreview}</code>
                  </pre>
                </details>
              ) : null}
            </>
          )}
          <footer>
            <span>{t("ai.toolApprovalWaiting")}</span>
            <label className="assistant-tool-approval-action">
              <select
                aria-label={t("ai.toolApprovalSelectAction")}
                disabled={!isPending}
                onChange={handleApprovalActionChange}
                value={selectedAction}
              >
                <option value="">{t("ai.toolApprovalSelectAction")}</option>
                <option value="allow">{t("ai.toolApprovalAllow")}</option>
                <option value="allowSession">{t("ai.toolApprovalAllowSession")}</option>
                <option value="deny">{t("ai.toolApprovalDeny")}</option>
              </select>
            </label>
          </footer>
        </section>
      </div>
    </article>
  );
}

function toolApprovalStatusLabel(
  status: PendingToolApproval["status"],
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (status === "allowedSession") {
    return t("ai.toolApprovalAllowedSession");
  }
  if (status === "approved") {
    return t("ai.toolApprovalApproved");
  }
  return t("ai.toolApprovalDenied");
}

function formatToolApprovalArgs(args: Record<string, unknown> | undefined) {
  if (!args || Object.keys(args).length === 0) {
    return "";
  }
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return "";
  }
}

interface WatchdogApprovalConfig {
  name: string;
  target: Record<string, unknown> | undefined;
  trigger: Record<string, unknown> | undefined;
  pollMs: number;
  stop: Record<string, unknown> | undefined;
  goal: string;
  allowedTools: string[];
  maxInterventions: number;
  suppressionMs: number;
}

function extractWatchdogApprovalConfig(
  request: PendingToolApproval,
): WatchdogApprovalConfig | null {
  if (request.toolName !== "watchdog_create") {
    return null;
  }
  const config = request.args?.config as unknown;
  if (!config || typeof config !== "object") {
    return null;
  }
  const c = config as Record<string, unknown>;
  const action = c.action as Record<string, unknown> | undefined;
  if (action?.kind !== "aiIntervene") {
    return null;
  }
  return {
    name: typeof c.name === "string" ? c.name : "",
    target: c.target as Record<string, unknown> | undefined,
    trigger: c.trigger as Record<string, unknown> | undefined,
    pollMs: typeof c.pollMs === "number" ? c.pollMs : 0,
    stop: c.stop as Record<string, unknown> | undefined,
    goal: typeof action.goal === "string" ? action.goal : "",
    allowedTools: Array.isArray(action.allowedTools)
      ? (action.allowedTools as unknown[]).filter((v): v is string => typeof v === "string")
      : [],
    maxInterventions:
      typeof action.maxInterventions === "number" ? action.maxInterventions : 0,
    suppressionMs:
      typeof action.suppressionMs === "number" ? action.suppressionMs : 0,
  };
}

function WatchdogApprovalBody({ config }: { config: WatchdogApprovalConfig }) {
  const { t } = useTranslation();
  const targetSummary = summarizeWatchdogTarget(config.target);
  const triggerSummary = summarizeWatchdogTrigger(config.trigger);
  const stopSummary = summarizeWatchdogStop(config.stop);
  return (
    <div className="watchdog-approval-body">
      <p className="watchdog-approval-lede">
        {t("ai.watchdogApproval.lede", { name: config.name || "(unnamed)" })}
      </p>
      <dl className="watchdog-approval-fields">
        <Field label={t("ai.watchdogApproval.target")} value={targetSummary} />
        <Field label={t("ai.watchdogApproval.trigger")} value={triggerSummary} />
        <Field
          label={t("ai.watchdogApproval.poll")}
          value={`${(config.pollMs / 1000).toFixed(1)}s`}
        />
        <Field label={t("ai.watchdogApproval.stop")} value={stopSummary} />
      </dl>
      <div className="watchdog-approval-goal">
        <strong>{t("ai.watchdogApproval.goal")}</strong>
        <p>{config.goal}</p>
      </div>
      <div className="watchdog-approval-tools">
        <strong>
          {t("ai.watchdogApproval.allowedTools", {
            count: config.allowedTools.length,
          })}
        </strong>
        <ul>
          {config.allowedTools.map((tool) => (
            <li key={tool}>
              <code>{tool}</code>
            </li>
          ))}
        </ul>
        <small>{t("ai.watchdogApproval.allowedToolsCaveat")}</small>
      </div>
      <p className="watchdog-approval-caps">
        {t("ai.watchdogApproval.caps", {
          max: config.maxInterventions,
          suppression: Math.round(config.suppressionMs / 1000),
        })}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function summarizeWatchdogTarget(target: Record<string, unknown> | undefined): string {
  if (!target) return "—";
  const kind = target.kind;
  if (kind === "performanceCounter") {
    return `performance counter · ${String(target.metric ?? "")}`;
  }
  if (kind === "sshSessionOutputSilence") {
    return `ssh session silence · ${String(target.sessionId ?? "")}`;
  }
  if (kind === "ping") {
    return `ping · ${String(target.host ?? "")}`;
  }
  if (kind === "tcpReachable") {
    return `tcp · ${String(target.host ?? "")}:${String(target.port ?? "")}`;
  }
  if (kind === "mock") {
    return "mock (testing)";
  }
  return String(kind ?? "—");
}

function summarizeWatchdogTrigger(trigger: Record<string, unknown> | undefined): string {
  if (!trigger) return "—";
  const pred = trigger.predicate as Record<string, unknown> | undefined;
  if (!pred) return "—";
  const op = String(pred.op ?? "?");
  const value = pred.value ?? pred.ms ?? "?";
  const sustained = trigger.sustainedForMs;
  const base = `${op} ${String(value)}`;
  if (typeof sustained === "number" && sustained > 0) {
    return `${base} for ${Math.round(sustained / 1000)}s`;
  }
  return base;
}

function summarizeWatchdogStop(stop: Record<string, unknown> | undefined): string {
  if (!stop) return "—";
  const kind = stop.kind;
  if (kind === "untilCanceled") return "until canceled";
  if (kind === "afterFirstTrigger") return "after first trigger";
  if (kind === "afterTriggerCount") return `after ${String(stop.n ?? "?")} triggers`;
  if (kind === "afterPollCount") return `after ${String(stop.n ?? "?")} polls`;
  if (kind === "afterDuration") {
    const ms = typeof stop.ms === "number" ? stop.ms : 0;
    return `after ${Math.round(ms / 1000)}s`;
  }
  return String(kind ?? "—");
}
