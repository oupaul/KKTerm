import assert from "node:assert/strict";
import test from "node:test";
import type { RackItem, RackItemMetadata } from "../src/types";
import { rackItemKindSupportsFractionalWidth } from "../src/modules/itops/rackInventory";
import {
  firstAvailableRackUnit,
  rackItemXSpan,
  snapRackPlacement,
} from "../src/modules/itops/rackPlacement";

const bayRect = { left: 200, right: 500, top: 100, bottom: 1192, width: 300, height: 1092 };

function item(
  startU: number,
  heightU: number,
  kind: RackItem["kind"] = "server",
  metadata: RackItemMetadata = {},
): RackItem {
  return {
    id: `${kind}-${startU}`,
    rackId: "rack-1",
    kind,
    label: "",
    startU,
    heightU,
    metadata,
  };
}

test("rack placement floats when the pointer is outside the magnetic snap distance", () => {
  const snap = snapRackPlacement({
    x: 40,
    y: 500,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 2,
    items: [],
    allowTop: false,
  });
  assert.equal(snap, null);
});

test("rack placement snaps to a cabinet U before the pointer enters the cabinet", () => {
  const snap = snapRackPlacement({
    x: 170,
    y: 1166,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 2,
    items: [item(1, 1)],
    allowTop: false,
  });
  assert.deepEqual(snap, { startU: 1, blocked: true, zone: "inside", slot: 0 });
});

test("Kuai Kuai snaps to the rack top and only one package may occupy it", () => {
  const open = snapRackPlacement({
    x: 350,
    y: 70,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 4,
    items: [],
    allowTop: true,
  });
  assert.deepEqual(open, { startU: 43, blocked: false, zone: "top", slot: 0 });

  const blocked = snapRackPlacement({
    x: 350,
    y: 70,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    items: [item(43, 4, "kuaiguai")],
    allowTop: true,
  });
  assert.deepEqual(blocked, { startU: 43, blocked: true, zone: "top", slot: 0 });
});

test("half-width placement snaps to the horizontal slot under the pointer", () => {
  // Pointer on the left half of the bay → slot 0; right half → slot 1.
  const left = snapRackPlacement({
    x: 260,
    y: 1170,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    placeWidthFraction: "half",
    items: [],
    allowTop: false,
  });
  assert.deepEqual(left, { startU: 1, blocked: false, zone: "inside", slot: 0 });

  const right = snapRackPlacement({
    x: 460,
    y: 1170,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    placeWidthFraction: "half",
    items: [],
    allowTop: false,
  });
  assert.deepEqual(right, { startU: 1, blocked: false, zone: "inside", slot: 1 });
});

test("two fractional devices share a U row; occupied slots block", () => {
  const leftModem = item(1, 1, "genericDevice", { widthFraction: "half", slot: 0 });

  // The free right slot accepts a second half-width device…
  const freeRight = snapRackPlacement({
    x: 460,
    y: 1170,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    placeWidthFraction: "half",
    items: [leftModem],
    allowTop: false,
  });
  assert.deepEqual(freeRight, { startU: 1, blocked: false, zone: "inside", slot: 1 });

  // …while the taken left slot and a full-width span are both blocked.
  const takenLeft = snapRackPlacement({
    x: 260,
    y: 1170,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    placeWidthFraction: "half",
    items: [leftModem],
    allowTop: false,
  });
  assert.deepEqual(takenLeft, { startU: 1, blocked: true, zone: "inside", slot: 0 });

  const fullWidth = snapRackPlacement({
    x: 350,
    y: 1170,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    items: [leftModem],
    allowTop: false,
  });
  assert.deepEqual(fullWidth, { startU: 1, blocked: true, zone: "inside", slot: 0 });

  // A quarter-width device still fits in the row's third quarter.
  const quarter = snapRackPlacement({
    x: 380,
    y: 1170,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    placeWidthFraction: "quarter",
    items: [leftModem],
    allowTop: false,
  });
  assert.deepEqual(quarter, { startU: 1, blocked: false, zone: "inside", slot: 2 });
});

test("rackItemXSpan derives the quarter-unit strip from metadata", () => {
  assert.deepEqual(rackItemXSpan({}), { xStart: 0, xQuarters: 4 });
  assert.deepEqual(rackItemXSpan({ widthFraction: "half", slot: 1 }), { xStart: 2, xQuarters: 2 });
  assert.deepEqual(rackItemXSpan({ widthFraction: "quarter", slot: 3 }), { xStart: 3, xQuarters: 1 });
  // Out-of-range slots clamp to the rightmost slot for that width.
  assert.deepEqual(rackItemXSpan({ widthFraction: "half", slot: 9 }), { xStart: 2, xQuarters: 2 });
});

test("only small network and generic devices support fractional width", () => {
  assert.equal(rackItemKindSupportsFractionalWidth("switch"), true);
  assert.equal(rackItemKindSupportsFractionalWidth("router"), true);
  assert.equal(rackItemKindSupportsFractionalWidth("genericDevice"), true);
  assert.equal(rackItemKindSupportsFractionalWidth("server"), false);
  assert.equal(rackItemKindSupportsFractionalWidth("ups"), false);
});

test("full-width picker entries stay disabled when only a fractional gap remains", () => {
  const rack = {
    id: "rack-1",
    siteId: "site-1",
    name: "A1",
    serverRoom: "Room A",
    rackGroup: "",
    shell: null,
    background: null,
    heightU: 1,
    sortOrder: 0,
    items: [item(1, 1, "genericDevice", { widthFraction: "half", slot: 0 })],
  };
  assert.equal(firstAvailableRackUnit(rack, 4), null);
  assert.equal(firstAvailableRackUnit(rack, 1), 1);
});
