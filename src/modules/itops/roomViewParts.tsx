// Shared pieces for the two spatial Server Room layouts (floor plan + 2.5D):
// the per-rack status tag chips that replaced the old health/utilisation/power
// metric toggle, the room-object glyph set, and the edit-mode object palette
// used to arm placement of a non-rack fixture (see roomObjects.ts).

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Rack } from "../../types";
import { rackFloorMetrics } from "./roomFloorPlan";
import { ROOM_OBJECT_KINDS, type RoomObjectKind } from "./roomObjects";
import { IT_ACCENTS } from "./icons";

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
