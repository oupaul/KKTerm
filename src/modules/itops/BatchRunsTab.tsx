// Batch Runs tab (hero) — per-host live grid with status chips, a progress
// roll-up and expandable streamed output, plus the saved-report view. Ported
// from the redesign mockup (itops-batchruns.jsx). Phase 0 renders against the
// placeholder run in data.ts; Phase 2 feeds it from the live itops://run
// event channel (see docs/ITOPS.md).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ItIcon, type ItIconName } from "./icons";
import { TransportChip } from "./TransportChip";
import {
  RUN_HEADER,
  RUN_HOSTS,
  RUN_OUTPUT,
  type OutputToken,
  type RunHost,
  type RunStatus,
  type Transport,
} from "./data";

type RunStateView = "live" | "report";
type TransportMix = "ssh" | "mixed";

const ST_ICON: Record<RunStatus, ItIconName> = {
  ok: "check",
  failed: "xmark",
  running: "spinner",
  pending: "pending",
};
const ST_CODE: Record<RunStatus, string> = {
  ok: "ok",
  failed: "fail",
  running: "run",
  pending: "pend",
};

function OutLine({ parts }: { parts: OutputToken[] }) {
  if (!parts.length) {
    return <span className="line">{" "}</span>;
  }
  return (
    <span className="line">
      {parts.map((p, i) =>
        "cursor" in p ? (
          <span key={i} className="cursor" />
        ) : (
          <span key={i} className={p.cls}>
            {p.txt}
          </span>
        ),
      )}
    </span>
  );
}

function HostCard({
  row,
  state,
  mix,
  openDefault,
}: {
  row: RunHost;
  state: RunStateView;
  mix: TransportMix;
  openDefault: boolean;
}) {
  const { t } = useTranslation();
  const s = row[state];
  const hasOut = !!RUN_OUTPUT[row.id];
  const [open, setOpen] = useState(openDefault && hasOut);
  const transport: Transport = mix === "ssh" ? "ssh" : row.transport;
  const codeTxt =
    s.status === "ok" || s.status === "failed"
      ? t("itops.batchRuns.codeExit", { code: s.code })
      : s.status === "running"
        ? t("itops.batchRuns.codeRunning")
        : t("itops.batchRuns.codeQueued");

  return (
    <div className={`host-card ${s.status}`}>
      <button
        type="button"
        className={`host-row${open ? " open" : ""}`}
        onClick={() => hasOut && setOpen((o) => !o)}
      >
        <span className="chev" style={{ visibility: hasOut ? "visible" : "hidden" }}>
          <ItIcon name="chevR" size={15} />
        </span>
        <span className={`st-badge ${s.status}`}>
          <ItIcon
            name={ST_ICON[s.status]}
            size={15}
            sw={s.status === "ok" || s.status === "failed" ? 2.4 : 1.8}
          />
        </span>
        <span className="hname">{row.name}</span>
        <span className="haddr">{row.host}</span>
        <TransportChip transport={transport} />
        <span className="hsp" />
        {s.note ? <span className="hnote">{s.note}</span> : null}
        {s.dur ? <span className="hdur">{s.dur}</span> : null}
        <span className={`hcode ${ST_CODE[s.status]}`}>{codeTxt}</span>
      </button>
      {open && hasOut ? (
        <div className="host-out">
          {RUN_OUTPUT[row.id].map((parts, i) => (
            <OutLine key={i} parts={parts} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BatchRunsTab({
  empty,
  runState = "live",
  transportMix = "mixed",
}: {
  empty: boolean;
  runState?: RunStateView;
  transportMix?: TransportMix;
}) {
  const { t } = useTranslation();

  if (empty) {
    return (
      <div className="it-empty">
        <span className="glyph">
          <ItIcon name="run" size={28} sw={1.6} />
        </span>
        <h2>{t("itops.batchRuns.emptyTitle")}</h2>
        <p>{t("itops.batchRuns.emptyBody")}</p>
        <button type="button" className="it-btn primary">
          <span className="it-btn-ic">
            <ItIcon name="run" size={14} />
          </span>
          {t("itops.actions.startBatchRun")}
        </button>
      </div>
    );
  }

  const live = runState === "live";
  const rows = RUN_HOSTS;
  const tally = rows.reduce(
    (a, r) => {
      a[r[runState].status] += 1;
      return a;
    },
    { ok: 0, failed: 0, running: 0, pending: 0 } as Record<RunStatus, number>,
  );
  const total = rows.length;
  const done = tally.ok + tally.failed;
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className="br">
      {/* summary banner */}
      <div className="br-banner">
        <div className="lead">
          <div className="toprow">
            {live ? (
              <span className="br-state live">
                <span className="sdot" />
                {t("itops.batchRuns.stateRunning")}
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
            <span className="grpname">
              {RUN_HEADER.group}
              <span className="arrow">›</span>
              <span className="count">{t("itops.batchRuns.hostsCount", { count: total })}</span>
            </span>
          </div>
          <div className="br-cmd">
            <span className="dollar">$</span>
            <span className="body">{RUN_HEADER.task}</span>
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
            <button type="button" className="it-btn">
              <span className="it-btn-ic">
                <ItIcon name="stop" size={13} />
              </span>
              {t("itops.actions.cancel")}
            </button>
          ) : (
            <button type="button" className="it-btn">
              <span className="it-btn-ic">
                <ItIcon name="rerun" size={14} />
              </span>
              {t("itops.actions.rerun")}
            </button>
          )}
        </div>
      </div>

      {/* progress */}
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
              ? t("itops.batchRuns.progressLive", { done, total, concurrency: 4 })
              : t("itops.batchRuns.progressDone", {
                  duration: "1m 38s",
                  time: RUN_HEADER.startedAt,
                })}
          </span>
        </div>
      </div>

      {/* per-host grid */}
      <div className="br-grid">
        {rows.map((r) => (
          <HostCard
            key={r.id}
            row={r}
            state={runState}
            mix={transportMix}
            openDefault={!!r.expanded}
          />
        ))}
      </div>

      {/* report footer */}
      {!live ? (
        <div className="br-saved">
          <span className="ic">
            <ItIcon name="history" size={16} />
          </span>
          <span>{t("itops.batchRuns.savedReport", { ok: tally.ok, total })}</span>
          <span className="sp" />
          <button type="button" className="it-btn">
            <span className="it-btn-ic">
              <ItIcon name="code" size={13} />
            </span>
            {t("itops.actions.viewReport")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
