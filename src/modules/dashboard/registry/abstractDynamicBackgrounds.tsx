import { useEffect, useRef } from "react";
import { dynamicBackgroundDevicePixelRatio } from "./dynamicBackgroundCanvas";
import { useDashboardAnimationActive } from "../view/animationGating";

interface CanvasAnimLifecycle {
  onResize?: (width: number, height: number, ctx: CanvasRenderingContext2D) => void;
}

type CanvasDraw<State extends CanvasAnimLifecycle> = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  state: State,
) => void;

function useAbstractCanvasAnim<State extends CanvasAnimLifecycle>(draw: CanvasDraw<State>) {
  const active = useDashboardAnimationActive();
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const ref = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  const runtimeRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const canvasElement = ref.current;
    const parentElement = canvasElement?.parentElement;
    if (!canvasElement || !parentElement) return;
    const context = canvasElement.getContext("2d");
    if (!context) return;
    const canvas = canvasElement;
    const parent = parentElement;
    const ctx = context;

    let raf = 0;
    let width = 0;
    let height = 0;
    let elapsed = 0;
    let lastNow = 0;
    const dpr = dynamicBackgroundDevicePixelRatio(window.devicePixelRatio);
    const state = {} as State;

    function resize() {
      const rect = parent.getBoundingClientRect();
      width = Math.max(2, Math.floor(rect.width));
      height = Math.max(2, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.onResize?.(width, height, ctx);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    drawRef.current(ctx, 0, 0, 0, state);
    resize();

    function frame(now: number) {
      const dt = lastNow ? (now - lastNow) / 1000 : 0;
      lastNow = now;
      elapsed += Math.min(dt, 0.05);
      drawRef.current(ctx, width, height, elapsed, state);
      raf = activeRef.current ? requestAnimationFrame(frame) : 0;
    }

    function start() {
      if (raf || !activeRef.current) return;
      lastNow = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      lastNow = 0;
    }

    runtimeRef.current = { start, stop };
    if (activeRef.current) start();

    return () => {
      stop();
      resizeObserver.disconnect();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (active) runtime.start();
    else runtime.stop();
  }, [active]);

  return ref;
}

type CircuitPoint = readonly [number, number];

interface CircuitPath {
  pts: CircuitPoint[];
  len: number;
}

interface CircuitPulse {
  path: CircuitPath;
  d: number;
  v: number;
  hue: number;
}

interface CircuitState extends CanvasAnimLifecycle {
  paths?: CircuitPath[];
  pulses?: CircuitPulse[];
  last?: number;
}

function initCircuit(state: CircuitState, width: number, height: number, time: number) {
  const gap = 36;
  const cols = Math.ceil(width / gap) + 1;
  const rows = Math.ceil(height / gap) + 1;
  const paths: CircuitPath[] = [];
  const dirs: CircuitPoint[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let pathIndex = 0; pathIndex < 34; pathIndex += 1) {
    let cellX = Math.floor(Math.random() * cols);
    let cellY = Math.floor(Math.random() * rows);
    let dir = dirs[Math.floor(Math.random() * dirs.length)];
    const pts: CircuitPoint[] = [[cellX * gap, cellY * gap]];
    let len = 0;
    const segments = 5 + Math.floor(Math.random() * 9);
    for (let segmentIndex = 0; segmentIndex < segments; segmentIndex += 1) {
      const run = 1 + Math.floor(Math.random() * 4);
      cellX += dir[0] * run;
      cellY += dir[1] * run;
      cellX = Math.max(0, Math.min(cols, cellX));
      cellY = Math.max(0, Math.min(rows, cellY));
      const last = pts[pts.length - 1];
      const nextX = cellX * gap;
      const nextY = cellY * gap;
      if (nextX !== last[0] || nextY !== last[1]) {
        len += Math.abs(nextX - last[0]) + Math.abs(nextY - last[1]);
        pts.push([nextX, nextY]);
      }
      dir = dir[0] !== 0
        ? (Math.random() > 0.5 ? dirs[2] : dirs[3])
        : (Math.random() > 0.5 ? dirs[0] : dirs[1]);
    }
    if (pts.length > 2 && len > 0) paths.push({ pts, len });
  }
  if (paths.length === 0) {
    paths.push({ pts: [[0, height / 2], [width / 2, height / 2], [width / 2, 0], [width, 0]], len: width + height / 2 });
  }
  state.paths = paths;
  state.pulses = Array.from({ length: 26 }, () => {
    const path = paths[Math.floor(Math.random() * paths.length)];
    return {
      path,
      d: Math.random() * path.len,
      v: (60 + Math.random() * 160) * (Math.random() > 0.5 ? 1 : -1),
      hue: Math.random() > 0.25 ? 160 : 200 + Math.random() * 20,
    };
  });
  state.last = time;
}

function pointAtCircuitPath(path: CircuitPath, distance: number): CircuitPoint {
  let remaining = ((distance % path.len) + path.len) % path.len;
  for (let index = 1; index < path.pts.length; index += 1) {
    const a = path.pts[index - 1];
    const b = path.pts[index];
    const segment = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (remaining <= segment) {
      const fraction = segment ? remaining / segment : 0;
      return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
    }
    remaining -= segment;
  }
  return path.pts[path.pts.length - 1];
}

export function CircuitBg() {
  const draw: CanvasDraw<CircuitState> = (ctx, width, height, time, state) => {
    state.onResize = (nextWidth, nextHeight) => initCircuit(state, nextWidth, nextHeight, time);
    if (!state.paths || !state.pulses) return;
    const dt = Math.min(0.05, time - (state.last ?? time));
    state.last = time;

    ctx.fillStyle = "#080d12";
    ctx.fillRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(38, 74, 78, 0.55)";
    for (const path of state.paths) {
      ctx.beginPath();
      ctx.moveTo(path.pts[0][0], path.pts[0][1]);
      for (let index = 1; index < path.pts.length; index += 1) ctx.lineTo(path.pts[index][0], path.pts[index][1]);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(60, 110, 112, 0.7)";
    for (const path of state.paths) {
      for (const endpoint of [path.pts[0], path.pts[path.pts.length - 1]]) {
        ctx.beginPath();
        ctx.arc(endpoint[0], endpoint[1], 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = "lighter";
    for (const pulse of state.pulses) {
      pulse.d += pulse.v * dt;
      for (let sample = 5; sample >= 0; sample -= 1) {
        const back = pulse.d - Math.sign(pulse.v) * sample * 6;
        const [x, y] = pointAtCircuitPath(pulse.path, back);
        const alpha = 0.85 * (1 - sample / 6);
        ctx.fillStyle = `hsla(${pulse.hue}, 95%, 65%, ${(alpha * 0.45).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.4 - sample * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      const [headX, headY] = pointAtCircuitPath(pulse.path, pulse.d);
      const glow = ctx.createRadialGradient(headX, headY, 0, headX, headY, 8);
      glow.addColorStop(0, `hsla(${pulse.hue}, 100%, 80%, 0.95)`);
      glow.addColorStop(1, `hsla(${pulse.hue}, 100%, 65%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(headX, headY, 8, 0, Math.PI * 2);
      ctx.fill();
      if (Math.random() < 0.002) {
        pulse.path = state.paths[Math.floor(Math.random() * state.paths.length)];
        pulse.d = Math.random() * pulse.path.len;
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };
  const ref = useAbstractCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

export function HalftoneBg() {
  const draw: CanvasDraw<CanvasAnimLifecycle> = (ctx, width, height, time) => {
    ctx.fillStyle = "#efeeea";
    ctx.fillRect(0, 0, width, height);
    const gap = 26;
    const centerX = width / 2;
    const centerY = height / 2;
    for (let y = gap / 2; y < height; y += gap) {
      for (let x = gap / 2; x < width; x += gap) {
        const distance = Math.hypot(x - centerX, y - centerY);
        const value = (
          Math.sin(x * 0.016 + time * 0.9) * Math.cos(y * 0.013 - time * 0.6) * 0.5
          + Math.sin(distance * 0.014 - time * 1.1) * 0.5
        );
        const normalized = value * 0.5 + 0.5;
        const radius = 0.6 + normalized * 6.4;
        ctx.fillStyle = normalized > 0.94
          ? "rgba(10, 132, 255, 0.85)"
          : `rgba(43, 51, 64, ${(0.18 + normalized * 0.6).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const ref = useAbstractCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

interface OrbitalRing {
  r: number;
  tilt: number;
  rot: number;
  speed: number;
  parts: number[];
  hue: number;
}

interface OrbitalsState extends CanvasAnimLifecycle {
  rings?: OrbitalRing[];
}

export function OrbitalsBg() {
  const draw: CanvasDraw<OrbitalsState> = (ctx, width, height, time, state) => {
    state.onResize = () => {
      const rings: OrbitalRing[] = [];
      for (let index = 0; index < 8; index += 1) {
        const parts = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => Math.random() * Math.PI * 2);
        rings.push({
          r: 0.16 + (index / 7) * 0.78,
          tilt: 0.3 + Math.random() * 0.25,
          rot: (Math.random() - 0.5) * 0.9,
          speed: (0.08 + Math.random() * 0.22) * (Math.random() > 0.5 ? 1 : -1),
          parts,
          hue: 195 + Math.random() * 70,
        });
      }
      state.rings = rings;
    };
    if (!state.rings) return;

    const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
    bg.addColorStop(0, "#0d1122");
    bg.addColorStop(1, "#04060c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const base = Math.min(width, height) * 0.62;
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.globalCompositeOperation = "lighter";
    for (const ring of state.rings) {
      const radius = ring.r * base;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(ring.rot);
      ctx.strokeStyle = "rgba(150, 180, 255, 0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * ring.tilt, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const part of ring.parts) {
        const angle = part + time * ring.speed * 2;
        const particleX = Math.cos(angle) * radius;
        const particleY = Math.sin(angle) * radius * ring.tilt;
        ctx.strokeStyle = `hsla(${ring.hue}, 80%, 70%, 0.25)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * ring.tilt, 0, angle - 0.5, angle);
        ctx.stroke();
        const glow = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, 9);
        glow.addColorStop(0, `hsla(${ring.hue}, 90%, 80%, 0.9)`);
        glow.addColorStop(1, `hsla(${ring.hue}, 90%, 70%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 26);
    core.addColorStop(0, "rgba(210, 225, 255, 0.85)");
    core.addColorStop(0.4, "rgba(140, 170, 255, 0.25)");
    core.addColorStop(1, "rgba(140, 170, 255, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };
  const ref = useAbstractCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

interface InkBlob {
  c: string;
  r: number;
  f1: number;
  f2: number;
  p1: number;
  p2: number;
  ax: number;
  ay: number;
}

interface InkState extends CanvasAnimLifecycle {
  blobs?: InkBlob[];
}

export function InkBg() {
  const draw: CanvasDraw<InkState> = (ctx, width, height, time, state) => {
    state.onResize = () => {
      const palette = ["232, 168, 92", "216, 118, 84", "201, 148, 60", "224, 94, 74", "186, 122, 96", "233, 196, 128", "206, 100, 110"];
      state.blobs = Array.from({ length: 7 }, (_, index) => ({
        c: palette[index % palette.length],
        r: 0.16 + Math.random() * 0.14,
        f1: 0.11 + Math.random() * 0.14,
        f2: 0.09 + Math.random() * 0.12,
        p1: Math.random() * 7,
        p2: Math.random() * 7,
        ax: 0.22 + Math.random() * 0.2,
        ay: 0.2 + Math.random() * 0.18,
      }));
    };
    if (!state.blobs) return;

    ctx.fillStyle = "#f6efe6";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const minSize = Math.min(width, height);
    for (const blob of state.blobs) {
      const x = width / 2 + Math.sin(time * blob.f1 + blob.p1) * width * blob.ax;
      const y = height / 2 + Math.cos(time * blob.f2 + blob.p2) * height * blob.ay;
      const radius = blob.r * minSize * (1 + 0.12 * Math.sin(time * 0.5 + blob.p1 * 2));
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${blob.c}, 0.5)`);
      gradient.addColorStop(0.65, `rgba(${blob.c}, 0.28)`);
      gradient.addColorStop(1, `rgba(${blob.c}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  const ref = useAbstractCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

interface CrystalSeed {
  bx: number;
  by: number;
  ax: number;
  ay: number;
  f1: number;
  f2: number;
  p1: number;
  p2: number;
  hue: number;
  l: number;
}

interface CrystalsState extends CanvasAnimLifecycle {
  seeds?: CrystalSeed[];
}

type CrystalPoint = readonly [number, number];

export function CrystalsBg() {
  const draw: CanvasDraw<CrystalsState> = (ctx, width, height, time, state) => {
    state.onResize = () => {
      state.seeds = Array.from({ length: 16 }, () => ({
        bx: Math.random(),
        by: Math.random(),
        ax: 0.03 + Math.random() * 0.06,
        ay: 0.03 + Math.random() * 0.06,
        f1: 0.15 + Math.random() * 0.25,
        f2: 0.12 + Math.random() * 0.22,
        p1: Math.random() * 7,
        p2: Math.random() * 7,
        hue: 168 + Math.random() * 50,
        l: 8 + Math.random() * 9,
      }));
    };
    if (!state.seeds) return;

    const points: CrystalPoint[] = state.seeds.map((seed) => [
      (seed.bx + Math.sin(time * seed.f1 + seed.p1) * seed.ax) * width,
      (seed.by + Math.cos(time * seed.f2 + seed.p2) * seed.ay) * height,
    ]);
    ctx.fillStyle = "#060b0d";
    ctx.fillRect(0, 0, width, height);
    const pad = Math.max(width, height) * 0.25;

    for (let seedIndex = 0; seedIndex < points.length; seedIndex += 1) {
      let polygon: CrystalPoint[] = [[-pad, -pad], [width + pad, -pad], [width + pad, height + pad], [-pad, height + pad]];
      const [seedX, seedY] = points[seedIndex];
      for (let otherIndex = 0; otherIndex < points.length && polygon.length; otherIndex += 1) {
        if (otherIndex === seedIndex) continue;
        const midX = (seedX + points[otherIndex][0]) / 2;
        const midY = (seedY + points[otherIndex][1]) / 2;
        const normalX = points[otherIndex][0] - seedX;
        const normalY = points[otherIndex][1] - seedY;
        const next: CrystalPoint[] = [];
        for (let pointIndex = 0; pointIndex < polygon.length; pointIndex += 1) {
          const a = polygon[pointIndex];
          const b = polygon[(pointIndex + 1) % polygon.length];
          const da = (a[0] - midX) * normalX + (a[1] - midY) * normalY;
          const db = (b[0] - midX) * normalX + (b[1] - midY) * normalY;
          if (da <= 0) next.push(a);
          if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
            const fraction = da / (da - db);
            next.push([a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction]);
          }
        }
        polygon = next;
      }
      if (polygon.length < 3) continue;
      const seed = state.seeds[seedIndex];
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.6 + seed.p1 * 3);
      ctx.beginPath();
      ctx.moveTo(polygon[0][0], polygon[0][1]);
      for (let pointIndex = 1; pointIndex < polygon.length; pointIndex += 1) ctx.lineTo(polygon[pointIndex][0], polygon[pointIndex][1]);
      ctx.closePath();
      const gradient = ctx.createRadialGradient(seedX, seedY, 0, seedX, seedY, Math.min(width, height) * 0.28);
      gradient.addColorStop(0, `hsla(${seed.hue}, 55%, ${seed.l + pulse * 4}%, 1)`);
      gradient.addColorStop(1, `hsla(${seed.hue}, 60%, ${seed.l * 0.45}%, 1)`);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = `hsla(${seed.hue + 8}, 90%, ${58 + pulse * 14}%, ${(0.5 + pulse * 0.35).toFixed(3)})`;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < points.length; index += 1) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.9 + state.seeds[index].p2 * 3);
      ctx.fillStyle = `rgba(225, 255, 250, ${(0.35 + pulse * 0.55).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(points[index][0], points[index][1], 1.6 + pulse * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  };
  const ref = useAbstractCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}
