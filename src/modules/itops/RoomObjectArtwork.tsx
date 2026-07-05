// Visual language for Server Room fixtures. The top-down footprints and
// axonometric illustrations follow the reference in .tmp/serverroomobjects;
// interaction and placement remain owned by the room views.

import type { RoomObjectKind } from "./roomObjects";

export function RoomObjectPlanArtwork({ kind }: { kind: RoomObjectKind }) {
  return (
    <svg className="rm-object-art rm-object-art-plan" data-kind={kind} viewBox="0 0 100 100" aria-hidden="true">
      {kind === "aircon" ? (
        <>
          <rect className="rm-art-soft" x="20" y="26" width="60" height="48" rx="5" />
          <rect className="rm-art-fill" x="20" y="70" width="60" height="7" rx="2" />
          <g transform="translate(37 46)">
            <g className="rm-art-fan">
              <circle r="10" />
              <path d="M0 0V-9M0 0l8 4M0 0l-8 4" />
            </g>
          </g>
          <g transform="translate(63 46)">
            <g className="rm-art-fan reverse">
              <circle r="10" />
              <path d="M0 0V-9M0 0l8 4M0 0l-8 4" />
            </g>
          </g>
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
          <circle className="rm-art-fill" cx="35" cy="80" r="5" />
          <circle className="rm-art-fill" cx="64" cy="80" r="5" />
        </>
      ) : null}
      {kind === "camera" ? (
        <>
          <path className="rm-art-fov" d="M50 50 14 22a45 45 0 0 1 72 0Z" />
          <circle className="rm-art-soft" cx="50" cy="50" r="15" />
          <circle className="rm-art-dark" cx="50" cy="50" r="6.5" />
          <circle className="rm-art-fill" cx="50" cy="50" r="2.5" />
          <circle className="rm-art-alert" cx="61" cy="42" r="2" />
        </>
      ) : null}
      {kind === "sensor" ? (
        <>
          <circle className="rm-art-ring" cx="50" cy="50" r="20" />
          <circle className="rm-art-ring delayed" cx="50" cy="50" r="20" />
          <circle className="rm-art-soft" cx="50" cy="50" r="11" />
          <circle className="rm-art-fill rm-art-breathe" cx="50" cy="50" r="3.5" />
        </>
      ) : null}
      {kind === "smokeDetector" ? (
        <>
          <circle className="rm-art-soft" cx="50" cy="50" r="26" />
          <circle className="rm-art-detail" cx="50" cy="50" r="18" />
          <path className="rm-art-detail" d="M50 34v-6m0 44v-6M34 50h-6m44 0h-6M39 39l-4-4m26 4 4-4M39 61l-4 4m26-4 4 4" />
          <circle className="rm-art-ok" cx="50" cy="50" r="5" />
        </>
      ) : null}
      {kind === "fireExtinguisher" ? (
        <>
          <circle className="rm-art-soft" cx="50" cy="52" r="22" />
          <circle className="rm-art-detail" cx="50" cy="52" r="9" />
          <rect className="rm-art-fill" x="45" y="24" width="10" height="10" rx="2" />
          <path className="rm-art-line" d="M55 29q10-1 12 6" />
          <circle className="rm-art-fill rm-art-breathe" cx="67" cy="35" r="2.5" />
        </>
      ) : null}
      {kind === "cableTray" ? (
        <>
          <rect className="rm-art-soft" x="8" y="34" width="84" height="32" rx="3" />
          <path className="rm-art-detail" d="M20 34v32m12-32v32m12-32v32m12-32v32m12-32v32m12-32v32" />
          <path className="rm-art-cable blue" d="M12 44h76" />
          <path className="rm-art-cable green" d="M12 50h76" />
          <path className="rm-art-cable amber" d="M12 56h76" />
          <circle className="rm-art-signal" cx="20" cy="44" r="3.2" />
        </>
      ) : null}
      {kind === "kuaikuai" ? (
        <>
          <circle className="rm-art-aura" cx="50" cy="50" r="30" />
          <path className="rm-art-bag" d="m28 34 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3v34l-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3-3 3-3-3Z" />
          <rect className="rm-art-bag-label" x="42" y="42" width="16" height="10" rx="2.5" />
          <text className="rm-art-bag-text" x="50" y="50">KK</text>
          <g className="rm-art-dark-fill"><circle cx="45" cy="60" r="2.4" /><circle cx="50" cy="60" r="2.4" /><circle cx="55" cy="60" r="2.4" /></g>
        </>
      ) : null}
    </svg>
  );
}

export function RoomObjectIsoArtwork({ kind }: { kind: RoomObjectKind }) {
  return (
    <svg className="rm-object-art rm-object-art-iso" data-kind={kind} viewBox="0 0 100 100" aria-hidden="true">
      {kind === "aircon" ? (
        <>
          <path className="rm-art-iso-top" d="m25 20 39-12 17 12-39 13Z" />
          <path className="rm-art-iso-side" d="m64 8 17 12v63L64 94Z" />
          <path className="rm-art-iso-front" d="m25 20 39-12v86L25 81Z" />
          <g className="rm-art-vent"><path d="M31 27 58 19M31 33l27-8M31 39l27-8M31 45l27-8M31 51l27-8M31 57l27-8" /></g>
          <path className="rm-art-dark" d="m31 64 27-8v25l-27 7Z" />
          <circle className="rm-art-ok" cx="38" cy="70" r="2.4" /><circle className="rm-art-fill" cx="46" cy="68" r="2.4" />
        </>
      ) : null}
      {kind === "ups" ? (
        <>
          <path className="rm-art-ups-top" d="m22 27 39-18 20 13-40 19Z" />
          <path className="rm-art-ups-side" d="m61 9 20 13v57L61 91Z" />
          <path className="rm-art-ups-front" d="m22 27 39-18v82L22 75Z" />
          <rect className="rm-art-dark" x="29" y="37" width="25" height="29" rx="2" transform="skewY(-14)" />
          <path className="rm-art-charge" d="m44 35-9 16h7l-3 12 12-20h-8l5-8Z" />
          <path className="rm-art-led-bars" d="M31 72h5m3-2h5m3-2h5" />
        </>
      ) : null}
      {kind === "crashCart" ? (
        <>
          <ellipse className="rm-art-shadow" cx="50" cy="87" rx="33" ry="8" />
          <path className="rm-art-cart" d="m25 65 45-12 10 10-45 14Z" />
          <path className="rm-art-cart-leg" d="M33 70v13m38-23v14" />
          <circle className="rm-art-wheel" cx="33" cy="85" r="4" /><circle className="rm-art-wheel" cx="71" cy="77" r="4" />
          <path className="rm-art-screen" d="m31 22 39-9 1 39-39 10Z" />
          <path className="rm-art-terminal" d="m38 31 8-2m-8 7 20-5m-20 11 13-3m-13 10 24-6" />
          <path className="rm-art-stand" d="m51 57 1 10" />
        </>
      ) : null}
      {kind === "camera" ? (
        <>
          <path className="rm-art-beam" d="M50 75 6 92h88Z" />
          <path className="rm-art-mast" d="M49 28h3v42h-3Z" />
          <path className="rm-art-camera-cap" d="M33 62h35v9H33Z" />
          <path className="rm-art-camera-dome" d="M37 69h27c0 13-5 19-14 19s-13-6-13-19Z" />
          <circle className="rm-art-camera-lens" cx="50" cy="77" r="6" />
          <circle className="rm-art-alert" cx="63" cy="67" r="2.5" />
        </>
      ) : null}
      {kind === "sensor" ? (
        <>
          <ellipse className="rm-art-ring" cx="50" cy="77" rx="28" ry="10" />
          <ellipse className="rm-art-ring delayed" cx="50" cy="77" rx="28" ry="10" />
          <path className="rm-art-mast" d="M48 48h4v29h-4Z" />
          <rect className="rm-art-sensor" x="31" y="31" width="38" height="22" rx="6" />
          <circle className="rm-art-fill rm-art-breathe" cx="42" cy="42" r="3" />
          <text className="rm-art-reading" x="50" y="45">22°</text>
        </>
      ) : null}
      {kind === "smokeDetector" ? (
        <>
          <ellipse className="rm-art-smoke-side" cx="50" cy="64" rx="31" ry="13" />
          <ellipse className="rm-art-smoke-top" cx="50" cy="56" rx="31" ry="13" />
          <ellipse className="rm-art-detail" cx="50" cy="56" rx="18" ry="7" />
          <circle className="rm-art-ok" cx="50" cy="56" r="4" />
        </>
      ) : null}
      {kind === "fireExtinguisher" ? (
        <>
          <ellipse className="rm-art-shadow" cx="50" cy="88" rx="18" ry="6" />
          <path className="rm-art-extinguisher" d="M34 38c0-9 32-9 32 0v41c0 11-32 11-32 0Z" />
          <ellipse className="rm-art-ext-top" cx="50" cy="38" rx="16" ry="6" />
          <rect className="rm-art-ext-label" x="39" y="52" width="22" height="16" rx="2" />
          <path className="rm-art-hose" d="M52 27c15-5 21 4 22 13" />
          <rect className="rm-art-dark" x="44" y="24" width="12" height="9" rx="3" />
        </>
      ) : null}
      {kind === "cableTray" ? (
        <>
          <path className="rm-art-tray" d="m8 45 67-20 18 13-68 21Z" />
          <path className="rm-art-tray-rungs" d="m18 42 18 13m-7-18 18 13m-7-18 18 13m-7-18 18 13m-7-18 18 13" />
          <path className="rm-art-cable blue" d="m13 44 68-20" /><path className="rm-art-cable green" d="m18 49 68-20" /><path className="rm-art-cable amber" d="m23 54 68-20" />
          <path className="rm-art-support" d="M16 43v36m68-52v36" />
          <circle className="rm-art-signal" cx="35" cy="39" r="3" />
        </>
      ) : null}
      {kind === "kuaikuai" ? (
        <>
          <ellipse className="rm-art-shadow" cx="50" cy="91" rx="24" ry="7" />
          <ellipse className="rm-art-aura rm-art-breathe" cx="50" cy="88" rx="24" ry="8" />
          <g transform="translate(0 18)">
            <path className="rm-art-bag" d="m34 22 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3v51l-4 3-4-3-4 3-4-3-4 3-4-3-4 3-4-3Z" />
            <rect className="rm-art-bag-label" x="42" y="31" width="16" height="9" rx="2" />
            <text className="rm-art-bag-text" x="50" y="39">KK</text>
            <rect className="rm-art-dark" x="39" y="46" width="22" height="16" rx="3" />
            <text className="rm-art-terminal-text" x="50" y="58">KK</text>
          </g>
        </>
      ) : null}
    </svg>
  );
}
