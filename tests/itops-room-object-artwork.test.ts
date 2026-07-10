import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RoomObjectPlanArtwork,
} from "../src/modules/itops/RoomObjectArtwork";
import { RoomObjectIsoArtwork } from "../src/modules/itops/RoomObjectIsoReference";
import { ROOM_OBJECT_KINDS } from "../src/modules/itops/roomObjects";

test("every Server Room object has distinct floor-plan and 2.5D artwork", () => {
  for (const kind of ROOM_OBJECT_KINDS) {
    const plan = renderToStaticMarkup(createElement(RoomObjectPlanArtwork, { kind }));
    const iso = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind }));

    assert.match(plan, new RegExp(`data-kind="${kind}"`));
    assert.match(iso, new RegExp(`data-kind="${kind}"`));
    assert.ok(plan.includes("<svg") && plan.includes("</svg>"));
    assert.match(iso, /rm-ref-iso-stage/);
    assert.match(iso, /rotateX\(55deg\) rotateZ\(45deg\)/);
    assert.notEqual(plan, iso);
  }
});

test("2.5D 乖乖 sits on the real room surface instead of a fake rack top", () => {
  const iso = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "kuaikuai" }));

  assert.doesNotMatch(iso, /rm-art-rack-top/);
  assert.doesNotMatch(iso, /rm-art-float/);
});

test("2.5D reference models retain the design-file construction dimensions", () => {
  const aircon = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "aircon" }));
  const ups = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "ups" }));
  const cableTray = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind: "cableTray" }));

  assert.match(aircon, /width:56px;height:38px/);
  assert.match(aircon, /translateZ\(104px\)/);
  assert.match(aircon, /18°/);
  assert.match(ups, /width:40px;height:40px/);
  assert.match(ups, /translateZ\(62px\)/);
  assert.match(ups, /88% · online/);
  assert.match(cableTray, /width:84px;height:22px/);
  assert.match(cableTray, /translateZ\(54px\)/);
});

test("snapped 2.5D previews do not flatten the reference model", async () => {
  const css = await readFile(
    new URL("../src/modules/itops/itops.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.rm-iso-obj-model \{[^}]*transform-style: preserve-3d/s);
  assert.match(css, /\.rm-iso-plane \.rm-ref-iso-stage > div \{[^}]*transform: none !important/s);
  assert.doesNotMatch(css, /\.rm-iso-obj\.ghost \{[^}]*opacity:/s);
  assert.doesNotMatch(css, /\.itops-page \.rm-iso-obj-model \{[^}]*filter:/s);
});
