import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Panorama warning cancel starts nothing and confirm opens the pending IDs once", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  const confirmation = source.match(
    /\{pendingPanorama \? \([\s\S]*?<ConfirmSheet[\s\S]*?\/>[\s\S]*?\) : null\}/,
  )?.[0];
  assert.ok(confirmation, "expected the pending Panorama ConfirmSheet");
  assert.match(confirmation, /onCancel=\{\(\) => setPendingPanorama\(null\)\}/);
  assert.match(
    confirmation,
    /onConfirm=\{\(\) => \{[\s\S]*?setPendingPanorama\(null\);[\s\S]*?openResolvedConnectionPanorama\(pending\.connectionIds, pending\.title\);[\s\S]*?\}\}/,
  );
  assert.equal(
    confirmation.match(/openResolvedConnectionPanorama\(/g)?.length,
    1,
    "confirm should invoke the Panorama opener exactly once",
  );
});
