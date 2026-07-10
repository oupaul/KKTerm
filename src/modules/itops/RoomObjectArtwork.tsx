// Top-down artwork for Server Room fixtures. The live 2.5D constructions live
// separately in RoomObjectIsoReference.tsx because they are copied from the
// CSS-3D reference rather than drawn as SVG icons.

import type { RoomObjectKind } from "./roomObjects";

export function RoomObjectPlanArtwork({ kind }: { kind: RoomObjectKind }) {
  return (
    <svg className="rm-object-art rm-object-art-plan" data-kind={kind} viewBox="0 0 100 100" aria-hidden="true">
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
          <rect className="rm-art-soft" x="24" y="28" width="50" height="46" rx="5" />
          <path className="rm-art-line" d="M18 36h62M27 47h44M27 59h44M74 31h10v18" />
          <circle className="rm-art-fill" cx="35" cy="80" r="5" /><circle className="rm-art-fill" cx="64" cy="80" r="5" />
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
      {kind === "cableTray" ? (
        <>
          <rect className="rm-art-soft" x="8" y="34" width="84" height="32" rx="3" />
          <path className="rm-art-detail" d="M20 34v32m12-32v32m12-32v32m12-32v32m12-32v32m12-32v32" />
          <path className="rm-art-cable blue" d="M12 44h76" /><path className="rm-art-cable green" d="M12 50h76" /><path className="rm-art-cable amber" d="M12 56h76" />
          <circle className="rm-art-signal" cx="20" cy="44" r="3.2" />
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
