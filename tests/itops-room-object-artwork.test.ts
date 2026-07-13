import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RoomObjectPlanArtwork,
} from "../src/modules/itops/RoomObjectArtwork";
import { RoomObjectIsoArtwork } from "../src/modules/itops/RoomObjectIsoReference";
import { ROOM_OBJECT_KINDS, type WallArms } from "../src/modules/itops/roomObjects";
import { RoomPlacementFacingArrow } from "../src/modules/itops/roomViewParts";

test("snapped placement arrows encode facing and 2.5D lift", () => {
  const arrow = renderToStaticMarkup(
    createElement(RoomPlacementFacingArrow, { facing: 3, liftPx: 92 }),
  );

  assert.match(arrow, /class="rm-placement-facing-arrow"/);
  assert.match(arrow, /--placement-facing-angle:270deg/);
  assert.match(arrow, /--placement-facing-lift:92px/);
  assert.match(arrow, /aria-hidden="true"/);
});

test("every Server Room object has distinct floor-plan and 2.5D artwork", () => {
  for (const kind of ROOM_OBJECT_KINDS) {
    const plan = renderToStaticMarkup(createElement(RoomObjectPlanArtwork, { kind }));
    const iso = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind, facing: 0 }));

    assert.match(plan, new RegExp(`data-kind="${kind}"`));
    assert.match(iso, new RegExp(`data-kind="${kind}"`));
    assert.ok(plan.includes("<svg") && plan.includes("</svg>"));
    assert.match(iso, /rm-ref-iso-stage/);
    assert.match(iso, /rotateX\(55deg\) rotateZ\(45deg\)/);
    assert.notEqual(plan, iso);
  }
});

test("2.5D room objects render the four effective quarter-turn facings", () => {
  for (const [facing, degrees] of [
    [0, 45],
    [1, 135],
    [2, 225],
    [3, 315],
  ] as const) {
    const iso = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "aircon", facing }));
    assert.match(iso, new RegExp(`data-facing="${facing}"`));
    assert.match(iso, new RegExp(`rotateZ\\(${degrees}deg\\)`));
    assert.match(iso, new RegExp(`rotateZ\\(-${degrees}deg\\)`));
  }
});

test("wall artwork follows its resolved arms in both projections", () => {
  // Arms are indexed by Facing direction: 0 = +y, 1 = −x, 2 = −y, 3 = +x.
  const corner: WallArms = ["joined", "none", "none", "joined"];

  // Plan: the default straight run stops short of both edges (open ends),
  // while joined arms run flush to the cell edge to meet the neighbour.
  const planStraight = renderToStaticMarkup(createElement(RoomObjectPlanArtwork, { kind: "wall" }));
  const planCorner = renderToStaticMarkup(
    createElement(RoomObjectPlanArtwork, { kind: "wall", arms: corner }),
  );
  assert.match(planStraight, /M7 50H93/);
  assert.match(planCorner, /M50 50H100/);
  assert.match(planCorner, /M50 50V100/);
  assert.notEqual(planStraight, planCorner);

  // 2.5D: the straight run keeps the reference STRAIGHT box, and a fully
  // joined cross spans edge to edge on both axes.
  const isoStraight = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "wall" }));
  const isoCross = renderToStaticMarkup(
    createElement(RoomObjectIsoArtwork, {
      kind: "wall",
      arms: ["joined", "joined", "joined", "joined"] as WallArms,
    }),
  );
  assert.match(isoStraight, /left:-38px;top:-6px;width:76px;height:12px/);
  assert.match(isoStraight, /translateZ\(56px\)/);
  assert.match(isoCross, /left:-44px;top:-6px;width:88px;height:12px/);
  assert.match(isoCross, /left:-6px;top:-44px;width:12px;height:88px/);
});

test("floor-plan walls span rectangular grid cells without SVG letterboxing", () => {
  const wall = renderToStaticMarkup(createElement(RoomObjectPlanArtwork, { kind: "wall" }));
  const aircon = renderToStaticMarkup(createElement(RoomObjectPlanArtwork, { kind: "aircon" }));

  assert.match(wall, /preserveAspectRatio="none"/);
  assert.doesNotMatch(aircon, /preserveAspectRatio="none"/);
});

test("2.5D 乖乖 sits on the real room surface instead of a fake rack top", () => {
  const iso = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "kuaikuai" }));

  assert.doesNotMatch(iso, /rm-art-rack-top/);
  assert.doesNotMatch(iso, /rm-art-float/);
});

test("2.5D reference models retain the design-file construction dimensions", () => {
  const aircon = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "aircon" }));
  const ups = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "ups" }));

  assert.match(aircon, /width:56px;height:38px/);
  assert.match(aircon, /translateZ\(104px\)/);
  assert.match(aircon, /18°/);
  assert.match(ups, /width:40px;height:40px/);
  assert.match(ups, /translateZ\(62px\)/);
  assert.match(ups, /88% · online/);
});

test("snapped 2.5D previews do not flatten the reference model", async () => {
  const css = await readFile(
    new URL("../src/modules/itops/itops.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.rm-iso-obj-model \{[^}]*transform-style: preserve-3d/s);
  assert.match(css, /\.rm-iso-plane \.rm-ref-iso-stage > div \{[^}]*transform: none !important/s);
  for (const [facing, degrees] of [[1, 90], [2, 180], [3, 270]]) {
    assert.match(
      css,
      new RegExp(`data-facing="${facing}"[^}]*rm-ref-iso-stage > div \\{[^}]*rotateZ\\(${degrees}deg\\) !important`, "s"),
    );
  }
  assert.doesNotMatch(css, /\.rm-iso-obj\.ghost \{[^}]*opacity:/s);
  assert.doesNotMatch(css, /\.itops-page \.rm-iso-obj-model \{[^}]*filter:/s);
  assert.match(
    css,
    /data-kind="wall"[^}]*rm-ref-iso-stage \{ transform: scale3d\(0\.66, 0\.66, 2\); \}/,
  );
});

test("quarter-cell fire extinguisher and floor 乖乖 artwork stay within their footprints", async () => {
  const css = await readFile(
    new URL("../src/modules/itops/itops.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /data-kind="fireExtinguisher"[^}]*rm-ref-iso-stage \{ transform: scale3d\(0\.27, 0\.27, 0\.5\); \}/);
  assert.match(css, /data-kind="kuaikuai"[^}]*rm-ref-iso-stage \{ transform: scale3d\(0\.33, 0\.33, 0\.25\); \}/);
});

test("rack-top 乖乖 uses the same erected artwork as the standalone pack", async () => {
  const isoView = await readFile(
    new URL("../src/modules/itops/ServerRoomIsoView.tsx", import.meta.url),
    "utf8",
  );
  const floorPlan = await readFile(
    new URL("../src/modules/itops/ServerRoomFloorPlan.tsx", import.meta.url),
    "utf8",
  );
  const rackView = await readFile(
    new URL("../src/modules/itops/RackElevation.tsx", import.meta.url),
    "utf8",
  );

  assert.match(isoView, /className="rm-iso-rack-top-kuaiguai"[\s\S]*<RoomObjectIsoArtwork[\s\S]*kind="kuaikuai"/);
  assert.doesNotMatch(isoView, /rm-iso-top-kuaiguai[\s\S]*style="laidDown"/);
  assert.match(floorPlan, /className="rm-bp-top-kuaiguai"[\s\S]*<RoomObjectPlanArtwork kind="kuaikuai"/);
  assert.doesNotMatch(floorPlan, /rm-bp-top-kuaiguai[\s\S]*style="laidDown"/);
  assert.match(floorPlan, /rackTopCornerPoint\(topKuaiguai\?\.metadata\?\.rackTopCorner\)/);
  assert.match(isoView, /rackTopCornerPoint\([\s\S]*rackTopCorner[\s\S]*viewAngle/);
  assert.doesNotMatch(rackView, /rackTopCorner/);
});

test("expiry grayscale does not flatten the 2.5D 乖乖 construction", async () => {
  const iso = renderToStaticMarkup(
    createElement(RoomObjectIsoArtwork, { kind: "kuaikuai", expiry: "2000-01-01" }),
  );
  const css = await readFile(
    new URL("../src/modules/itops/itops.css", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(iso, /class="rm-object-art rm-object-art-iso"[^>]*style="[^"]*filter:/);
  assert.match(iso, /--kuaiguai-grayscale:/);
  assert.match(
    css,
    /\.rm-ref-kuaikuai-face\s*\{[^}]*filter:\s*brightness\(var\(--kuaiguai-brightness[^}]*grayscale\(var\(--kuaiguai-grayscale/s,
  );
});
