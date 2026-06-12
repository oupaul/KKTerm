// Measurement loop for the Network Speedtest widget. Uses public speed-test
// endpoints over plain fetch — no SDK.
// Strictly click-to-run: callers create one runner per button press and abort
// it on unmount.

const LATENCY_SAMPLES = 6;
const DOWNLOAD_SIZES = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];
const DOWNLOAD_BUDGET_MS = 8_000;

type SpeedtestTargetKind = "cloudflare" | "librespeed";

export interface SpeedtestTarget {
  id: string;
  labelKey: string;
  region: "Automatic" | "Asia" | "Europe" | "North America" | "Africa";
  kind: SpeedtestTargetKind;
  endpoint: string;
  downloadPath?: string;
  latencyPath?: string;
}

export const SPEEDTEST_TARGETS: SpeedtestTarget[] = [
  {
    id: "cloudflare-auto",
    labelKey: "dashboard.speedtestTargets.cloudflareAuto",
    region: "Automatic",
    kind: "cloudflare",
    endpoint: "https://speed.cloudflare.com/__down",
  },
  {
    id: "librespeed-new-york",
    labelKey: "dashboard.speedtestTargets.newYork",
    region: "North America",
    kind: "librespeed",
    endpoint: "https://ny2.us.backend.librespeed.org",
    downloadPath: "garbage.php",
    latencyPath: "empty.php",
  },
  {
    id: "librespeed-los-angeles",
    labelKey: "dashboard.speedtestTargets.losAngeles",
    region: "North America",
    kind: "librespeed",
    endpoint: "https://la1.us.backend.librespeed.org",
    downloadPath: "garbage.php",
    latencyPath: "empty.php",
  },
  {
    id: "librespeed-london",
    labelKey: "dashboard.speedtestTargets.london",
    region: "Europe",
    kind: "librespeed",
    endpoint: "https://lon.speedtest.clouvider.net/backend",
    downloadPath: "garbage.php",
    latencyPath: "empty.php",
  },
  {
    id: "librespeed-frankfurt",
    labelKey: "dashboard.speedtestTargets.frankfurt",
    region: "Europe",
    kind: "librespeed",
    endpoint: "https://fra.speedtest.clouvider.net/backend",
    downloadPath: "garbage.php",
    latencyPath: "empty.php",
  },
  {
    id: "librespeed-tokyo",
    labelKey: "dashboard.speedtestTargets.tokyo",
    region: "Asia",
    kind: "librespeed",
    endpoint: "https://librespeed.a573.net",
    downloadPath: "backend/garbage.php",
    latencyPath: "backend/empty.php",
  },
  {
    id: "librespeed-singapore",
    labelKey: "dashboard.speedtestTargets.singapore",
    region: "Asia",
    kind: "librespeed",
    endpoint: "https://speedtest.dsgroupmedia.com",
    downloadPath: "backend/garbage.php",
    latencyPath: "backend/empty.php",
  },
  {
    id: "librespeed-johannesburg",
    labelKey: "dashboard.speedtestTargets.johannesburg",
    region: "Africa",
    kind: "librespeed",
    endpoint: "https://za1.backend.librespeed.org",
    downloadPath: "garbage.php",
    latencyPath: "empty.php",
  },
];

export interface SpeedtestProgress {
  phase: "latency" | "download";
  /** Best latency so far, in ms (null until first sample). */
  latencyMs: number | null;
  /** Mean deviation between latency samples, in ms. */
  jitterMs: number | null;
  /** Live download estimate, in Mbps. */
  downloadMbps: number | null;
}

export interface SpeedtestResult {
  latencyMs: number;
  jitterMs: number;
  downloadMbps: number;
}

export async function runSpeedtest(
  signal: AbortSignal,
  onProgress: (progress: SpeedtestProgress) => void,
  target: SpeedtestTarget = SPEEDTEST_TARGETS[0],
): Promise<SpeedtestResult> {
  // Phase 1: latency — small sequential requests, best sample wins.
  const samples: number[] = [];
  for (let i = 0; i < LATENCY_SAMPLES; i++) {
    const start = performance.now();
    const response = await fetch(buildSpeedtestLatencyUrl(target, i, Date.now()), {
      signal,
      cache: "no-store",
    });
    await response.arrayBuffer();
    samples.push(performance.now() - start);
    onProgress({
      phase: "latency",
      latencyMs: Math.min(...samples),
      jitterMs: jitter(samples),
      downloadMbps: null,
    });
  }
  const latencyMs = Math.min(...samples);
  const jitterMs = jitter(samples);

  // Phase 2: download — progressively larger transfers until the time budget
  // is spent. Speed is computed over all bytes streamed so far.
  let totalBytes = 0;
  const downloadStart = performance.now();
  let downloadMbps = 0;

  for (const size of DOWNLOAD_SIZES) {
    if (performance.now() - downloadStart > DOWNLOAD_BUDGET_MS) break;
    const response = await fetch(buildSpeedtestDownloadUrl(target, size, Date.now()), {
      signal,
      cache: "no-store",
    });
    if (!response.body) {
      await response.arrayBuffer();
      totalBytes += size;
    } else {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        const elapsedSeconds = (performance.now() - downloadStart) / 1000;
        if (elapsedSeconds > 0.2) {
          downloadMbps = (totalBytes * 8) / elapsedSeconds / 1_000_000;
          onProgress({ phase: "download", latencyMs, jitterMs, downloadMbps });
        }
      }
    }
    const elapsedSeconds = (performance.now() - downloadStart) / 1000;
    downloadMbps = (totalBytes * 8) / elapsedSeconds / 1_000_000;
    onProgress({ phase: "download", latencyMs, jitterMs, downloadMbps });
  }

  return {
    latencyMs: Math.round(latencyMs),
    jitterMs: Math.round(jitterMs * 10) / 10,
    downloadMbps: Math.round(downloadMbps * 10) / 10,
  };
}

function jitter(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return samples.reduce((sum, value) => sum + Math.abs(value - mean), 0) / samples.length;
}

export function buildSpeedtestLatencyUrl(target: SpeedtestTarget, sampleIndex: number, cacheBust: number): string {
  if (target.kind === "cloudflare") {
    return withQuery(target.endpoint, { bytes: "0", cacheBust: `${cacheBust}-${sampleIndex}` });
  }
  return withQuery(joinUrl(target.endpoint, target.latencyPath ?? "empty.php"), {
    cacheBust: `${cacheBust}-${sampleIndex}`,
  });
}

export function buildSpeedtestDownloadUrl(target: SpeedtestTarget, bytes: number, cacheBust: number): string {
  if (target.kind === "cloudflare") {
    return withQuery(target.endpoint, { bytes: String(bytes), cacheBust: String(cacheBust) });
  }
  return withQuery(joinUrl(target.endpoint, target.downloadPath ?? "garbage.php"), {
    ckSize: String(Math.max(1, Math.round(bytes / 1_000_000))),
    cacheBust: String(cacheBust),
  });
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function withQuery(url: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${url}?${search.toString()}`;
}

/** Maps a speed in Mbps onto a 0..1 gauge position using a log scale to 1000. */
export function gaugePosition(mbps: number): number {
  if (mbps <= 0) return 0;
  return Math.min(1, Math.log10(1 + mbps) / 3);
}
