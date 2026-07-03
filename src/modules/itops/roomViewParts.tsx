// Shared pieces for the two spatial Server Room layouts (floor plan + 2.5D):
// the per-rack status tag chips that replaced the old health/utilisation/power
// metric toggle, the room-object glyph set, and the edit-mode object palette
// used to arm placement of a non-rack fixture (see roomObjects.ts).

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import type { Rack } from "../../types";
import { rackFloorMetrics } from "./roomFloorPlan";
import { ROOM_OBJECT_KINDS, type RoomObjectKind } from "./roomObjects";
import { ROOM_ZOOM_LEVELS, sanitizeRoomZoom, stepRoomZoom } from "./siteTreeState";
import { IT_ACCENTS, ItIcon } from "./icons";

/** Accent colour per object kind (乖乖 is green — it has a job to do). Fed to
 *  CSS as the `--obj`/`--tile` custom properties, mirroring TILE_COLORS. */
export const OBJECT_ACCENTS: Record<RoomObjectKind, string> = {
  camera: IT_ACCENTS.indigo,
  aircon: IT_ACCENTS.teal,
  fireExtinguisher: IT_ACCENTS.red,
  cableTray: IT_ACCENTS.orange,
  ups: IT_ACCENTS.purple,
  sensor: IT_ACCENTS.blue,
  smokeDetector: IT_ACCENTS.graphite,
  crashCart: IT_ACCENTS.pink,
  kuaikuai: IT_ACCENTS.green,
};

// ── Viewport-filling grids ──

/** Content-box size of the scroll viewport hosting a room view, so the floor
 *  grid can grow to cover the whole visible area. Null until the first
 *  measure (and in DOM-less tests), which renders the layout's natural
 *  minimum. */
export function useRoomViewportSize(): [
  RefObject<HTMLDivElement | null>,
  { w: number; h: number } | null,
] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      // Slightly conservative: grids size themselves to exactly this box, and
      // exact-fit content can pin a transient scrollbar forever (each bar
      // justifies the other). A 2px allowance lets scrollbars always retract.
      const w = Math.max(0, node.clientWidth - 2);
      const h = Math.max(0, node.clientHeight - 2);
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

/** Step the zoom on Ctrl+wheel over the room's scroll viewport (the browser
 *  page-zoom gesture, repurposed for the room). A native non-passive listener
 *  because React registers `onWheel` passively, which cannot preventDefault. */
export function useCtrlWheelZoom(
  ref: RefObject<HTMLDivElement | null>,
  onStep: (dir: 1 | -1) => void,
): void {
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      stepRef.current(event.deltaY < 0 ? 1 : -1);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [ref]);
}

/** Pan the room by scrolling its viewport: middle-mouse drag (preventDefault
 *  suppresses the browser's autoscroll gadget) and arrow keys. The scroll
 *  element carries tabIndex 0, so clicking anywhere in the room — floor or a
 *  rack button inside it — puts focus where the keydown listener hears it. */
export function useRoomPan(ref: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 1) return;
      event.preventDefault();
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      node.style.cursor = "grabbing";
      node.focus({ preventScroll: true });
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // Keep panning uncaptured if the pointer is already gone.
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      node.scrollLeft -= event.clientX - lastX;
      node.scrollTop -= event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const endPan = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      node.style.cursor = "";
    };
    const PAN_STEP = 64;
    const KEY_DELTAS: Record<string, [number, number]> = {
      ArrowLeft: [-PAN_STEP, 0],
      ArrowRight: [PAN_STEP, 0],
      ArrowUp: [0, -PAN_STEP],
      ArrowDown: [0, PAN_STEP],
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const delta = KEY_DELTAS[event.key];
      if (!delta || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      node.scrollBy({ left: delta[0], top: delta[1] });
    };
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", endPan);
    node.addEventListener("pointercancel", endPan);
    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", endPan);
      node.removeEventListener("pointercancel", endPan);
      node.removeEventListener("keydown", onKeyDown);
    };
  }, [ref]);
}

// ── Zoom stepper ──

/** Fixed zoom levels shared by both spatial views; the middle button resets
 *  to 100%. Persisted per view via siteTreeState.loadRoomZoom/saveRoomZoom. */
export function RoomZoomControl({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const { t } = useTranslation();
  const level = sanitizeRoomZoom(zoom);
  return (
    <div className="rm-zoom" role="group" aria-label={t("itops.floorPlan.zoomLabel")}>
      <button
        type="button"
        title={t("itops.floorPlan.zoomOut")}
        aria-label={t("itops.floorPlan.zoomOut")}
        disabled={level <= ROOM_ZOOM_LEVELS[0]}
        onClick={() => onZoomChange(stepRoomZoom(level, -1))}
      >
        <ItIcon name="minus" size={13} />
      </button>
      <button
        type="button"
        className="rm-zoom-val"
        title={t("itops.floorPlan.zoomReset")}
        onClick={() => onZoomChange(1)}
      >
        {Math.round(level * 100)}%
      </button>
      <button
        type="button"
        title={t("itops.floorPlan.zoomIn")}
        aria-label={t("itops.floorPlan.zoomIn")}
        disabled={level >= ROOM_ZOOM_LEVELS[ROOM_ZOOM_LEVELS.length - 1]}
        onClick={() => onZoomChange(stepRoomZoom(level, 1))}
      >
        <ItIcon name="plus" size={13} />
      </button>
    </div>
  );
}

// ── Rack status tags ──

/** Compact always-visible tags on a rack footprint: health dot, occupied U,
 *  and power draw (only when any device declares one). */
export function RackTagChips({ rack }: { rack: Rack }) {
  const { t } = useTranslation();
  const m = rackFloorMetrics(rack);
  return (
    <span className="rm-tags">
      <span
        className="rm-tag rm-tag-health"
        data-health={m.health}
        title={t(`itops.floorPlan.health.${m.health}`)}
      >
        <i />
        {m.deviceCount}
      </span>
      <span className="rm-tag" title={t("itops.floorPlan.utilizationValue", { percent: Math.round(m.utilization * 100) })}>
        {m.usedU}/{m.capacityU}U
      </span>
      {m.powerW > 0 ? (
        <span
          className="rm-tag"
          title={
            m.powerCapacityW != null
              ? t("itops.floorPlan.powerValue", { used: m.powerW, capacity: m.powerCapacityW })
              : t("itops.floorPlan.powerDrawOnly", { watts: m.powerW })
          }
        >
          {m.powerW}W
        </span>
      ) : null}
    </span>
  );
}

// ── Room-object glyphs ──

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const OBJECT_GLYPHS: Record<RoomObjectKind, (size: number) => ReactNode> = {
  camera: (size) => (
    <Svg size={size}>
      <rect x="3" y="6" width="12" height="8" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M15 9l6-2v6l-6-2" />
      <path d="M7 14v4h5" />
    </Svg>
  ),
  aircon: (size) => (
    <Svg size={size}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2" />
    </Svg>
  ),
  fireExtinguisher: (size) => (
    <Svg size={size}>
      <path d="M9 8a3 3 0 0 1 6 0v11a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19V8Z" />
      <path d="M12 5V3.5" />
      <path d="M10 3.5h4" />
      <path d="M9 6.5 5.5 5v3" />
    </Svg>
  ),
  cableTray: (size) => (
    <Svg size={size}>
      <path d="M3 8h18" />
      <path d="M3 16h18" />
      <path d="M6 8v8M11 8v8M16 8v8M21 8v8M3 8v8" />
    </Svg>
  ),
  ups: (size) => (
    <Svg size={size}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M12 8l-2.5 4.5H12L11 17l3.5-5.5H12L13 8Z" />
    </Svg>
  ),
  sensor: (size) => (
    <Svg size={size}>
      <circle cx="12" cy="14" r="3" />
      <path d="M12 11V4" />
      <path d="M7.5 8.5a7 7 0 0 1 9 0" />
      <path d="M5.5 5.8a10 10 0 0 1 13 0" />
    </Svg>
  ),
  smokeDetector: (size) => (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2" />
    </Svg>
  ),
  crashCart: (size) => (
    <Svg size={size}>
      <rect x="5" y="5" width="13" height="12" rx="1.5" />
      <path d="M5 9h13M5 13h13" />
      <circle cx="8.5" cy="19.5" r="1.5" />
      <circle cx="15.5" cy="19.5" r="1.5" />
      <path d="M18 5h2.5" />
    </Svg>
  ),
  kuaikuai: (size) => (
    <Svg size={size}>
      <path d="M8 4h8l1 2-1 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 18.5V7.5L7 6l1-2Z" />
      <path d="M8 7.5h8" />
      <path d="m12 11 .9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3L12 11Z" />
    </Svg>
  ),
};

export function ObjectGlyph({ kind, size = 14 }: { kind: RoomObjectKind; size?: number }) {
  return <>{OBJECT_GLYPHS[kind](size)}</>;
}

// ── Edit-mode object palette ──

/** The armed placement tool: null = move/select, or the object kind the next
 *  cell click will place. */
export type RoomTool = RoomObjectKind | null;

export function RoomObjectPalette({
  tool,
  onToolChange,
}: {
  tool: RoomTool;
  onToolChange: (tool: RoomTool) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rm-palette" role="group" aria-label={t("itops.floorPlan.paletteLabel")}>
      <span className="rm-palette-h">{t("itops.floorPlan.paletteLabel")}</span>
      {ROOM_OBJECT_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          data-active={tool === kind}
          title={t(`itops.floorPlan.object.${kind}`)}
          aria-pressed={tool === kind}
          onClick={() => onToolChange(tool === kind ? null : kind)}
        >
          <ObjectGlyph kind={kind} size={15} />
          <span>{t(`itops.floorPlan.object.${kind}`)}</span>
        </button>
      ))}
    </div>
  );
}
