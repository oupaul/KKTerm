import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../src/modules/installer/installer.css", import.meta.url),
  "utf8",
);

test("Install Helper list keeps metadata columns near the tool name on wide screens", () => {
  const listRule = css.match(/\.installer-list\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(listRule, /width:\s*100%\s*;/);
  assert.match(listRule, /max-width:\s*1240px\s*;/);
});
