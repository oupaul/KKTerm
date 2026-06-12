import { Play, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { SPEEDTEST_TARGETS, gaugePosition, runSpeedtest } from "./speedtestRunner";
import type { SpeedtestResult } from "./speedtestRunner";

type TestState =
  | { phase: "idle" }
  | { phase: "latency" }
  | { phase: "download" }
  | { phase: "done"; result: SpeedtestResult }
  | { phase: "error" };

const GAUGE_TICKS = [0, 1, 10, 100, 1000];

function tickLabel(value: number): string {
  return value >= 1000 ? "1G" : String(value);
}

export function SpeedtestBody(_props: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<TestState>({ phase: "idle" });
  const [liveMbps, setLiveMbps] = useState(0);
  const [liveLatency, setLiveLatency] = useState<number | null>(null);
  const [liveJitter, setLiveJitter] = useState<number | null>(null);
  const [targetId, setTargetId] = useState(SPEEDTEST_TARGETS[0].id);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function start() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLiveMbps(0);
    setLiveLatency(null);
    setLiveJitter(null);
    setState({ phase: "latency" });
    try {
      const target = SPEEDTEST_TARGETS.find((item) => item.id === targetId) ?? SPEEDTEST_TARGETS[0];
      const result = await runSpeedtest(controller.signal, (progress) => {
        setState((current) =>
          current.phase === progress.phase ? current : { phase: progress.phase },
        );
        setLiveLatency(progress.latencyMs);
        setLiveJitter(progress.jitterMs);
        if (progress.downloadMbps !== null) setLiveMbps(progress.downloadMbps);
      }, target);
      setLiveMbps(result.downloadMbps);
      setState({ phase: "done", result });
    } catch {
      if (!controller.signal.aborted) setState({ phase: "error" });
    }
  }

  const running = state.phase === "latency" || state.phase === "download";
  const needleAngle = -90 + gaugePosition(liveMbps) * 180;
  const displayMbps =
    state.phase === "done" ? state.result.downloadMbps : Math.round(liveMbps * 10) / 10;
  const latency = state.phase === "done" ? state.result.latencyMs : liveLatency;
  const jitterValue = state.phase === "done" ? state.result.jitterMs : liveJitter;

  return (
    <div className={`dw-speedtest${running ? " is-running" : ""}`}>
      <div className="dw-speedtest-gauge-wrap">
        <svg className="dw-speedtest-gauge" viewBox="0 0 200 116" role="img" aria-label={t("dashboard.speedtestTitle")}>
          <path
            className="dw-speedtest-arc"
            d="M 16 100 A 84 84 0 0 1 184 100"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            className="dw-speedtest-arc-fill"
            d="M 16 100 A 84 84 0 0 1 184 100"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${gaugePosition(liveMbps)} 1`}
          />
          {GAUGE_TICKS.map((tick) => {
            const angle = (-90 + gaugePosition(tick) * 180) * (Math.PI / 180);
            const x = 100 + Math.sin(angle) * 70;
            const y = 100 - Math.cos(angle) * 70;
            return (
              <text key={tick} className="dw-speedtest-tick" x={x} y={y} textAnchor="middle">
                {tickLabel(tick)}
              </text>
            );
          })}
          <g className="dw-speedtest-needle" style={{ transform: `rotate(${needleAngle}deg)` }}>
            <line x1="100" y1="100" x2="100" y2="28" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="5" />
          </g>
        </svg>
        <div className="dw-speedtest-readout">
          <span className="dw-speedtest-mbps">{running || state.phase === "done" ? displayMbps : "—"}</span>
          <span className="dw-speedtest-unit">Mbps</span>
        </div>
      </div>
      <div className="dw-speedtest-stats">
        <div className="dw-speedtest-stat">
          <span className="dw-speedtest-stat-label">{t("dashboard.speedtestLatency")}</span>
          <span className="dw-speedtest-stat-value">
            {latency !== null && latency !== undefined ? `${Math.round(latency)} ms` : "—"}
          </span>
        </div>
        <div className="dw-speedtest-stat">
          <span className="dw-speedtest-stat-label">{t("dashboard.speedtestJitter")}</span>
          <span className="dw-speedtest-stat-value">
            {jitterValue !== null && jitterValue !== undefined ? `${Math.round(jitterValue * 10) / 10} ms` : "—"}
          </span>
        </div>
      </div>
      <label className="dw-speedtest-target">
        <span>{t("dashboard.speedtestTargetLabel")}</span>
        <select
          value={targetId}
          disabled={running}
          onChange={(event) => setTargetId(event.currentTarget.value)}
        >
          {SPEEDTEST_TARGETS.map((target) => (
            <option key={target.id} value={target.id}>
              {t(target.labelKey)}
            </option>
          ))}
        </select>
      </label>
      <div className="dw-speedtest-footer">
        {state.phase === "error" ? (
          <span className="dw-speedtest-error">{t("dashboard.speedtestError")}</span>
        ) : running ? (
          <span className="dw-speedtest-phase">
            {state.phase === "latency"
              ? t("dashboard.speedtestPhaseLatency")
              : t("dashboard.speedtestPhaseDownload")}
          </span>
        ) : (
          <span className="dw-speedtest-note">{t("dashboard.speedtestNote")}</span>
        )}
        <button
          type="button"
          className="secondary-button dw-speedtest-start"
          disabled={running}
          onClick={() => void start()}
        >
          {state.phase === "idle" || state.phase === "error" ? (
            <>
              <Play size={12} />
              {t("dashboard.speedtestStart")}
            </>
          ) : (
            <>
              <RefreshCw size={12} className={running ? "dw-speedtest-spin" : undefined} />
              {t("dashboard.speedtestRetest")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
