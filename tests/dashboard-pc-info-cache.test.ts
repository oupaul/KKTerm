import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePcInfoSnapshot,
  parsePcInfoSnapshotCache,
} from "../src/modules/dashboard/widgets/builtin/pc-info/normalize";

test("PC Info normalizes snapshots cached before the detail schema expansion", () => {
  const legacySnapshot = {
    generatedAtUnixSeconds: 1_750_000_000,
    source: "windows-powershell",
    warnings: [],
    os: {},
    cpu: {},
    memory: { modules: [] },
    motherboard: {},
    graphics: [],
    displays: [],
    storage: [],
    volumes: [],
    network: [
      {
        name: "Ethernet",
        ipAddresses: ["192.0.2.10"],
        gateways: ["192.0.2.1"],
        dnsServers: ["192.0.2.53"],
      },
    ],
    audio: [],
  };

  const normalized = parsePcInfoSnapshotCache(JSON.stringify(legacySnapshot));

  assert.ok(normalized);
  assert.deepEqual(normalized.battery, []);
  assert.deepEqual(normalized.network[0]?.subnetMasks, []);
  assert.deepEqual(normalized.network[0]?.ipAddresses, ["192.0.2.10"]);
});

test("PC Info rejects invalid persisted snapshots", () => {
  assert.equal(normalizePcInfoSnapshot(null), null);
  assert.equal(normalizePcInfoSnapshot([]), null);
  assert.equal(normalizePcInfoSnapshot({}), null);
  assert.equal(parsePcInfoSnapshotCache("{"), null);
});
