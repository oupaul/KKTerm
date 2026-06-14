import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Vite emits relative asset URLs for packaged Tauri webviews", async () => {
  const source = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

  assert.match(source, /base:\s*["']\.\/["']/);
});
