import assert from "node:assert/strict";
import test from "node:test";
import type { Rack } from "../src/types";
import { groupRackTopology, groupRacksByGroup } from "../src/modules/itops/rackTopology";

function rack(id: string, serverRoom: string, rackGroup: string): Rack {
  return {
    id,
    siteId: "site-1",
    name: id,
    serverRoom,
    rackGroup,
    shell: null,
    background: null,
    heightU: 42,
    sortOrder: 0,
    items: [],
  };
}

test("IT Ops rack topology groups server rooms and rack groups case-insensitively", () => {
  const racks = [
    rack("rack-1", "NETWORK-A", "Core"),
    rack("rack-2", "network-a", "core"),
    rack("rack-3", "Network-B", "Edge"),
  ];

  const rooms = groupRackTopology(racks);
  assert.equal(rooms.length, 2);
  assert.equal(rooms[0].key, "NETWORK-A");
  assert.deepEqual(
    rooms[0].racks.map((entry) => entry.id),
    ["rack-1", "rack-2"],
  );

  const groups = groupRacksByGroup(rooms[0].racks);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, "Core");
  assert.deepEqual(
    groups[0].racks.map((entry) => entry.id),
    ["rack-1", "rack-2"],
  );
});
