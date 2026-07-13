import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("2.5D Kuai Kuai keeps its vertical faces in a preserve-3d model", async () => {
  const source = await readFile("src/modules/itops/RoomObjectIsoReference.tsx", "utf8");
  const model = source.match(/kuaikuai: `([\s\S]*?)`,\s*\n};/)?.[1] ?? "";

  assert.match(model, /transform-style:preserve-3d/);
  assert.match(model, /transform:rotateX\(-90deg\)/);
  assert.match(model, /transform:rotateY\(90deg\)/);
  assert.match(model, /transform:translateZ\(72px\)/);

  const geometryParent = model.match(/<div style="position:absolute;left:-27px;top:-9px;[^"]*">/)?.[0] ?? "";
  assert.doesNotMatch(geometryParent, /filter:|opacity:|animation:/);
});
