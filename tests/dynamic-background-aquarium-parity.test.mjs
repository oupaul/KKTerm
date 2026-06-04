import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/dashboard/registry/dynamicBackgrounds.tsx", import.meta.url),
  "utf8",
);

test("Aquarium dynamic background keeps the prototype's special creatures", () => {
  assert.match(source, /kind:\s*"stingray"/);
  assert.match(source, /kind:\s*"octopus"/);
  assert.match(source, /kind:\s*"squid"/);
  assert.match(source, /drawStingray/);
  assert.match(source, /drawOctopus/);
  assert.match(source, /drawSquid/);
});
