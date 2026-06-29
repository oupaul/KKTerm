import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const diffSideBySideSource = await readFile("src/modules/compare/DiffSideBySide.tsx", "utf8");

test("File Compare side-by-side diff word wrap defaults on", () => {
  assert.match(
    diffSideBySideSource,
    /const \[wrap, setWrap\] = useState\(true\)/,
    "word wrap should be enabled by default while remaining user-toggleable",
  );
});
