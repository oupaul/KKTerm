import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { placeRoomRackHoverCard } from "../src/modules/itops/roomViewParts";

const boundary = { left: 100, top: 50, right: 500, bottom: 350 };
const card = { width: 140, height: 100 };

test("room Rack hover cards stay inside every viewport edge", () => {
  for (const pointer of [
    { x: 102, y: 200 },
    { x: 498, y: 200 },
    { x: 300, y: 52 },
    { x: 300, y: 348 },
  ]) {
    const placed = placeRoomRackHoverCard(pointer, card, boundary);
    assert.ok(placed.left >= boundary.left + 8);
    assert.ok(placed.left + card.width <= boundary.right - 8);
    assert.ok(placed.top >= boundary.top + 8);
    assert.ok(placed.top + card.height <= boundary.bottom - 8);
  }
});

test("both spatial views use the shared portaled Rack hover card", async () => {
  const [floorPlan, isoView, css] = await Promise.all([
    readFile(new URL("../src/modules/itops/ServerRoomFloorPlan.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/itops/ServerRoomIsoView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/itops/itops.css", import.meta.url), "utf8"),
  ]);

  for (const view of [floorPlan, isoView]) {
    assert.match(view, /<RoomRackHoverCard/);
  }
  assert.match(css, /\.rm-rack-hover-portal \{[^}]*position: fixed;[^}]*pointer-events: none;/s);
  assert.match(css, /\.rm-rack-hover-card \{[^}]*position: fixed;/s);
});
