/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import type { RackItem, RackItemMetadata } from "../../types";
import {
  normalizeRackItemMetadata,
  selectRandomRackCallouts,
  summarizeRackDeviceMetadata,
} from "./rackInventory";

test("normalizeRackItemMetadata preserves legacy PR metadata while producing typed records", () => {
  const legacy: RackItemMetadata = {
    tags: [" core ", "", "edge"],
    connectionIds: ["conn-1", "conn-1", "conn-2"],
    networkPorts: ["1:gigabit", "2:10g"],
    snmp: "public@192.0.2.10:1.3.6.1.2.1.2",
    vendor: "Dell",
  };

  const normalized = normalizeRackItemMetadata(legacy);

  assert.deepEqual(normalized.tags, ["core", "edge"]);
  assert.deepEqual(normalized.connectionIds, ["conn-1", "conn-2"]);
  assert.deepEqual(normalized.networkPorts?.map((port) => [port.name, port.speed]), [
    ["1", "gigabit"],
    ["2", "10g"],
  ]);
  assert.equal(normalized.snmp?.target, "192.0.2.10");
  assert.equal(normalized.vendor, "dell");
});

test("summarizeRackDeviceMetadata returns compact visible inventory facts", () => {
  const summary = summarizeRackDeviceMetadata({
    tags: ["core", "edge"],
    networkPorts: [{ name: "xe-0/0/1", speed: "10g", state: "up" }],
  });

  assert.deepEqual(summary, ["xe-0/0/1 10G up", "core", "edge"]);
});

test("selectRandomRackCallouts deterministically chooses notes and bound connections", () => {
  const items = [
    { id: "a", label: "A", metadata: { notes: "Note A", connectionIds: ["conn-a"] } },
    { id: "b", label: "B", metadata: { tags: ["edge"] } },
    { id: "c", label: "C", metadata: { notes: "Note C", connectionIds: ["conn-c"] } },
  ] as RackItem[];

  const callouts = selectRandomRackCallouts(items, "rack-1", 2);

  assert.equal(callouts.length, 2);
  assert.ok(callouts.every((callout) => callout.text || callout.connectionIds.length > 0));
});
