import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePanoramaConnections,
  shouldConfirmPanorama,
  unopenedPanoramaConnections,
} from "../src/modules/workspace/connections/panorama";
import type { Connection, ConnectionTree } from "../src/types";

function connection(id: string, status = "idle"): Connection {
  return {
    id,
    name: id,
    host: `${id}.example.test`,
    user: "admin",
    type: "rdp",
    status,
  } as Connection;
}

test("Panorama opens 10 new Sessions immediately and confirms 11", () => {
  assert.equal(shouldConfirmPanorama(10), false);
  assert.equal(shouldConfirmPanorama(11), true);
});

test("Panorama threshold excludes Connections that already have Sessions", () => {
  const connections = Array.from({ length: 18 }, (_, index) => connection(`rdp-${index}`));
  const open = new Set(connections.slice(0, 8).map((entry) => entry.id));
  assert.equal(unopenedPanoramaConnections(connections, (id) => open.has(id)).length, 10);
  assert.equal(shouldConfirmPanorama(10), false);
});

test("Panorama resolves pending IDs back to raw Connection objects", () => {
  const raw = connection("rdp-1", "idle");
  const projected = { ...raw, status: "connected" } as Connection;
  const tree: ConnectionTree = { connections: [raw], folders: [] };

  assert.notEqual(projected, raw);
  assert.equal(resolvePanoramaConnections(tree, [projected.id])[0], raw);
});
