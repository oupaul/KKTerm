import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  RACK_SEQUENCE_TOKEN,
  hasRackSequenceToken,
  nextRackSequenceName,
} from "../src/modules/itops/rackSequence";

test("Rack sequences continue after the highest matching room name", () => {
  assert.equal(RACK_SEQUENCE_TOKEN, "%02d");
  assert.equal(hasRackSequenceToken("TP-N%02d"), true);
  assert.equal(
    nextRackSequenceName("TP-N%02d", ["TP-N01", "TP-N11", "TP-S99", "TP-Nx"]),
    "TP-N12",
  );
  assert.equal(nextRackSequenceName("ROW-%02d-A", []), "ROW-01-A");
  assert.equal(nextRackSequenceName("ROW-%02d-A", ["ROW-99-A"]), "ROW-100-A");
  assert.equal(nextRackSequenceName("Rack A", ["Rack A"]), "Rack A");
});

test("Server Room spatial placement keeps Walls and sequenced Racks armed", async () => {
  const [dialog, drill, parts, floor, iso] = await Promise.all([
    readFile("src/modules/itops/RackDialog.tsx", "utf8"),
    readFile("src/modules/itops/SitesTab.tsx", "utf8"),
    readFile("src/modules/itops/roomViewParts.tsx", "utf8"),
    readFile("src/modules/itops/ServerRoomFloorPlan.tsx", "utf8"),
    readFile("src/modules/itops/ServerRoomIsoView.tsx", "utf8"),
  ]);

  assert.match(dialog, /itops\.racks\.sequenceAction/);
  assert.match(dialog, /nextRackSequenceName\(sequenceTemplate, roomRackNames\)/);
  assert.match(drill, /if \(roomTool !== "wall"\) setRoomTool\(null\)/);
  assert.match(drill, /createRackForSequence\(site\.id, \{ \.\.\.sequence\.input, name: nextName \}\)/);
  assert.match(drill, /rackSequenceRef\.current = sequence/);

  assert.match(parts, /document\.addEventListener\("pointerdown", cancelFromOtherUi, true\)/);
  assert.match(parts, /target\.closest\("\.rm-bp-ctl, \.rm-iso-ctl"\)/);
  assert.match(floor, /useRoomPlacementPointer\(placing, onCancelPlacement, scrollRef\)/);
  assert.match(iso, /useRoomPlacementPointer\(placing, onCancelPlacement, scrollRef\)/);
});
