import assert from "node:assert/strict";
import test from "node:test";
import type { RackItem } from "../src/types";
import { snapRackPlacement } from "../src/modules/itops/rackPlacement";

const bayRect = { left: 200, right: 500, top: 100, bottom: 1192, width: 300, height: 1092 };

function item(startU: number, heightU: number, kind: RackItem["kind"] = "server"): RackItem {
  return {
    id: `${kind}-${startU}`,
    rackId: "rack-1",
    kind,
    label: "",
    startU,
    heightU,
    metadata: {},
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
  assert.deepEqual(snap, { startU: 1, blocked: true, zone: "inside" });
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
  assert.deepEqual(open, { startU: 43, blocked: false, zone: "top" });

  const blocked = snapRackPlacement({
    x: 350,
    y: 70,
    bayRect,
    rackHeightU: 42,
    placeHeightU: 1,
    items: [item(43, 4, "kuaiguai")],
    allowTop: true,
  });
  assert.deepEqual(blocked, { startU: 43, blocked: true, zone: "top" });
});
