import assert from "node:assert/strict";
import test from "node:test";
import { nextTopologyDuplicateName } from "../src/modules/itops/topologyDuplicate";

test("IT Ops duplicate names increment from the unsuffixed base", () => {
  const names = ["Rack-1", "Rack-1#2", "Rack-1#4", "Other#9"];
  assert.equal(nextTopologyDuplicateName("Rack-1", names), "Rack-1#5");
  assert.equal(nextTopologyDuplicateName("Rack-1#2", names), "Rack-1#5");
  assert.equal(nextTopologyDuplicateName("ServerRoom-A", ["ServerRoom-A"]), "ServerRoom-A#2");
});
