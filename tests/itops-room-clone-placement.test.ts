import assert from "node:assert/strict";
import test from "node:test";
import {
  roomCellIsBlank,
  roomObjectPlacementIsBlank,
  type RoomObject,
} from "../src/modules/itops/roomObjects";

const objects: RoomObject[] = [
  { id: "wall", kind: "wall", x: 2, y: 2, z: 0, rot: 0, corner: 0 },
  { id: "ups", kind: "ups", x: 4, y: 4, z: 0, rot: 0, corner: 0 },
];
const rackCells = { rack: { x: 1, y: 1 } };

test("temporary room clones only accept fully blank floor cells", () => {
  assert.equal(roomCellIsBlank({ x: 0, y: 0 }, rackCells, objects), true);
  assert.equal(roomCellIsBlank({ x: 1, y: 1 }, rackCells, objects), false);
  assert.equal(roomCellIsBlank({ x: 2, y: 2 }, rackCells, objects), false);
  assert.equal(roomObjectPlacementIsBlank({ x: 3, y: 3 }, "aircon", 0, rackCells, objects), true);
  assert.equal(roomObjectPlacementIsBlank({ x: 4, y: 4 }, "aircon", 0, rackCells, objects), false);
});
