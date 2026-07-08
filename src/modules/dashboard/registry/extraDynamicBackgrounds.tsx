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

function useExtraCanvasAnim<State extends CanvasAnimLifecycle>(draw: CanvasDraw<State>) {
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

function makeLayer(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
  scale = dynamicBackgroundDevicePixelRatio(window.devicePixelRatio),
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.floor(width * scale));
  canvas.height = Math.max(2, Math.floor(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paint(ctx);
  return canvas;
}

function mixHex(left: string, right: string, amount: number) {
  const leftValue = Number.parseInt(left.slice(1), 16);
  const rightValue = Number.parseInt(right.slice(1), 16);
  const red = Math.round((leftValue >> 16) + ((rightValue >> 16) - (leftValue >> 16)) * amount);
  const green = Math.round(((leftValue >> 8) & 255) + (((rightValue >> 8) & 255) - ((leftValue >> 8) & 255)) * amount);
  const blue = Math.round((leftValue & 255) + ((rightValue & 255) - (leftValue & 255)) * amount);
  return `rgb(${red},${green},${blue})`;
}

interface DuneLayer {
  base: number;
  a1: number;
  k1: number;
  p: number;
  a2: number;
  k2: number;
  top: string;
  bot: string;
  sh: number;
  lt: number;
}

interface DuneSand {
  x: number;
  y: number;
  v: number;
  len: number;
  amp: number;
  ph: number;
  o: number;
}

interface DunesState extends CanvasAnimLifecycle {
  tex?: HTMLCanvasElement;
  sand?: DuneSand[];
  last?: number;
}

export function DunesBg() {
  const draw: CanvasDraw<DunesState> = (ctx, width, height, time, state) => {
    state.onResize = (nextWidth, nextHeight) => {
      const layers: DuneLayer[] = [
        { base: 0.50, a1: 0.028, k1: 1.7, p: 0.5, a2: 0.011, k2: 4.1, top: "#eecd92", bot: "#dcab63", sh: 0.10, lt: 0.10 },
        { base: 0.62, a1: 0.044, k1: 1.2, p: 2.6, a2: 0.017, k2: 3.3, top: "#e4b26d", bot: "#c78c46", sh: 0.13, lt: 0.11 },
        { base: 0.78, a1: 0.058, k1: 0.9, p: 4.4, a2: 0.021, k2: 2.6, top: "#d09550", bot: "#aa6d33", sh: 0.16, lt: 0.12 },
        { base: 0.95, a1: 0.072, k1: 0.7, p: 1.4, a2: 0.026, k2: 2.1, top: "#b97b3c", bot: "#875224", sh: 0.19, lt: 0.13 },
      ];
      state.tex = makeLayer(nextWidth, nextHeight, (layerCtx) => {
        const sky = layerCtx.createLinearGradient(0, 0, 0, nextHeight * 0.56);
        sky.addColorStop(0, "#8fbdd6");
        sky.addColorStop(0.45, "#c3d6d2");
        sky.addColorStop(0.75, "#e8dfc0");
        sky.addColorStop(1, "#f4dcaa");
        layerCtx.fillStyle = sky;
        layerCtx.fillRect(0, 0, nextWidth, nextHeight * 0.56);

        const haze = layerCtx.createLinearGradient(0, nextHeight * 0.30, 0, nextHeight * 0.50);
        haze.addColorStop(0, "rgba(255,228,175,0)");
        haze.addColorStop(1, "rgba(255,228,175,0.40)");
        layerCtx.fillStyle = haze;
        layerCtx.fillRect(0, nextHeight * 0.30, nextWidth, nextHeight * 0.20);

        const sunX = nextWidth * 0.72;
        const sunY = nextHeight * 0.15;
        const glow = layerCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, nextHeight * 0.45);
        glow.addColorStop(0, "rgba(255,251,232,0.95)");
        glow.addColorStop(0.18, "rgba(255,244,210,0.42)");
        glow.addColorStop(0.5, "rgba(255,240,200,0.12)");
        glow.addColorStop(1, "rgba(255,240,200,0)");
        layerCtx.fillStyle = glow;
        layerCtx.fillRect(0, 0, nextWidth, nextHeight * 0.56);
        const sun = layerCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, nextHeight * 0.040);
        sun.addColorStop(0, "#fffef8");
        sun.addColorStop(0.7, "#fff8dd");
        sun.addColorStop(1, "rgba(255,248,221,0)");
        layerCtx.fillStyle = sun;
        layerCtx.beginPath();
        layerCtx.arc(sunX, sunY, nextHeight * 0.040, 0, Math.PI * 2);
        layerCtx.fill();

        for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
          const layer = layers[layerIndex];
          const yAt = (unit: number) => nextHeight * (
            layer.base
            + layer.a1 * Math.sin(unit * layer.k1 * Math.PI * 2 + layer.p)
            + layer.a2 * Math.sin(unit * layer.k2 * Math.PI * 2 + layer.p * 1.7)
          );
          const slopeAt = (unit: number) => (yAt(unit + 0.002) - yAt(unit)) / (0.002 * nextWidth);

          const duneGradient = layerCtx.createLinearGradient(0, nextHeight * (layer.base - layer.a1 - layer.a2), 0, nextHeight);
          duneGradient.addColorStop(0, layer.top);
          duneGradient.addColorStop(1, layer.bot);
          layerCtx.fillStyle = duneGradient;
          layerCtx.beginPath();
          layerCtx.moveTo(0, nextHeight);
          for (let px = 0; px <= nextWidth; px += 3) layerCtx.lineTo(px, yAt(px / nextWidth));
          layerCtx.lineTo(nextWidth, nextHeight);
          layerCtx.closePath();
          layerCtx.fill();

          const wedge = (amp: number, color: string, direction: number) => {
            layerCtx.fillStyle = color;
            layerCtx.beginPath();
            layerCtx.moveTo(0, yAt(0));
            for (let px = 0; px <= nextWidth; px += 3) layerCtx.lineTo(px, yAt(px / nextWidth));
            for (let px = nextWidth; px >= 0; px -= 3) {
              const unit = px / nextWidth;
              const slope = slopeAt(unit) * direction;
              layerCtx.lineTo(px, yAt(unit) + amp * Math.min(1, Math.max(0, slope * 13)));
            }
            layerCtx.closePath();
            layerCtx.fill();
          };
          for (let i = 1; i <= 6; i += 1) wedge(nextHeight * 0.075 * i / 6, `rgba(97,49,16,${layer.sh * 0.30})`, 1);
          for (let i = 1; i <= 4; i += 1) wedge(nextHeight * 0.050 * i / 4, `rgba(255,238,200,${layer.lt * 0.30})`, -1);

          for (const [lineWidth, alpha] of [[3.5, 0.10], [1.2, 0.20]] as const) {
            layerCtx.strokeStyle = `rgba(255,242,208,${alpha})`;
            layerCtx.lineWidth = lineWidth;
            layerCtx.beginPath();
            for (let px = 0; px <= nextWidth; px += 3) {
              const y = yAt(px / nextWidth);
              if (px === 0) layerCtx.moveTo(px, y);
              else layerCtx.lineTo(px, y);
            }
            layerCtx.stroke();
          }

          const rippleCount = 26 + layerIndex * 10;
          for (let i = 0; i < rippleCount; i += 1) {
            const unit = Math.random();
            const py = yAt(unit) + 5 + Math.random() * nextHeight * 0.10;
            const px = unit * nextWidth;
            const rippleWidth = 8 + Math.random() * 26;
            const dy = slopeAt(unit) * rippleWidth * 0.45;
            const bow = 1.5 + Math.random() * 2.5;
            layerCtx.strokeStyle = `rgba(90,45,15,${0.045 + Math.random() * 0.04})`;
            layerCtx.lineWidth = 0.9;
            layerCtx.beginPath();
            layerCtx.moveTo(px - rippleWidth / 2, py - dy);
            layerCtx.quadraticCurveTo(px, py + bow, px + rippleWidth / 2, py + dy);
            layerCtx.stroke();
            layerCtx.strokeStyle = `rgba(255,235,195,${0.04 + Math.random() * 0.04})`;
            layerCtx.beginPath();
            layerCtx.moveTo(px - rippleWidth / 2, py - dy - 1);
            layerCtx.quadraticCurveTo(px, py + bow - 1, px + rippleWidth / 2, py + dy - 1);
            layerCtx.stroke();
          }
        }

        const veil = layerCtx.createLinearGradient(0, nextHeight * 0.44, 0, nextHeight * 0.80);
        veil.addColorStop(0, "rgba(255,236,205,0.22)");
        veil.addColorStop(1, "rgba(255,236,205,0)");
        layerCtx.fillStyle = veil;
        layerCtx.fillRect(0, nextHeight * 0.44, nextWidth, nextHeight * 0.36);

        for (let i = 0; i < 3200; i += 1) {
          const grainX = Math.random() * nextWidth;
          const grainY = nextHeight * 0.44 + Math.random() * nextHeight * 0.56;
          layerCtx.fillStyle = Math.random() < 0.5
            ? `rgba(255,240,210,${0.03 + Math.random() * 0.04})`
            : `rgba(95,50,18,${0.03 + Math.random() * 0.04})`;
          layerCtx.fillRect(grainX, grainY, 1, 1);
        }
      });

      const count = Math.max(50, Math.min(130, Math.floor(nextWidth / 12)));
      state.sand = Array.from({ length: count }, () => ({
        x: Math.random() * nextWidth,
        y: nextHeight * (0.46 + Math.random() * 0.50),
        v: 55 + Math.random() * 120,
        len: 16 + Math.random() * 34,
        amp: 1.5 + Math.random() * 4,
        ph: Math.random() * Math.PI * 2,
        o: 0.05 + Math.random() * 0.13,
      }));
      state.last = time;
    };
    if (!state.tex || !state.sand) return;
    const dt = Math.min(0.05, time - (state.last ?? time));
    state.last = time;

    ctx.drawImage(state.tex, 0, 0, width, height);
    ctx.lineCap = "round";
    for (const particle of state.sand) {
      particle.x += particle.v * dt;
      if (particle.x - particle.len > width) {
        particle.x = -particle.len;
        particle.y = height * (0.46 + Math.random() * 0.50);
      }
      const y = particle.y + Math.sin(time * 2 + particle.ph) * particle.amp;
      const sandGradient = ctx.createLinearGradient(particle.x - particle.len, y, particle.x, y);
      sandGradient.addColorStop(0, "rgba(255,238,205,0)");
      sandGradient.addColorStop(1, `rgba(255,238,205,${particle.o})`);
      ctx.strokeStyle = sandGradient;
      for (const lineWidth of [2.4, 1]) {
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(particle.x - particle.len, y + Math.sin(time * 2 + particle.ph - 0.9) * particle.amp);
        ctx.quadraticCurveTo(particle.x - particle.len * 0.5, y - particle.amp, particle.x, y);
        ctx.stroke();
      }
    }
  };
  const ref = useExtraCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

interface LighthouseStar {
  x: number;
  y: number;
  r: number;
  tw: number;
  ph: number;
}

interface LighthouseGlint {
  x: number;
  y: number;
  len: number;
  ph: number;
  sp: number;
  drift: number;
  d: number;
}

interface LighthouseFog {
  x: number;
  y: number;
  rx: number;
  ry: number;
  v: number;
  o: number;
}

interface LighthouseState extends CanvasAnimLifecycle {
  tex?: HTMLCanvasElement;
  fg?: HTMLCanvasElement;
  geo?: { lx: number; ly: number };
  stars?: LighthouseStar[];
  glints?: LighthouseGlint[];
  fog?: LighthouseFog[];
  last?: number;
}

export function LighthouseBg() {
  const draw: CanvasDraw<LighthouseState> = (ctx, width, height, time, state) => {
    state.onResize = (nextWidth, nextHeight) => {
      const horizon = nextHeight * 0.62;
      const rockTop = nextHeight * 0.665;
      const lightX = nextWidth * 0.80;
      const towerHeight = nextHeight * 0.26;
      const baseY = rockTop + nextHeight * 0.005;
      const topY = baseY - towerHeight;
      const baseWidth = nextHeight * 0.026;
      const topWidth = nextHeight * 0.017;
      state.geo = { lx: lightX, ly: topY - nextHeight * 0.028 };

      state.tex = makeLayer(nextWidth, nextHeight, (layerCtx) => {
        const sky = layerCtx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "#030711");
        sky.addColorStop(0.55, "#081020");
        sky.addColorStop(0.85, "#0f1c33");
        sky.addColorStop(1, "#1a2c4a");
        layerCtx.fillStyle = sky;
        layerCtx.fillRect(0, 0, nextWidth, horizon);
        const air = layerCtx.createLinearGradient(0, horizon - nextHeight * 0.09, 0, horizon);
        air.addColorStop(0, "rgba(70,110,150,0)");
        air.addColorStop(1, "rgba(90,135,175,0.22)");
        layerCtx.fillStyle = air;
        layerCtx.fillRect(0, horizon - nextHeight * 0.09, nextWidth, nextHeight * 0.09);

        for (let i = 0; i < 6; i += 1) {
          const cloudX = Math.random() * nextWidth;
          const cloudY = nextHeight * (0.08 + Math.random() * 0.35);
          const radiusX = nextWidth * (0.10 + Math.random() * 0.16);
          const radiusY = nextHeight * (0.012 + Math.random() * 0.02);
          const cloud = layerCtx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, radiusX);
          cloud.addColorStop(0, "rgba(70,95,135,0.10)");
          cloud.addColorStop(1, "rgba(70,95,135,0)");
          layerCtx.fillStyle = cloud;
          layerCtx.save();
          layerCtx.translate(cloudX, cloudY);
          layerCtx.scale(1, radiusY / radiusX);
          layerCtx.translate(-cloudX, -cloudY);
          layerCtx.beginPath();
          layerCtx.arc(cloudX, cloudY, radiusX, 0, Math.PI * 2);
          layerCtx.fill();
          layerCtx.restore();
        }

        const sea = layerCtx.createLinearGradient(0, horizon, 0, nextHeight);
        sea.addColorStop(0, "#1a2e47");
        sea.addColorStop(0.35, "#0e1d31");
        sea.addColorStop(1, "#040a13");
        layerCtx.fillStyle = sea;
        layerCtx.fillRect(0, horizon, nextWidth, nextHeight - horizon);
        layerCtx.fillStyle = "rgba(120,160,200,0.14)";
        layerCtx.fillRect(0, horizon - 1, nextWidth, 2);
      });

      state.fg = makeLayer(nextWidth, nextHeight, (layerCtx) => {
        const rockLeft = nextWidth * 0.715;
        const rockRight = nextWidth * 0.885;
        const rockBase = nextHeight * 0.735;
        layerCtx.fillStyle = "#060a12";
        layerCtx.beginPath();
        layerCtx.moveTo(rockLeft, rockBase);
        layerCtx.quadraticCurveTo(nextWidth * 0.745, rockTop + nextHeight * 0.005, nextWidth * 0.775, rockTop);
        layerCtx.lineTo(nextWidth * 0.845, rockTop + nextHeight * 0.006);
        layerCtx.quadraticCurveTo(nextWidth * 0.872, rockTop + nextHeight * 0.028, rockRight, rockBase);
        layerCtx.closePath();
        layerCtx.fill();

        layerCtx.fillStyle = "#0b1220";
        layerCtx.beginPath();
        layerCtx.moveTo(nextWidth * 0.775, rockTop);
        layerCtx.lineTo(nextWidth * 0.812, rockTop + nextHeight * 0.004);
        layerCtx.lineTo(nextWidth * 0.795, rockBase);
        layerCtx.lineTo(nextWidth * 0.744, rockBase);
        layerCtx.closePath();
        layerCtx.fill();
        layerCtx.fillStyle = "#04070d";
        layerCtx.beginPath();
        layerCtx.moveTo(nextWidth * 0.845, rockTop + nextHeight * 0.006);
        layerCtx.lineTo(nextWidth * 0.872, rockTop + nextHeight * 0.03);
        layerCtx.lineTo(rockRight, rockBase);
        layerCtx.lineTo(nextWidth * 0.84, rockBase);
        layerCtx.closePath();
        layerCtx.fill();

        layerCtx.strokeStyle = "rgba(150,185,220,0.22)";
        layerCtx.lineWidth = 1.6;
        layerCtx.beginPath();
        layerCtx.moveTo(rockLeft + nextWidth * 0.006, rockBase - nextHeight * 0.004);
        layerCtx.quadraticCurveTo(nextWidth * 0.745, rockTop + nextHeight * 0.004, nextWidth * 0.775, rockTop);
        layerCtx.lineTo(nextWidth * 0.845, rockTop + nextHeight * 0.006);
        layerCtx.stroke();
        layerCtx.fillStyle = "rgba(3,6,11,0.55)";
        layerCtx.beginPath();
        layerCtx.ellipse((rockLeft + rockRight) / 2, rockBase + nextHeight * 0.012, (rockRight - rockLeft) * 0.55, nextHeight * 0.022, 0, 0, Math.PI * 2);
        layerCtx.fill();

        const towerGradient = layerCtx.createLinearGradient(lightX - baseWidth, 0, lightX + baseWidth, 0);
        towerGradient.addColorStop(0, "#080c15");
        towerGradient.addColorStop(0.7, "#0b111d");
        towerGradient.addColorStop(1, "#1d2a42");
        layerCtx.fillStyle = towerGradient;
        layerCtx.beginPath();
        layerCtx.moveTo(lightX - baseWidth, baseY);
        layerCtx.lineTo(lightX - topWidth, topY);
        layerCtx.lineTo(lightX + topWidth, topY);
        layerCtx.lineTo(lightX + baseWidth, baseY);
        layerCtx.closePath();
        layerCtx.fill();

        layerCtx.fillStyle = "rgba(160,190,225,0.07)";
        layerCtx.fillRect(lightX - baseWidth * 0.85, baseY - towerHeight * 0.33, baseWidth * 1.7, towerHeight * 0.045);
        layerCtx.fillRect(lightX - baseWidth * 0.75, baseY - towerHeight * 0.62, baseWidth * 1.5, towerHeight * 0.045);

        const galleryWidth = topWidth * 1.9;
        layerCtx.fillStyle = "#0a0f1a";
        layerCtx.fillRect(lightX - galleryWidth, topY - nextHeight * 0.012, galleryWidth * 2, nextHeight * 0.012);
        layerCtx.fillRect(lightX - topWidth * 1.1, topY - nextHeight * 0.042, topWidth * 2.2, nextHeight * 0.030);
        layerCtx.strokeStyle = "rgba(150,185,225,0.30)";
        layerCtx.lineWidth = 1;
        layerCtx.strokeRect(lightX - topWidth * 1.1, topY - nextHeight * 0.042, topWidth * 2.2, nextHeight * 0.030);
        layerCtx.fillStyle = "#0a0f1a";
        layerCtx.beginPath();
        layerCtx.moveTo(lightX - topWidth * 1.3, topY - nextHeight * 0.042);
        layerCtx.lineTo(lightX, topY - nextHeight * 0.062);
        layerCtx.lineTo(lightX + topWidth * 1.3, topY - nextHeight * 0.042);
        layerCtx.closePath();
        layerCtx.fill();
      });

      state.stars = Array.from({ length: Math.floor((nextWidth * nextHeight) / 9000) }, () => ({
        x: Math.random() * nextWidth,
        y: Math.random() * nextHeight * 0.55,
        r: 0.4 + Math.random() * 1.0,
        tw: 1 + Math.random() * 2.5,
        ph: Math.random() * Math.PI * 2,
      }));
      state.glints = Array.from({ length: Math.floor(nextWidth / 7) }, () => {
        const depth = Math.pow(Math.random(), 1.7);
        return {
          x: Math.random() * nextWidth,
          y: horizon + 2 + depth * (nextHeight - horizon - 6),
          len: 2 + depth * 11,
          ph: Math.random() * Math.PI * 2,
          sp: 1 + Math.random() * 3,
          drift: (Math.random() - 0.5) * (4 + depth * 14),
          d: depth,
        };
      });
      state.fog = Array.from({ length: 5 }, (_, index) => ({
        x: Math.random() * nextWidth,
        y: nextHeight * (0.48 + index * 0.045),
        rx: nextWidth * (0.22 + Math.random() * 0.2),
        ry: nextHeight * (0.04 + Math.random() * 0.03),
        v: 5 + Math.random() * 9,
        o: 0.04 + Math.random() * 0.045,
      }));
      state.last = time;
    };
    if (!state.tex || !state.fg || !state.geo || !state.stars || !state.glints || !state.fog) return;
    const dt = Math.min(0.05, time - (state.last ?? time));
    state.last = time;
    const { lx, ly } = state.geo;

    ctx.drawImage(state.tex, 0, 0, width, height);

    for (const star of state.stars) {
      const alpha = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(time * star.tw + star.ph));
      ctx.fillStyle = `rgba(215,228,255,${alpha})`;
      ctx.fillRect(star.x, star.y, star.r, star.r);
    }
    for (const glint of state.glints) {
      glint.x += glint.drift * dt;
      if (glint.x > width + 12) glint.x = -12;
      if (glint.x < -12) glint.x = width + 12;
      const alpha = Math.pow(0.5 + 0.5 * Math.sin(time * glint.sp + glint.ph), 2) * (0.10 + glint.d * 0.22);
      ctx.strokeStyle = `rgba(165,200,235,${alpha})`;
      ctx.lineWidth = 0.8 + glint.d * 0.8;
      ctx.beginPath();
      ctx.moveTo(glint.x - glint.len / 2, glint.y);
      ctx.lineTo(glint.x + glint.len / 2, glint.y);
      ctx.stroke();
    }

    const angle = time * 0.5;
    const radius = Math.hypot(width, height);
    ctx.globalCompositeOperation = "lighter";
    for (const offset of [0, Math.PI]) {
      const beamAngle = angle + offset;
      for (const [spread, alpha] of [[0.085, 0.10], [0.045, 0.14], [0.020, 0.18]] as const) {
        const beam = ctx.createLinearGradient(lx, ly, lx + Math.cos(beamAngle) * radius * 0.75, ly + Math.sin(beamAngle) * radius * 0.75);
        beam.addColorStop(0, `rgba(255,244,198,${alpha})`);
        beam.addColorStop(0.45, `rgba(255,244,198,${alpha * 0.28})`);
        beam.addColorStop(1, "rgba(255,244,198,0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(beamAngle - spread) * radius, ly + Math.sin(beamAngle - spread) * radius);
        ctx.lineTo(lx + Math.cos(beamAngle + spread) * radius, ly + Math.sin(beamAngle + spread) * radius);
        ctx.closePath();
        ctx.fill();
      }
    }
    for (const fog of state.fog) {
      fog.x += fog.v * dt;
      if (fog.x - fog.rx > width) fog.x = -fog.rx;
      const fogGradient = ctx.createRadialGradient(fog.x, fog.y, 0, fog.x, fog.y, fog.rx);
      fogGradient.addColorStop(0, `rgba(150,175,205,${fog.o})`);
      fogGradient.addColorStop(1, "rgba(150,175,205,0)");
      ctx.fillStyle = fogGradient;
      ctx.save();
      ctx.translate(fog.x, fog.y);
      ctx.scale(1, fog.ry / fog.rx);
      ctx.translate(-fog.x, -fog.y);
      ctx.beginPath();
      ctx.arc(fog.x, fog.y, fog.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";

    ctx.drawImage(state.fg, 0, 0, width, height);

    const facing = Math.max(Math.cos(angle) ** 8, Math.cos(angle + Math.PI) ** 8);
    const lightAlpha = 0.5 + 0.5 * facing;
    const lightGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly, height * 0.09);
    lightGlow.addColorStop(0, `rgba(255,240,180,${0.85 * lightAlpha})`);
    lightGlow.addColorStop(0.25, `rgba(255,225,140,${0.30 * lightAlpha})`);
    lightGlow.addColorStop(1, "rgba(255,225,140,0)");
    ctx.fillStyle = lightGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, height * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,248,220,${0.7 + 0.3 * lightAlpha})`;
    ctx.beginPath();
    ctx.arc(lx, ly, height * 0.008 + height * 0.004 * lightAlpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,238,180,${0.10 * lightAlpha + 0.04})`;
    for (let i = 0; i < 12; i += 1) {
      const glintY = height * 0.72 + (i / 12) * height * 0.26;
      const glintWidth = height * (0.006 + i * 0.0035);
      const glintX = lx + Math.sin(glintY * 0.22 + time * 1.4) * height * 0.012;
      ctx.fillRect(glintX - glintWidth, glintY, glintWidth * 2, 2);
    }
  };
  const ref = useExtraCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

interface SavannaGrass {
  x: number;
  base: number;
  len: number;
  ph: number;
  lw: number;
  lean: number;
  fg: boolean;
}

interface SavannaBird {
  x: number;
  y: number;
  v: number;
  sc: number;
  ph: number;
  fl: number;
  bob: number;
}

interface SavannaState extends CanvasAnimLifecycle {
  tex?: HTMLCanvasElement;
  geo?: { sx: number; sy: number; sr: number };
  grass?: SavannaGrass[];
  birds?: SavannaBird[];
  last?: number;
}

export function SavannaBg() {
  const draw: CanvasDraw<SavannaState> = (ctx, width, height, time, state) => {
    state.onResize = (nextWidth, nextHeight) => {
      const horizon = nextHeight * 0.74;
      const sunX = nextWidth * 0.38;
      const sunY = horizon - nextHeight * 0.015;
      const sunRadius = nextHeight * 0.155;
      state.geo = { sx: sunX, sy: sunY, sr: sunRadius };

      state.tex = makeLayer(nextWidth, nextHeight, (layerCtx) => {
        const sky = layerCtx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "#2b1336");
        sky.addColorStop(0.35, "#6b2140");
        sky.addColorStop(0.6, "#a03a36");
        sky.addColorStop(0.8, "#cd5a2e");
        sky.addColorStop(1, "#f2913e");
        layerCtx.fillStyle = sky;
        layerCtx.fillRect(0, 0, nextWidth, horizon);

        const halo = layerCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3.4);
        halo.addColorStop(0, "rgba(255,170,80,0.5)");
        halo.addColorStop(0.45, "rgba(255,140,60,0.14)");
        halo.addColorStop(1, "rgba(255,140,60,0)");
        layerCtx.fillStyle = halo;
        layerCtx.fillRect(0, 0, nextWidth, horizon);

        for (let i = 0; i < 9; i += 1) {
          const cloudX = Math.random() * nextWidth;
          const cloudY = nextHeight * (0.06 + Math.random() * 0.44);
          const radiusX = nextWidth * (0.07 + Math.random() * 0.15);
          const radiusY = nextHeight * (0.004 + Math.random() * 0.008);
          const near = 1 - Math.abs(cloudY - sunY * 0.75) / (nextHeight * 0.6);
          const paintCloud = (dy: number, color: string) => {
            layerCtx.fillStyle = color;
            layerCtx.save();
            layerCtx.translate(cloudX, cloudY + dy);
            layerCtx.scale(1, radiusY / radiusX);
            layerCtx.translate(-cloudX, -(cloudY + dy));
            layerCtx.beginPath();
            layerCtx.arc(cloudX, cloudY + dy, radiusX, 0, Math.PI * 2);
            layerCtx.fill();
            layerCtx.restore();
          };
          paintCloud(0, `rgba(40,16,38,${0.16 + Math.random() * 0.12})`);
          paintCloud(radiusY * 1.1, `rgba(255,150,88,${(0.10 + Math.random() * 0.12) * Math.max(0.3, near)})`);
        }

        layerCtx.save();
        layerCtx.beginPath();
        layerCtx.rect(0, 0, nextWidth, horizon);
        layerCtx.clip();
        const sunGradient = layerCtx.createRadialGradient(sunX, sunY - sunRadius * 0.25, 0, sunX, sunY, sunRadius);
        sunGradient.addColorStop(0, "#fff0c4");
        sunGradient.addColorStop(0.55, "#ffcf82");
        sunGradient.addColorStop(0.85, "#ffab52");
        sunGradient.addColorStop(1, "#ff8a3c");
        layerCtx.fillStyle = sunGradient;
        layerCtx.beginPath();
        layerCtx.ellipse(sunX, sunY, sunRadius, sunRadius * 0.93, 0, 0, Math.PI * 2);
        layerCtx.fill();
        const mirage = layerCtx.createLinearGradient(0, horizon - nextHeight * 0.02, 0, horizon);
        mirage.addColorStop(0, "rgba(255,190,110,0)");
        mirage.addColorStop(1, "rgba(255,205,130,0.55)");
        layerCtx.fillStyle = mirage;
        layerCtx.fillRect(sunX - sunRadius * 1.6, horizon - nextHeight * 0.02, sunRadius * 3.2, nextHeight * 0.02);
        layerCtx.restore();

        const ground = layerCtx.createLinearGradient(0, horizon - nextHeight * 0.02, 0, nextHeight);
        ground.addColorStop(0, "#33150a");
        ground.addColorStop(0.25, "#1e0d07");
        ground.addColorStop(1, "#0e0604");
        layerCtx.fillStyle = ground;
        layerCtx.beginPath();
        layerCtx.moveTo(0, horizon + nextHeight * 0.01);
        layerCtx.quadraticCurveTo(nextWidth * 0.5, horizon - nextHeight * 0.012, nextWidth, horizon + nextHeight * 0.008);
        layerCtx.lineTo(nextWidth, nextHeight);
        layerCtx.lineTo(0, nextHeight);
        layerCtx.closePath();
        layerCtx.fill();
        layerCtx.strokeStyle = "rgba(255,150,70,0.28)";
        layerCtx.lineWidth = 1.4;
        layerCtx.beginPath();
        layerCtx.moveTo(0, horizon + nextHeight * 0.01);
        layerCtx.quadraticCurveTo(nextWidth * 0.5, horizon - nextHeight * 0.012, nextWidth, horizon + nextHeight * 0.008);
        layerCtx.stroke();

        for (let i = 0; i < 1400; i += 1) {
          const grainX = Math.random() * nextWidth;
          const grainY = horizon + Math.random() * (nextHeight - horizon);
          layerCtx.fillStyle = `rgba(90,40,18,${0.04 + Math.random() * 0.05})`;
          layerCtx.fillRect(grainX, grainY, 1, 1);
        }

        const drawAcacia = (treeX: number, groundY: number, scale: number) => {
          layerCtx.strokeStyle = "#140905";
          layerCtx.lineCap = "round";
          layerCtx.lineWidth = 7 * scale;
          layerCtx.beginPath();
          layerCtx.moveTo(treeX, groundY);
          layerCtx.quadraticCurveTo(treeX - 6 * scale, groundY - 44 * scale, treeX - 22 * scale, groundY - 78 * scale);
          layerCtx.stroke();
          layerCtx.lineWidth = 5 * scale;
          layerCtx.beginPath();
          layerCtx.moveTo(treeX - 2 * scale, groundY - 30 * scale);
          layerCtx.quadraticCurveTo(treeX + 16 * scale, groundY - 52 * scale, treeX + 30 * scale, groundY - 72 * scale);
          layerCtx.stroke();
          layerCtx.lineWidth = 3 * scale;
          for (const [branchX, branchY, endX, endY] of [
            [-22, -78, -38, -84],
            [-22, -78, -6, -86],
            [30, -72, 40, -80],
            [30, -72, 16, -84],
          ] as const) {
            layerCtx.beginPath();
            layerCtx.moveTo(treeX + branchX * scale, groundY + branchY * scale);
            layerCtx.quadraticCurveTo(
              treeX + ((branchX + endX) / 2) * scale,
              groundY + ((branchY + endY) / 2) * scale - 4 * scale,
              treeX + endX * scale,
              groundY + endY * scale,
            );
            layerCtx.stroke();
          }
          for (let i = 0; i < 110; i += 1) {
            const unit = Math.random() * 2 - 1;
            const px = treeX - 4 * scale + unit * 62 * scale * (0.55 + Math.random() * 0.45);
            const lift = Math.sqrt(Math.max(0, 1 - unit * unit));
            const py = groundY - 86 * scale - Math.random() * 9 * scale * lift + Math.random() * 7 * scale;
            const radius = (1.6 + Math.random() * 3.4) * scale;
            layerCtx.fillStyle = `rgba(18,9,5,${0.55 + Math.random() * 0.4})`;
            layerCtx.beginPath();
            layerCtx.arc(px, py, radius, 0, Math.PI * 2);
            layerCtx.fill();
          }
        };
        const unit = nextHeight / 540;
        drawAcacia(nextWidth * 0.80, horizon + nextHeight * 0.02, 1.05 * unit);
        drawAcacia(nextWidth * 0.13, horizon + nextHeight * 0.005, 0.62 * unit);

        layerCtx.lineCap = "round";
        for (let i = 0; i < 170; i += 1) {
          const grassX = Math.random() * nextWidth;
          const grassBase = horizon + nextHeight * (0.004 + Math.random() * 0.012);
          const length = nextHeight * (0.012 + Math.random() * 0.022);
          const lean = (Math.random() - 0.5) * 4;
          layerCtx.strokeStyle = `rgba(20,9,5,${0.7 + Math.random() * 0.3})`;
          layerCtx.lineWidth = 0.8 + Math.random();
          layerCtx.beginPath();
          layerCtx.moveTo(grassX, grassBase);
          layerCtx.quadraticCurveTo(grassX + lean * 0.4, grassBase - length * 0.6, grassX + lean, grassBase - length);
          layerCtx.stroke();
        }
      });

      const count = Math.max(40, Math.min(90, Math.floor(nextWidth / 16)));
      state.grass = Array.from({ length: count }, (_, index) => {
        const foreground = index % 3 === 0;
        return {
          x: Math.random() * nextWidth,
          base: foreground ? nextHeight * (1.0 + Math.random() * 0.02) : nextHeight * (0.745 + Math.random() * 0.012),
          len: foreground ? nextHeight * (0.10 + Math.random() * 0.07) : nextHeight * (0.02 + Math.random() * 0.028),
          ph: Math.random() * Math.PI * 2,
          lw: foreground ? 2 + Math.random() * 1.6 : 1 + Math.random(),
          lean: (Math.random() - 0.5) * (foreground ? 6 : 3),
          fg: foreground,
        };
      });
      state.birds = Array.from({ length: 8 }, () => ({
        x: Math.random() * nextWidth,
        y: nextHeight * (0.14 + Math.random() * 0.26),
        v: 20 + Math.random() * 16,
        sc: (0.55 + Math.random() * 0.75) * (nextHeight / 900 + 0.5),
        ph: Math.random() * Math.PI * 2,
        fl: 4 + Math.random() * 3,
        bob: Math.random() * Math.PI * 2,
      }));
      state.last = time;
    };
    if (!state.tex || !state.geo || !state.grass || !state.birds) return;
    const dt = Math.min(0.05, time - (state.last ?? time));
    state.last = time;
    const { sx, sy, sr } = state.geo;

    ctx.drawImage(state.tex, 0, 0, width, height);

    const breathe = 0.04 + 0.03 * Math.sin(time * 0.5);
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.6);
    glow.addColorStop(0, `rgba(255,175,90,${breathe})`);
    glow.addColorStop(1, "rgba(255,175,90,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = "round";
    ctx.strokeStyle = "#170b06";
    for (const grass of state.grass) {
      const sway = Math.sin(time * (grass.fg ? 1.1 : 1.6) + grass.ph) * (grass.fg ? 5 : 2.2) + grass.lean;
      ctx.lineWidth = grass.lw;
      ctx.beginPath();
      ctx.moveTo(grass.x, grass.base);
      ctx.quadraticCurveTo(grass.x + sway * 0.3, grass.base - grass.len * 0.55, grass.x + sway, grass.base - grass.len);
      ctx.stroke();
    }

    ctx.strokeStyle = "#20101c";
    for (const bird of state.birds) {
      bird.x += bird.v * dt;
      if (bird.x > width + 24) {
        bird.x = -24;
        bird.y = height * (0.14 + Math.random() * 0.26);
      }
      const birdY = bird.y + Math.sin(time * 0.7 + bird.bob) * height * 0.008;
      const flap = Math.sin(time * bird.fl + bird.ph);
      const wingY = flap * 6 * bird.sc;
      ctx.lineWidth = 1.6 * bird.sc;
      ctx.beginPath();
      ctx.moveTo(bird.x - 8 * bird.sc, birdY - wingY);
      ctx.quadraticCurveTo(bird.x - 3 * bird.sc, birdY + 2 * bird.sc, bird.x, birdY);
      ctx.quadraticCurveTo(bird.x + 3 * bird.sc, birdY + 2 * bird.sc, bird.x + 8 * bird.sc, birdY - wingY);
      ctx.stroke();
    }
  };
  const ref = useExtraCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

interface JellySnow {
  x: number;
  y: number;
  v: number;
  a: number;
  r: number;
  ph: number;
}

interface Jelly {
  x: number;
  y: number;
  sc: number;
  hue: number;
  ph: number;
  pr: number;
  drift: number;
  tn: number;
  tph: number;
}

interface JellyfishState extends CanvasAnimLifecycle {
  tex?: HTMLCanvasElement;
  snow?: JellySnow[];
  jelly?: Jelly[];
  maxSc?: number;
  last?: number;
}

export function JellyfishBg() {
  const draw: CanvasDraw<JellyfishState> = (ctx, width, height, time, state) => {
    state.onResize = (nextWidth, nextHeight) => {
      state.tex = makeLayer(nextWidth, nextHeight, (layerCtx) => {
        const base = layerCtx.createLinearGradient(0, 0, 0, nextHeight);
        base.addColorStop(0, "#04121f");
        base.addColorStop(0.5, "#041627");
        base.addColorStop(1, "#010710");
        layerCtx.fillStyle = base;
        layerCtx.fillRect(0, 0, nextWidth, nextHeight);
        for (const [cx, cy, radius, color] of [
          [nextWidth * 0.25, nextHeight * 0.30, nextHeight * 0.7, "rgba(20,60,80,0.10)"],
          [nextWidth * 0.75, nextHeight * 0.55, nextHeight * 0.8, "rgba(30,40,90,0.08)"],
          [nextWidth * 0.5, nextHeight * 0.9, nextHeight * 0.7, "rgba(5,15,30,0.25)"],
        ] as const) {
          const tint = layerCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          tint.addColorStop(0, color);
          tint.addColorStop(1, "rgba(0,0,0,0)");
          layerCtx.fillStyle = tint;
          layerCtx.fillRect(0, 0, nextWidth, nextHeight);
        }
        const vignette = layerCtx.createRadialGradient(nextWidth / 2, nextHeight / 2, Math.min(nextWidth, nextHeight) * 0.35, nextWidth / 2, nextHeight / 2, Math.max(nextWidth, nextHeight) * 0.75);
        vignette.addColorStop(0, "rgba(0,4,10,0)");
        vignette.addColorStop(1, "rgba(0,4,10,0.5)");
        layerCtx.fillStyle = vignette;
        layerCtx.fillRect(0, 0, nextWidth, nextHeight);
      });
      state.snow = Array.from({ length: Math.floor((nextWidth * nextHeight) / 11000) }, () => ({
        x: Math.random() * nextWidth,
        y: Math.random() * nextHeight,
        v: 4 + Math.random() * 10,
        a: 0.05 + Math.random() * 0.16,
        r: 0.5 + Math.random() * 1.1,
        ph: Math.random() * Math.PI * 2,
      }));
      const hues = [190, 205, 285, 320, 255];
      state.jelly = Array.from({ length: 7 }, (_, index) => ({
        x: Math.random() * nextWidth,
        y: Math.random() * nextHeight,
        sc: (0.35 + Math.random() * 0.75) * Math.max(0.6, nextHeight / 800),
        hue: hues[index % hues.length],
        ph: Math.random() * Math.PI * 2,
        pr: 0.55 + Math.random() * 0.45,
        drift: (Math.random() - 0.5) * 7,
        tn: 4 + Math.floor(Math.random() * 2),
        tph: Math.random() * Math.PI * 2,
      })).sort((left, right) => left.sc - right.sc);
      state.maxSc = state.jelly[state.jelly.length - 1]?.sc ?? 1;
      state.last = time;
    };
    if (!state.tex || !state.snow || !state.jelly || !state.maxSc) return;
    const dt = Math.min(0.05, time - (state.last ?? time));
    state.last = time;

    ctx.drawImage(state.tex, 0, 0, width, height);

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i += 1) {
      const rayX = width * (0.2 + i * 0.3) + Math.sin(time * 0.15 + i * 2.1) * width * 0.05;
      const tilt = Math.sin(time * 0.1 + i) * width * 0.12;
      for (const [spreadWidth, alpha] of [[1.6, 0.020], [1.0, 0.026], [0.55, 0.032]] as const) {
        const ray = ctx.createLinearGradient(rayX, 0, rayX + tilt, height * 0.85);
        ray.addColorStop(0, `rgba(90,150,190,${alpha})`);
        ray.addColorStop(1, "rgba(90,150,190,0)");
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(rayX - width * 0.03 * spreadWidth, 0);
        ctx.lineTo(rayX + width * 0.03 * spreadWidth, 0);
        ctx.lineTo(rayX + tilt + width * 0.10 * spreadWidth, height * 0.9);
        ctx.lineTo(rayX + tilt - width * 0.10 * spreadWidth, height * 0.9);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";

    for (const particle of state.snow) {
      particle.y += particle.v * dt;
      particle.x += Math.sin(time * 0.5 + particle.ph) * 0.12;
      if (particle.y > height + 4) {
        particle.y = -4;
        particle.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(190,215,235,${particle.a})`;
      ctx.fillRect(particle.x, particle.y, particle.r, particle.r);
    }

    for (const jelly of state.jelly) {
      const pulse = Math.sin(time * jelly.pr * 2 + jelly.ph);
      const contract = Math.max(0, pulse);
      jelly.y -= (6 + contract * 22) * jelly.sc * dt;
      jelly.x += jelly.drift * dt + Math.sin(time * 0.4 + jelly.ph) * 0.1;
      const radius = 46 * jelly.sc;
      if (jelly.y < -radius * 4) {
        jelly.y = height + radius * 3;
        jelly.x = Math.random() * width;
      }
      if (jelly.x < -radius * 2) jelly.x = width + radius;
      if (jelly.x > width + radius * 2) jelly.x = -radius;
      const bellWidth = radius * (1 - 0.16 * contract);
      const bellHeight = radius * 0.78 * (1 + 0.10 * contract);
      const tentacleLength = radius * 2.7;
      const depthAlpha = 0.45 + 0.55 * (jelly.sc / state.maxSc);

      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = depthAlpha;
      const glow = ctx.createRadialGradient(jelly.x, jelly.y - bellHeight * 0.4, 0, jelly.x, jelly.y - bellHeight * 0.4, radius * 2.3);
      glow.addColorStop(0, `hsla(${jelly.hue},90%,62%,0.12)`);
      glow.addColorStop(1, `hsla(${jelly.hue},90%,62%,0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(jelly.x, jelly.y - bellHeight * 0.4, radius * 2.3, 0, Math.PI * 2);
      ctx.fill();

      for (let index = 0; index < jelly.tn; index += 1) {
        const baseX = jelly.x - bellWidth * 0.65 + (index / (jelly.tn - 1)) * bellWidth * 1.3;
        const gradient = ctx.createLinearGradient(jelly.x, jelly.y, jelly.x, jelly.y + tentacleLength);
        gradient.addColorStop(0, `hsla(${jelly.hue},85%,72%,0.30)`);
        gradient.addColorStop(1, `hsla(${jelly.hue},85%,72%,0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.3 * jelly.sc + 0.4;
        ctx.beginPath();
        ctx.moveTo(baseX, jelly.y + bellHeight * 0.05);
        for (let segment = 1; segment <= 8; segment += 1) {
          const fraction = segment / 8;
          const x = baseX + Math.sin(time * 1.8 + jelly.tph + index * 0.9 + fraction * 3.2) * radius * 0.30 * fraction;
          const y = jelly.y + fraction * tentacleLength * (1 + 0.06 * Math.sin(time * jelly.pr * 2 + jelly.ph - fraction * 2));
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      for (const direction of [-1, 1]) {
        const armGradient = ctx.createLinearGradient(jelly.x, jelly.y, jelly.x, jelly.y + tentacleLength * 0.8);
        armGradient.addColorStop(0, `hsla(${jelly.hue},70%,78%,0.20)`);
        armGradient.addColorStop(1, `hsla(${jelly.hue},70%,78%,0)`);
        ctx.strokeStyle = armGradient;
        ctx.lineWidth = 2.6 * jelly.sc;
        ctx.beginPath();
        ctx.moveTo(jelly.x + direction * bellWidth * 0.15, jelly.y + bellHeight * 0.06);
        for (let segment = 1; segment <= 6; segment += 1) {
          const fraction = segment / 6;
          const x = jelly.x + direction * bellWidth * 0.15 + Math.sin(time * 1.1 + jelly.tph + direction + fraction * 2.4) * radius * 0.22 * fraction;
          ctx.lineTo(x, jelly.y + fraction * tentacleLength * 0.8);
        }
        ctx.stroke();
      }

      const bellPath = (scale: number) => {
        ctx.beginPath();
        ctx.moveTo(jelly.x - bellWidth * scale, jelly.y);
        ctx.bezierCurveTo(jelly.x - bellWidth * scale, jelly.y - bellHeight * 1.3 * scale, jelly.x + bellWidth * scale, jelly.y - bellHeight * 1.3 * scale, jelly.x + bellWidth * scale, jelly.y);
        ctx.bezierCurveTo(jelly.x + bellWidth * 0.6 * scale, jelly.y + bellHeight * 0.18 * scale, jelly.x - bellWidth * 0.6 * scale, jelly.y + bellHeight * 0.18 * scale, jelly.x - bellWidth * scale, jelly.y);
        ctx.closePath();
      };
      bellPath(1.16);
      ctx.fillStyle = `hsla(${jelly.hue},80%,70%,0.08)`;
      ctx.fill();
      const bellGradient = ctx.createRadialGradient(jelly.x, jelly.y - bellHeight * 0.75, 0, jelly.x, jelly.y - bellHeight * 0.35, bellWidth * 1.35);
      bellGradient.addColorStop(0, `hsla(${jelly.hue},85%,76%,0.50)`);
      bellGradient.addColorStop(0.6, `hsla(${jelly.hue},85%,62%,0.18)`);
      bellGradient.addColorStop(1, `hsla(${jelly.hue},85%,55%,0.05)`);
      bellPath(1);
      ctx.fillStyle = bellGradient;
      ctx.fill();
      ctx.strokeStyle = `hsla(${jelly.hue},80%,80%,0.13)`;
      ctx.lineWidth = 1;
      for (const fractionX of [-0.62, -0.22, 0.22, 0.62]) {
        ctx.beginPath();
        ctx.moveTo(jelly.x, jelly.y - bellHeight * 0.92);
        ctx.quadraticCurveTo(jelly.x + fractionX * bellWidth * 0.5, jelly.y - bellHeight * 0.5, jelly.x + fractionX * bellWidth, jelly.y - bellHeight * 0.02);
        ctx.stroke();
      }
      bellPath(1);
      ctx.strokeStyle = `hsla(${jelly.hue},90%,78%,0.10)`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = `hsla(${jelly.hue},90%,80%,0.26)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      const core = ctx.createRadialGradient(jelly.x, jelly.y - bellHeight * 0.65, 0, jelly.x, jelly.y - bellHeight * 0.65, bellWidth * 0.45);
      core.addColorStop(0, `hsla(${jelly.hue},90%,85%,0.30)`);
      core.addColorStop(1, `hsla(${jelly.hue},90%,85%,0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(jelly.x, jelly.y - bellHeight * 0.65, bellWidth * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  };
  const ref = useExtraCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}

interface BalloonSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

interface Balloon {
  x: number;
  y: number;
  sc: number;
  v: number;
  vx: number;
  ph: number;
  spr: BalloonSprite;
}

interface BalloonsState extends CanvasAnimLifecycle {
  tex?: HTMLCanvasElement;
  bal?: Balloon[];
  maxSc?: number;
  last?: number;
}

type BalloonPalette = readonly [string, string];

function buildBalloonSprite(scale: number, palette: BalloonPalette, haze: number): BalloonSprite {
  const radius = 44 * scale;
  const spriteScale = 2;
  const width = Math.ceil(radius * 2.6);
  const height = Math.ceil(radius * 3.2);
  const centerX = width / 2;
  const centerY = radius * 1.15;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.ceil(width * spriteScale));
  canvas.height = Math.max(2, Math.ceil(height * spriteScale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width, height, cx: centerX, cy: centerY };
  ctx.setTransform(spriteScale, 0, 0, spriteScale, 0, 0);
  ctx.translate(centerX, centerY);
  const throatHeight = radius * 1.30;
  const throatWidth = radius * 0.26;
  const color1 = mixHex(palette[0], "#c3ccdc", haze);
  const color2 = mixHex(palette[1], "#d2d8e4", haze);
  const envelope = (factor: number) => {
    ctx.beginPath();
    ctx.moveTo(-throatWidth * factor, throatHeight);
    ctx.bezierCurveTo(-radius * 0.42 * factor, radius * 0.70, -radius * 1.02 * factor, radius * 0.28, -radius * factor, -radius * 0.10);
    ctx.bezierCurveTo(-radius * 0.98 * factor, -radius * 0.66, -radius * 0.55 * factor, -radius, 0, -radius);
    ctx.bezierCurveTo(radius * 0.55 * factor, -radius, radius * 0.98 * factor, -radius * 0.66, radius * factor, -radius * 0.10);
    ctx.bezierCurveTo(radius * 1.02 * factor, radius * 0.28, radius * 0.42 * factor, radius * 0.70, throatWidth * factor, throatHeight);
    ctx.closePath();
  };

  const gores: readonly (readonly [number, string])[] = [[1, color1], [0.84, color2], [0.66, color1], [0.47, color2], [0.27, color1], [0.10, color2]];
  for (const [factor, color] of gores) {
    envelope(factor);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(30,22,28,${0.16 * (1 - haze * 0.7)})`;
  ctx.lineWidth = 0.8;
  for (const [factor] of gores) {
    envelope(factor);
    ctx.stroke();
  }

  envelope(1);
  ctx.save();
  ctx.clip();
  const shade = ctx.createLinearGradient(-radius, 0, radius, 0);
  shade.addColorStop(0, `rgba(255,225,170,${0.30 * (1 - haze * 0.5)})`);
  shade.addColorStop(0.45, "rgba(60,40,70,0)");
  shade.addColorStop(1, `rgba(48,34,62,${0.34 * (1 - haze * 0.5)})`);
  ctx.fillStyle = shade;
  ctx.fillRect(-radius * 1.1, -radius * 1.1, radius * 2.2, radius * 2.6);
  const underShade = ctx.createLinearGradient(0, radius * 0.4, 0, throatHeight);
  underShade.addColorStop(0, "rgba(30,20,32,0)");
  underShade.addColorStop(1, `rgba(30,20,32,${0.30 * (1 - haze * 0.5)})`);
  ctx.fillStyle = underShade;
  ctx.fillRect(-radius * 1.1, radius * 0.4, radius * 2.2, throatHeight - radius * 0.4 + 2);
  const sheen = ctx.createRadialGradient(-radius * 0.28, -radius * 0.62, 0, -radius * 0.28, -radius * 0.62, radius * 0.75);
  sheen.addColorStop(0, `rgba(255,250,235,${0.20 * (1 - haze * 0.6)})`);
  sheen.addColorStop(1, "rgba(255,250,235,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-radius * 1.1, -radius * 1.1, radius * 2.2, radius * 1.6);
  ctx.restore();

  ctx.fillStyle = mixHex(mixHex(palette[0], "#201418", 0.45), "#c3ccdc", haze);
  ctx.beginPath();
  ctx.moveTo(-throatWidth, throatHeight);
  ctx.lineTo(throatWidth, throatHeight);
  ctx.lineTo(throatWidth * 0.82, throatHeight + radius * 0.10);
  ctx.lineTo(-throatWidth * 0.82, throatHeight + radius * 0.10);
  ctx.closePath();
  ctx.fill();

  const basketY = throatHeight + radius * 0.34;
  ctx.strokeStyle = `rgba(58,42,32,${0.9 - haze * 0.4})`;
  ctx.lineWidth = Math.max(0.5, radius * 0.018);
  ctx.beginPath();
  ctx.moveTo(-throatWidth * 0.82, throatHeight + radius * 0.10);
  ctx.lineTo(-radius * 0.12, basketY);
  ctx.moveTo(throatWidth * 0.82, throatHeight + radius * 0.10);
  ctx.lineTo(radius * 0.12, basketY);
  ctx.stroke();

  const basketWidth = radius * 0.30;
  const basketHeight = radius * 0.20;
  ctx.fillStyle = mixHex("#7a5636", "#c3ccdc", haze);
  ctx.fillRect(-basketWidth / 2, basketY, basketWidth, basketHeight);
  ctx.fillStyle = mixHex("#5d3f26", "#b8c2d4", haze);
  ctx.fillRect(-basketWidth / 2, basketY + basketHeight * 0.33, basketWidth, basketHeight * 0.22);
  ctx.fillRect(-basketWidth / 2, basketY + basketHeight * 0.72, basketWidth, basketHeight * 0.28);
  ctx.fillStyle = mixHex("#8a6540", "#c9d1e0", haze);
  ctx.fillRect(-basketWidth / 2, basketY, basketWidth, basketHeight * 0.14);
  return { canvas, width, height, cx: centerX, cy: centerY };
}

export function BalloonsBg() {
  const draw: CanvasDraw<BalloonsState> = (ctx, width, height, time, state) => {
    state.onResize = (nextWidth, nextHeight) => {
      state.tex = makeLayer(nextWidth, nextHeight, (layerCtx) => {
        const sky = layerCtx.createLinearGradient(0, 0, 0, nextHeight * 0.85);
        sky.addColorStop(0, "#8894c8");
        sky.addColorStop(0.42, "#c9a3b4");
        sky.addColorStop(0.72, "#eec39a");
        sky.addColorStop(1, "#f7d98f");
        layerCtx.fillStyle = sky;
        layerCtx.fillRect(0, 0, nextWidth, nextHeight);
        const sunX = nextWidth * 0.24;
        const sunY = nextHeight * 0.68;
        const glow = layerCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, nextHeight * 0.55);
        glow.addColorStop(0, "rgba(255,238,185,0.8)");
        glow.addColorStop(0.35, "rgba(255,222,155,0.25)");
        glow.addColorStop(1, "rgba(255,222,155,0)");
        layerCtx.fillStyle = glow;
        layerCtx.fillRect(0, 0, nextWidth, nextHeight);

        for (let i = 0; i < 7; i += 1) {
          const cloudX = Math.random() * nextWidth;
          const cloudY = nextHeight * (0.06 + Math.random() * 0.4);
          const radiusX = nextWidth * (0.09 + Math.random() * 0.14);
          const radiusY = nextHeight * (0.008 + Math.random() * 0.012);
          const cloud = layerCtx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, radiusX);
          cloud.addColorStop(0, `rgba(255,235,215,${0.10 + Math.random() * 0.10})`);
          cloud.addColorStop(1, "rgba(255,235,215,0)");
          layerCtx.fillStyle = cloud;
          layerCtx.save();
          layerCtx.translate(cloudX, cloudY);
          layerCtx.scale(1, radiusY / radiusX);
          layerCtx.translate(-cloudX, -cloudY);
          layerCtx.beginPath();
          layerCtx.arc(cloudX, cloudY, radiusX, 0, Math.PI * 2);
          layerCtx.fill();
          layerCtx.restore();
        }

        const hills = [
          { base: 0.70, a1: 0.030, k1: 1.4, p: 1.2, top: "#b3b9cc", bot: "#a2aabf", mist: 0.38 },
          { base: 0.78, a1: 0.038, k1: 1.1, p: 3.8, top: "#8c99a9", bot: "#7a8a9a", mist: 0.30 },
          { base: 0.87, a1: 0.045, k1: 0.9, p: 0.4, top: "#647d81", bot: "#526b6f", mist: 0.24 },
          { base: 0.96, a1: 0.050, k1: 0.7, p: 2.3, top: "#465e5c", bot: "#33494a", mist: 0 },
        ];
        for (const hill of hills) {
          const yAt = (unit: number) => nextHeight * (
            hill.base
            + hill.a1 * Math.sin(unit * hill.k1 * Math.PI * 2 + hill.p)
            + hill.a1 * 0.4 * Math.sin(unit * hill.k1 * 2.7 * Math.PI * 2 + hill.p * 1.6)
          );
          if (hill.mist) {
            const mistY = nextHeight * (hill.base - hill.a1 * 1.4);
            const mist = layerCtx.createLinearGradient(0, mistY - nextHeight * 0.05, 0, mistY + nextHeight * 0.04);
            mist.addColorStop(0, "rgba(255,244,225,0)");
            mist.addColorStop(1, `rgba(255,244,225,${hill.mist})`);
            layerCtx.fillStyle = mist;
            layerCtx.fillRect(0, mistY - nextHeight * 0.05, nextWidth, nextHeight * 0.09);
          }
          const hillGradient = layerCtx.createLinearGradient(0, nextHeight * (hill.base - hill.a1 * 1.4), 0, nextHeight);
          hillGradient.addColorStop(0, hill.top);
          hillGradient.addColorStop(1, hill.bot);
          layerCtx.fillStyle = hillGradient;
          layerCtx.beginPath();
          layerCtx.moveTo(0, nextHeight);
          for (let px = 0; px <= nextWidth; px += 4) layerCtx.lineTo(px, yAt(px / nextWidth));
          layerCtx.lineTo(nextWidth, nextHeight);
          layerCtx.closePath();
          layerCtx.fill();
          if (hill.base > 0.8) {
            for (let i = 0; i < 130; i += 1) {
              const unit = Math.random();
              const pointY = yAt(unit) + Math.random() * nextHeight * 0.05;
              layerCtx.fillStyle = `rgba(20,38,36,${0.05 + Math.random() * 0.07})`;
              layerCtx.beginPath();
              layerCtx.arc(unit * nextWidth, pointY, 1 + Math.random() * 2, 0, Math.PI * 2);
              layerCtx.fill();
            }
          }
        }
        const valleyMist = layerCtx.createLinearGradient(0, nextHeight * 0.9, 0, nextHeight);
        valleyMist.addColorStop(0, "rgba(240,235,220,0)");
        valleyMist.addColorStop(1, "rgba(240,235,220,0.18)");
        layerCtx.fillStyle = valleyMist;
        layerCtx.fillRect(0, nextHeight * 0.9, nextWidth, nextHeight * 0.1);
      });

      const palettes: BalloonPalette[] = [
        ["#e2543e", "#f2cf5b"],
        ["#3f7fae", "#e8e3d3"],
        ["#c9522e", "#7a9e7e"],
        ["#8a5aa8", "#f0b95a"],
        ["#356e6a", "#e2b13c"],
        ["#b8434f", "#e8e3d3"],
        ["#d78a2e", "#5c7f99"],
        ["#7d5ba6", "#dfd7c4"],
      ];
      const raw = Array.from({ length: 8 }, (_, index) => ({
        sc: (0.30 + Math.random() * 0.85) * Math.max(0.55, nextHeight / 850),
        palette: palettes[index % palettes.length],
      })).sort((left, right) => left.sc - right.sc);
      const maxScale = raw[raw.length - 1]?.sc ?? 1;
      state.maxSc = maxScale;
      state.bal = raw.map((balloon) => {
        const depth = balloon.sc / maxScale;
        return {
          x: Math.random() * nextWidth,
          y: Math.random() * nextHeight,
          sc: balloon.sc,
          v: 7 + Math.random() * 8,
          vx: 3 + Math.random() * 6,
          ph: Math.random() * Math.PI * 2,
          spr: buildBalloonSprite(balloon.sc, balloon.palette, Math.max(0, 1 - depth) * 0.5),
        };
      });
      state.last = time;
    };
    if (!state.tex || !state.bal || !state.maxSc) return;
    const dt = Math.min(0.05, time - (state.last ?? time));
    state.last = time;

    ctx.drawImage(state.tex, 0, 0, width, height);

    for (const balloon of state.bal) {
      const depth = balloon.sc / state.maxSc;
      balloon.y -= balloon.v * (0.35 + depth * 0.65) * dt * 2.2;
      balloon.x += balloon.vx * (0.3 + depth * 0.7) * dt;
      const radius = 44 * balloon.sc;
      if (balloon.y < -radius * 2.6) {
        balloon.y = height + radius * 2.2;
        balloon.x = Math.random() * width * 0.9;
      }
      if (balloon.x - radius > width) balloon.x = -radius;
      const sway = Math.sin(time * 0.5 + balloon.ph) * 0.045;
      ctx.save();
      ctx.translate(balloon.x, balloon.y);
      ctx.rotate(sway);
      ctx.globalAlpha = 0.62 + 0.38 * depth;
      ctx.drawImage(balloon.spr.canvas, -balloon.spr.cx, -balloon.spr.cy, balloon.spr.width, balloon.spr.height);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
  const ref = useExtraCanvasAnim(draw);
  return <canvas ref={ref} className="dw-dynamic-bg-canvas" />;
}
