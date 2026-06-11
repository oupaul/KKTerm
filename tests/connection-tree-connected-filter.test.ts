// Behavioral tests for the "Show Connected" filter used by the Connection Tree.
// `filterConnectedConnections` keeps only connections whose live status is
// "connected", prunes folders that become empty, and preserves folders that
// still hold a connected descendant — the contract the sidebar relies on so the
// filter composes with search and the "Hide Folders" flat view.
import assert from "node:assert/strict";
import test from "node:test";

import {
  filterConnectedConnections,
  flattenConnections,
} from "../src/modules/workspace/connections/treeUtils.ts";
import type { Connection, ConnectionFolder, ConnectionTree } from "../src/types.ts";

function connection(id: string, status: "idle" | "connected"): Connection {
  return {
    id,
    name: id,
    host: `${id}.example.com`,
    user: "ryan",
    type: "ssh",
    status,
    terminalBackground: { kind: "preset", preset: "graphite" },
  };
}

function folder(id: string, connections: Connection[], folders: ConnectionFolder[] = []): ConnectionFolder {
  return { id, name: id, connections, folders };
}

const tree: ConnectionTree = {
  connections: [connection("root-connected", "connected"), connection("root-idle", "idle")],
  folders: [
    folder("empty-after-filter", [connection("nested-idle", "idle")]),
    folder("keeps-connected", [connection("nested-connected", "connected"), connection("nested-idle-2", "idle")]),
    folder("parent", [], [folder("deep", [connection("deep-connected", "connected")])]),
    folder("all-idle-deep", [], [folder("deep-idle", [connection("deep-idle-conn", "idle")])]),
  ],
};

const filtered = filterConnectedConnections(tree);

// Root level: idle connection dropped, connected one kept.
assert.deepEqual(
  filtered.connections.map((entry) => entry.id),
  ["root-connected"],
  "Root-level idle connections should be filtered out.",
);

// Folder with no connected entries is pruned entirely.
assert.ok(
  !filtered.folders.some((entry) => entry.id === "empty-after-filter"),
  "A folder with only idle connections should be pruned.",
);
assert.ok(
  !filtered.folders.some((entry) => entry.id === "all-idle-deep"),
  "A folder whose only descendants are idle should be pruned, even when nested.",
);

// Folder keeping a connected entry survives but loses its idle siblings.
const kept = filtered.folders.find((entry) => entry.id === "keeps-connected");
assert.ok(kept, "A folder with a connected connection should survive.");
assert.deepEqual(
  kept?.connections.map((entry) => entry.id),
  ["nested-connected"],
  "Idle siblings inside a surviving folder should be removed.",
);

// A folder that is only a path to a deeper connected connection survives.
const parent = filtered.folders.find((entry) => entry.id === "parent");
assert.ok(parent, "A folder leading to a deeply nested connected connection should survive.");
assert.deepEqual(
  parent?.folders[0]?.connections.map((entry) => entry.id),
  ["deep-connected"],
  "The deep connected connection should be preserved through the surviving path.",
);

// The flattened result (what "Hide Folders" renders) contains exactly the
// connected connections, with no duplicates.
const flatIds = flattenConnections(filtered).map((entry) => entry.id).sort();
assert.deepEqual(
  flatIds,
  ["deep-connected", "nested-connected", "root-connected"],
  "Flattening the connected-filtered tree should yield only connected connections.",
);

test("filterConnectedConnections keeps only connected connections and prunes empty folders", () => {
  // Assertions run at module load above; this anchors them to a named test so
  // the node:test runner reports a passing case.
  assert.ok(true);
});
