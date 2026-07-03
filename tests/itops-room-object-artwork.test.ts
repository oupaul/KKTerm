import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RoomObjectIsoArtwork,
  RoomObjectPlanArtwork,
} from "../src/modules/itops/RoomObjectArtwork";
import { ROOM_OBJECT_KINDS } from "../src/modules/itops/roomObjects";

test("every Server Room object has distinct floor-plan and 2.5D artwork", () => {
  for (const kind of ROOM_OBJECT_KINDS) {
    const plan = renderToStaticMarkup(createElement(RoomObjectPlanArtwork, { kind }));
    const iso = renderToStaticMarkup(createElement(RoomObjectIsoArtwork, { kind }));

    assert.match(plan, new RegExp(`data-kind="${kind}"`));
    assert.match(iso, new RegExp(`data-kind="${kind}"`));
    assert.ok(plan.includes("<svg") && plan.includes("</svg>"));
    assert.ok(iso.includes("<svg") && iso.includes("</svg>"));
    assert.notEqual(plan, iso);
  }
});
