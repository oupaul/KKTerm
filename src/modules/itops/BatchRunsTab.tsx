// Batch Runs tab (hero) — the live per-host grid with status chips, a progress
// roll-up and live streamed output, fed by the `itops://run` event stream via
// useItOpsStore (docs/ITOPS.md Phase 2). When idle it shows the empty state plus
// a compact recent-runs list from itops_run_history; clicking a past run opens
// its saved Run Report (per-host output included).

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { HostReport, RunHistoryEntry } from "../../types";
import { ItIcon, type ItIconName } from "./icons";
import { TransportChip } from "./TransportChip";
import { ItOpsEmptyHint } from "./ItOpsEmptyHint";
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

// Present a persisted HostReport row through the same card the live run uses.
function reportHostToLive(report: HostReport): LiveRunHost {
  return {
    connectionId: report.connectionId,
    name: report.name,
    host: report.host,
    transport: report.transport,
    status: report.ok ? "ok" : "failed",
    exitCode: report.exitCode,
    output: report.output ?? "",
    durationMs: report.durationMs,
    error: report.error,
  };
}

function HostCard({ host }: { host: LiveRunHost }) {
  const { t } = useTranslation();
  const hasOutput = host.status === "ok" || host.status === "failed" || host.status === "running";
  // Reveal output as soon as a host starts running (so streamed output is
  // visible without a click) and keep it open through completion; failures stay
  // open too. The user can still collapse a card manually.
  const [open, setOpen] = useState(host.status === "running" || host.status === "failed");
  const prevStatus = useRef(host.status);
  useEffect(() => {
    if (host.status !== prevStatus.current) {
      prevStatus.current = host.status;
      if (host.status === "running" || host.status === "failed") {
        setOpen(true);
      }
    }
  }, [host.status]);

  // Keep the newest streamed line in view while the host is running.
  const outRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (open && host.status === "running" && outRef.current) {
      outRef.current.scrollTop = outRef.current.scrollHeight;
    }
  }, [open, host.status, host.output]);

  const codeText =
    (host.status === "ok" || host.status === "failed") && host.exitCode != null
      ? t("itops.batchRuns.codeExit", { code: host.exitCode })
      : host.status === "failed"
        ? t("itops.batchRuns.codeFailed")
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
        <div className="host-out" ref={outRef}>
          {lines.length > 0 ? (
            lines.map((line, index) => (
              <span key={index} className="line">
                {line || " "}
              </span>
            ))
          ) : (
            <span className="line c-dim">
              {host.status === "running"
                ? t("itops.batchRuns.waitingOutput")
                : t("itops.batchRuns.noOutput")}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LiveRunView({ run }: { run: LiveRun }) {
  const { t } = useTranslation();
  const sites = useItOpsStore((state) => state.sites);
  const cancelRun = useItOpsStore((state) => state.cancelRun);

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
  const groupName = sites.find((group) => group.id === run.siteId)?.name;
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
          ) : null}
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

// Read-only viewer for a past run, opened from the recent-runs list. Mirrors the
// live banner but is driven by the persisted RunReport (per-host output included).
function RunReportView({ entry, onBack }: { entry: RunHistoryEntry; onBack: () => void }) {
  const { t } = useTranslation();
  const report = entry.report;
  const hosts = report.hosts.map(reportHostToLive);
  const total = report.total;
  const pct = (value: number) => `${total > 0 ? (value / total) * 100 : 0}%`;

  return (
    <div className="br">
      <div className="br-banner">
        <div className="lead">
          <div className="toprow">
            <button type="button" className="it-btn ghost br-back" onClick={onBack}>
              <span className="it-btn-ic">
                <ItIcon name="chevL" size={15} />
              </span>
              {t("itops.actions.back")}
            </button>
            {report.failed ? (
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
            <span className="grpname">
              <span className="count">{t("itops.batchRuns.hostsCount", { count: total })}</span>
            </span>
          </div>
          <div className="br-cmd">
            <span className="dollar">$</span>
            <span className="body">{entry.taskSummary}</span>
          </div>
          <div className="br-report-meta">
            {t("itops.batchRuns.reportStarted", { time: formatTime(entry.startedAt) })}
          </div>
        </div>
        <div className="stat-cluster">
          <div className="br-stat ok">
            <div className="num">{report.ok}</div>
            <div className="lab">{t("itops.batchRuns.statOk")}</div>
          </div>
          <div className="br-stat fail">
            <div className="num">{report.failed}</div>
            <div className="lab">{t("itops.batchRuns.statFailed")}</div>
          </div>
          <div className="br-stat">
            <div className="num">{total}</div>
            <div className="lab">{t("itops.batchRuns.statTotal")}</div>
          </div>
        </div>
      </div>

      <div className="br-progress">
        <div className="track">
          <div className="fill-ok" style={{ width: pct(report.ok) }} />
          <div className="fill-fail" style={{ width: pct(report.failed) }} />
        </div>
        <div className="meta">
          <div className="legend">
            <span className="lg ok">
              <i />
              {t("itops.batchRuns.legendOk", { count: report.ok })}
            </span>
            <span className="lg fail">
              <i />
              {t("itops.batchRuns.legendFailed", { count: report.failed })}
            </span>
          </div>
          <span>{t("itops.batchRuns.progressComplete", { done: report.ok + report.failed, total })}</span>
        </div>
      </div>

      <div className="br-grid">
        {hosts.map((host) => (
          <HostCard key={host.connectionId} host={host} />
        ))}
      </div>
    </div>
  );
}

function RunHistoryHeader() {
  const { t } = useTranslation();
  return (
    <div className="it-destination-page-head">
      <div>
        <h2>{t("itops.navigation.runHistory")}</h2>
        <p>{t("itops.batchRuns.historyDescription")}</p>
      </div>
    </div>
  );
}

export function BatchRunsTab({ siteId }: {
  /** When set, only runs targeting this Site are shown. */
  siteId?: string;
}) {
  const { t } = useTranslation();
  const activeRun = useItOpsStore((state) => state.activeRun);
  const allRunHistory = useItOpsStore((state) => state.runHistory);
  const runHistory = siteId
    ? allRunHistory.filter((entry) => entry.siteId === siteId)
    : allRunHistory;
  const [openReport, setOpenReport] = useState<RunHistoryEntry | null>(null);

  if (activeRun && (!siteId || activeRun.siteId === siteId)) {
    return <div className="it-destination-surface"><RunHistoryHeader /><LiveRunView run={activeRun} /></div>;
  }

  if (openReport) {
    return <div className="it-destination-surface"><RunHistoryHeader /><RunReportView entry={openReport} onBack={() => setOpenReport(null)} /></div>;
  }

  return (
    <div className="br it-destination-surface">
      <RunHistoryHeader />
      {runHistory.length === 0 ? (
        <ItOpsEmptyHint>{t("itops.batchRuns.historyEmptyHint")}</ItOpsEmptyHint>
      ) : null}

      {runHistory.length > 0 ? (
        <>
          <div className="it-section-label">{t("itops.batchRuns.historyHeading")}</div>
          <div className="card">
            {runHistory.map((run) => (
              <button
                key={run.id}
                type="button"
                className="member as-button"
                onClick={() => setOpenReport(run)}
              >
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
                <span className="member-go">
                  <ItIcon name="chevR" size={15} />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
