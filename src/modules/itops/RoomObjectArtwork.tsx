// Top-down artwork for Server Room fixtures. The live 2.5D constructions live
// separately in RoomObjectIsoReference.tsx because they are copied from the
// CSS-3D reference rather than drawn as SVG icons.

import { WALL_ARMS_DEFAULT, type RoomObjectKind, type WallArm, type WallArms } from "./roomObjects";

// Wall endpoint along its arm's axis, in viewBox units from the cell origin:
// joined arms run flush to the cell edge so neighbouring wall cells connect
// seamlessly, open free ends stop short of the edge, and a missing arm ends
// at the cell centre (the round cap overshoots slightly, like the design's
// centre joints).
function wallArmEnd(arm: WallArm, edge: 0 | 100): number {
  if (arm === "joined") return edge;
  if (arm === "open") return edge === 0 ? 7 : 93;
  return 50;
}

function WallPlanArtwork({ arms }: { arms: WallArms }) {
  const [south, west, north, east] = arms;
  const lines: string[] = [];
  if (west !== "none" || east !== "none") {
    lines.push(`M${wallArmEnd(west, 0)} 50H${wallArmEnd(east, 100)}`);
  }
  if (north !== "none" || south !== "none") {
    lines.push(`M50 ${wallArmEnd(north, 0)}V${wallArmEnd(south, 100)}`);
  }
  const d = lines.join("");
  const armCount = arms.filter((arm) => arm !== "none").length;
  const straightRun =
    armCount === 2 && ((west !== "none" && east !== "none") || (north !== "none" && south !== "none"));
  const nodes: Array<{ x: number; y: number }> = [];
  if (!straightRun) nodes.push({ x: 50, y: 50 });
  if (west === "open") nodes.push({ x: 7, y: 50 });
  if (east === "open") nodes.push({ x: 93, y: 50 });
  if (north === "open") nodes.push({ x: 50, y: 7 });
  if (south === "open") nodes.push({ x: 50, y: 93 });
  return (
    <>
      <path className="rm-art-wall-casing" d={d} />
      <path className="rm-art-wall-core" d={d} />
      {nodes.map((node) => (
        <rect
          key={`${node.x},${node.y}`}
          className="rm-art-wall-node"
          x={node.x - 4.5}
          y={node.y - 4.5}
          width="9"
          height="9"
          rx="2"
        />
      ))}
    </>
  );
}

export function RoomObjectPlanArtwork({
  kind,
  arms,
}: {
  kind: RoomObjectKind;
  /** Wall only: resolved auto-connect arms (wallArms); defaults to a straight run. */
  arms?: WallArms;
}) {
  return (
    <svg className="rm-object-art rm-object-art-plan" data-kind={kind} viewBox="0 0 100 100" aria-hidden="true">
      {kind === "wall" ? <WallPlanArtwork arms={arms ?? WALL_ARMS_DEFAULT} /> : null}
      {kind === "aircon" ? (
        <>
          <rect className="rm-art-soft" x="20" y="26" width="60" height="48" rx="5" />
          <rect className="rm-art-fill" x="20" y="70" width="60" height="7" rx="2" />
          <g transform="translate(37 46)"><g className="rm-art-fan"><circle r="10" /><path d="M0 0V-9M0 0l8 4M0 0l-8 4" /></g></g>
          <g transform="translate(63 46)"><g className="rm-art-fan reverse"><circle r="10" /><path d="M0 0V-9M0 0l8 4M0 0l-8 4" /></g></g>
          <g className="rm-art-airflow"><path d="M34 86l4 6 4-6M50 88l4 6 4-6M66 86l4 6 4-6" /></g>
        </>
      ) : null}
      {kind === "ups" ? (
        <>
          <rect className="rm-art-soft" x="28" y="18" width="44" height="64" rx="6" />
          <path className="rm-art-fill" d="M52 29 39 53h11l-4 19 16-27H51l5-16Z" />
          <path className="rm-art-detail" d="M34 73h32M34 25h32" />
        </>
      ) : null}
      {kind === "crashCart" ? (
        <>
          <rect className="rm-art-soft" x="26" y="30" width="48" height="40" rx="4" />
          <rect className="rm-art-dark" x="14" y="40" width="20" height="16" rx="2" strokeWidth="1.5" />
          <g stroke="var(--green)" strokeWidth="1.2" opacity="0.8"><path d="M17 44h14M17 48h14M17 52h10" /></g>
          <rect className="rm-art-detail" x="40" y="42" width="20" height="16" rx="2" />
          <rect className="rm-art-dark" x="46" y="26" width="8" height="8" rx="2" strokeWidth="1.5" />
          <path className="rm-art-line" d="M50 34v-4" strokeWidth="1.5" />
          <circle className="rm-art-fill" cx="30" cy="34" r="3.4" /><circle className="rm-art-fill" cx="70" cy="34" r="3.4" />
          <circle className="rm-art-fill" cx="30" cy="66" r="3.4" /><circle className="rm-art-fill" cx="70" cy="66" r="3.4" />
        </>
      ) : null}
      {kind === "camera" ? (
        <>
          <path className="rm-art-fov" d="M50 50 14 22a45 45 0 0 1 72 0Z" />
          <circle className="rm-art-soft" cx="50" cy="50" r="15" /><circle className="rm-art-dark" cx="50" cy="50" r="6.5" />
          <circle className="rm-art-fill" cx="50" cy="50" r="2.5" /><circle className="rm-art-alert" cx="61" cy="42" r="2" />
        </>
      ) : null}
      {kind === "sensor" ? (
        <>
          <circle className="rm-art-ring" cx="50" cy="50" r="20" /><circle className="rm-art-ring delayed" cx="50" cy="50" r="20" />
          <circle className="rm-art-soft" cx="50" cy="50" r="11" /><circle className="rm-art-fill rm-art-breathe" cx="50" cy="50" r="3.5" />
        </>
      ) : null}
      {kind === "smokeDetector" ? (
        <>
          <circle className="rm-art-soft" cx="50" cy="50" r="26" /><circle className="rm-art-detail" cx="50" cy="50" r="18" />
          <path className="rm-art-detail" d="M50 34v-6m0 44v-6M34 50h-6m44 0h-6M39 39l-4-4m26 4 4-4M39 61l-4 4m26-4 4 4" />
          <circle className="rm-art-ok" cx="50" cy="50" r="5" />
        </>
      ) : null}
      {kind === "fireExtinguisher" ? (
        <>
          <circle className="rm-art-soft" cx="50" cy="52" r="22" /><circle className="rm-art-detail" cx="50" cy="52" r="9" />
          <rect className="rm-art-fill" x="45" y="24" width="10" height="10" rx="2" /><path className="rm-art-line" d="M55 29q10-1 12 6" />
          <circle className="rm-art-fill rm-art-breathe" cx="67" cy="35" r="2.5" />
        </>
      ) : null}
      {kind === "kuaikuai" ? (
        <>
          <circle className="rm-art-aura" cx="50" cy="50" r="30" />
          <path className="rm-art-bag" d="m28 34 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3v34l-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3Z" />
          <rect className="rm-art-bag-label" x="42" y="42" width="16" height="10" rx="2.5" /><text className="rm-art-bag-text" x="50" y="50">KK</text>
          <g className="rm-art-dark-fill"><circle cx="45" cy="60" r="2.4" /><circle cx="50" cy="60" r="2.4" /><circle cx="55" cy="60" r="2.4" /></g>
        </>
      ) : null}
    </svg>
  );
}
