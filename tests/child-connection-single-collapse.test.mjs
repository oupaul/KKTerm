import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("A single Child Connection collapses into the parent row instead of showing a child row", async () => {
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    sidebarSource,
    /\{childConnections\.length > 1 &&\s*childConnections\.map\(\(child\) => \{/,
    "child rows must only render once a parent has two or more children",
  );
});
