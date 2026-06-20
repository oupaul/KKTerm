// Batch Runs tab (hero) — the live per-host grid with status chips, a progress
// roll-up and expandable output, fed by the `itops://run` event stream via
// useItOpsStore (docs/ITOPS.md Phase 2). When idle it shows the empty state
// plus a compact recent-runs list from itops_run_history.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ItIcon, type ItIconName } from "./icons";
import { TransportChip } from "./TransportChip";
import { useItOpsStore, type LiveRun, type LiveRunHost, type LiveRunHostStatus } from "./state";

const DEFAULT_CONCURRENCY = 8;

const ST_ICON: Record<LiveRunHostStatus, ItIconName> = {
  ok: "check",
  failed: "xmark",
  running: "spinner",
  pending: "pending",
};
const ST_CODE: Record<LiveRunHostStatus, string> = {
  ok: "ok",
  failed: "fail",
  running: "run",
  pending: "pend",
};

function formatDuration(durationMs?: number): string {
  if (durationMs === undefined) return "";
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatTime(epochMillis: string): string {
  const value = Number(epochMillis);
  if (!Number.isFinite(value)) return epochMillis;
  return new Date(value).toLocaleString();
}

function HostCard({ host }: { host: LiveRunHost }) {
  const { t } = useTranslation();
  const hasOutput = host.status === "ok" || host.status === "failed" || host.status === "running";
  const [open, setOpen] = useState(host.status === "failed");
  const codeText =
    host.status === "ok" || host.status === "failed"
      ? t("itops.batchRuns.codeExit", { code: host.exitCode ?? 0 })
      : host.status === "running"
        ? t("itops.batchRuns.codeRunning")
        : t("itops.batchRuns.codeQueued");
  const lines = host.output ? host.output.replace(/\n$/, "").split("\n") : [];

  return (
    <div className={`host-card ${host.status}`}>
      <button
        type="button"
        className={`host-row${open ? " open" : ""}`}
        onClick={() => hasOutput && setOpen((value) => !value)}
      >
        <span className="chev" style={{ visibility: hasOutput ? "visible" : "hidden" }}>
          <ItIcon name="chevR" size={15} />
        </span>
        <span className={`st-badge ${host.status}`}>
          <ItIcon
            name={ST_ICON[host.status]}
            size={15}
            sw={host.status === "ok" || host.status === "failed" ? 2.4 : 1.8}
          />
        </span>
        <span className="hname">{host.name}</span>
        <span className="haddr">{host.host}</span>
        <TransportChip transport={host.transport} />
        <span className="hsp" />
        {host.error ? <span className="hnote">{host.error}</span> : null}
        {host.durationMs !== undefined ? (
          <span className="hdur">{formatDuration(host.durationMs)}</span>
        ) : null}
        <span className={`hcode ${ST_CODE[host.status]}`}>{codeText}</span>
      </button>
      {open && hasOutput ? (
        <div className="host-out">
          {lines.length > 0 ? (
            lines.map((line, index) => (
              <span key={index} className="line">
                {line || " "}
              </span>
            ))
          ) : (
            <span className="line c-dim">{t("itops.batchRuns.waitingOutput")}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LiveRunView({ run }: { run: LiveRun }) {
  const { t } = useTranslation();
  const hostGroups = useItOpsStore((state) => state.hostGroups);
  const cancelRun = useItOpsStore((state) => state.cancelRun);
  const requestNewBatchRun = useItOpsStore((state) => state.requestNewBatchRun);

  const tally = run.hosts.reduce(
    (acc, host) => {
      acc[host.status] += 1;
      return acc;
    },
    { ok: 0, failed: 0, running: 0, pending: 0 } as Record<LiveRunHostStatus, number>,
  );
  const total = run.hosts.length;
  const done = tally.ok + tally.failed;
  const live = run.state === "running";
  const groupName = hostGroups.find((group) => group.id === run.hostGroupId)?.name;
  const pct = (value: number) => `${total > 0 ? (value / total) * 100 : 0}%`;

  return (
    <div className="br">
      <div className="br-banner">
        <div className="lead">
          <div className="toprow">
            {live ? (
              <span className="br-state live">
                <span className="sdot" />
                {t("itops.batchRuns.stateRunning")}
              </span>
            ) : run.state === "canceled" ? (
              <span className="br-state done-fail">
                <span className="sdot" />
                {t("itops.batchRuns.stateCanceled")}
              </span>
            ) : tally.failed ? (
              <span className="br-state done-fail">
                <span className="sdot" />
                {t("itops.batchRuns.stateCompletedWithFailures")}
              </span>
            ) : (
              <span className="br-state done">
                <span className="sdot" />
                {t("itops.batchRuns.stateCompleted")}
              </span>
            )}
            {groupName ? (
              <span className="grpname">
                {groupName}
                <span className="arrow">›</span>
                <span className="count">{t("itops.batchRuns.hostsCount", { count: total })}</span>
              </span>
            ) : (
              <span className="grpname">
                <span className="count">{t("itops.batchRuns.hostsCount", { count: total })}</span>
              </span>
            )}
          </div>
          <div className="br-cmd">
            <span className="dollar">$</span>
            <span className="body">{run.taskSummary}</span>
          </div>
        </div>
        <div className="stat-cluster">
          <div className="br-stat ok">
            <div className="num">{tally.ok}</div>
            <div className="lab">{t("itops.batchRuns.statOk")}</div>
          </div>
          <div className="br-stat fail">
            <div className="num">{tally.failed}</div>
            <div className="lab">{t("itops.batchRuns.statFailed")}</div>
          </div>
          {live ? (
            <div className="br-stat run">
              <div className="num">{tally.running + tally.pending}</div>
              <div className="lab">{t("itops.batchRuns.statInFlight")}</div>
            </div>
          ) : (
            <div className="br-stat">
              <div className="num">{total}</div>
              <div className="lab">{t("itops.batchRuns.statTotal")}</div>
            </div>
          )}
        </div>
        <div className="actions">
          {live ? (
            <button type="button" className="it-btn" onClick={() => void cancelRun(run.runId)}>
              <span className="it-btn-ic">
                <ItIcon name="stop" size={13} />
              </span>
              {t("itops.actions.cancel")}
            </button>
          ) : (
            <button
              type="button"
              className="it-btn"
              onClick={() => requestNewBatchRun(run.hostGroupId ?? undefined)}
            >
              <span className="it-btn-ic">
                <ItIcon name="rerun" size={14} />
              </span>
              {t("itops.actions.rerun")}
            </button>
          )}
        </div>
      </div>

      <div className="br-progress">
        <div className="track">
          <div className="fill-ok" style={{ width: pct(tally.ok) }} />
          <div className="fill-fail" style={{ width: pct(tally.failed) }} />
          {live ? <div className="fill-run" style={{ width: pct(tally.running) }} /> : null}
        </div>
        <div className="meta">
          <div className="legend">
            <span className="lg ok">
              <i />
              {t("itops.batchRuns.legendOk", { count: tally.ok })}
            </span>
            <span className="lg fail">
              <i />
              {t("itops.batchRuns.legendFailed", { count: tally.failed })}
            </span>
            {live ? (
              <span className="lg run">
                <i />
                {t("itops.batchRuns.legendRunning", { count: tally.running })}
              </span>
            ) : null}
            {live && tally.pending > 0 ? (
              <span className="lg pend">
                <i />
                {t("itops.batchRuns.legendQueued", { count: tally.pending })}
              </span>
            ) : null}
          </div>
          <span>
            {live
              ? t("itops.batchRuns.progressLive", {
                  done,
                  total,
                  concurrency: DEFAULT_CONCURRENCY,
                })
              : t("itops.batchRuns.progressComplete", { done, total })}
          </span>
        </div>
      </div>

      <div className="br-grid">
        {run.hosts.map((host) => (
          <HostCard key={host.connectionId} host={host} />
        ))}
      </div>

      {run.state !== "running" ? (
        <div className="br-saved">
          <span className="ic">
            <ItIcon name="history" size={16} />
          </span>
          <span>{t("itops.batchRuns.savedReport", { ok: tally.ok, total })}</span>
        </div>
      ) : null}
    </div>
  );
}

export function BatchRunsTab({ onNewBatchRun }: { onNewBatchRun: () => void }) {
  const { t } = useTranslation();
  const activeRun = useItOpsStore((state) => state.activeRun);
  const runHistory = useItOpsStore((state) => state.runHistory);

  if (activeRun) {
    return <LiveRunView run={activeRun} />;
  }

  return (
    <div className="br">
      <div className="it-empty" style={{ minHeight: 240 }}>
        <span className="glyph">
          <ItIcon name="run" size={28} sw={1.6} />
        </span>
        <h2>{t("itops.batchRuns.emptyTitle")}</h2>
        <p>{t("itops.batchRuns.emptyBody")}</p>
        <button type="button" className="it-btn primary" onClick={onNewBatchRun}>
          <span className="it-btn-ic">
            <ItIcon name="run" size={14} />
          </span>
          {t("itops.actions.startBatchRun")}
        </button>
      </div>

      {runHistory.length > 0 ? (
        <>
          <div className="it-section-label">{t("itops.batchRuns.historyHeading")}</div>
          <div className="card">
            {runHistory.map((run) => (
              <div key={run.id} className="member">
                <span className="tile">
                  <ItIcon name="history" size={15} sw={1.6} />
                </span>
                <div className="member-txt">
                  <div className="nm">{run.taskSummary}</div>
                  <div className="host">{formatTime(run.startedAt)}</div>
                </div>
                <span className="os">
                  {t("itops.batchRuns.historySummary", {
                    ok: run.report.ok,
                    total: run.report.total,
                  })}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
