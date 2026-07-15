import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("fractional 2.5D rack faceplates stay inside the rack rails", async () => {
  const source = await readFile("src/modules/itops/ServerRoomIsoView.tsx", "utf8");
  const css = await readFile("src/modules/itops/itops.css", "utf8");
  const rackSkin = source.match(/function IsoRackSkin[\s\S]*?function IsoCabinet/)?.[0] ?? "";

  assert.match(rackSkin, /className="rm-iso-skin-items"/);
  assert.match(css, /\.rm-iso-skin\.axis-y \.rm-iso-skin-items\s*\{[^}]*inset:\s*0 2px/s);
  assert.match(css, /\.rm-iso-skin\.axis-x \.rm-iso-skin-items\s*\{[^}]*inset:\s*2px 0/s);
});
