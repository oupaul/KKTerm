import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/workspace/workspaceIcons.tsx", import.meta.url),
  "utf8",
);

test("Workspace icon backgrounds keep the default icon footprint", () => {
  assert.match(
    source,
    /"--workspace-icon-shell-size": `\$\{size\}px`/,
    "colored Workspace icons should not add a larger background shell around the selected icon",
  );
  assert.doesNotMatch(
    source,
    /size\s*\+\s*6/,
    "colored Workspace icon backgrounds should not create a padded halo around the icon",
  );
});
