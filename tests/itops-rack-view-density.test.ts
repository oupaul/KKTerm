import assert from "node:assert/strict";
import test from "node:test";
import { fittedRackUnitPx } from "../src/modules/itops/RackStage";

test("Rack View fits rack units to the visible height within legible bounds", () => {
  assert.equal(fittedRackUnitPx(1600, 42, 4), 26);
  assert.equal(fittedRackUnitPx(968, 42, 4), 20);
  assert.equal(fittedRackUnitPx(420, 42, 4), 12);
});

