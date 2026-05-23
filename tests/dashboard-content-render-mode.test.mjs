import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("content widgets render markdown or sanitized HTML by explicit mode", async () => {
  const rendererSource = await readFile(
    new URL("../src/modules/dashboard/content/ContentWidgetRenderer.tsx", import.meta.url),
    "utf8",
  );
  const schemaSource = await readFile(
    new URL("../src/modules/dashboard/schema.ts", import.meta.url),
    "utf8",
  );
  const typesSource = await readFile(
    new URL("../src/modules/dashboard/types.ts", import.meta.url),
    "utf8",
  );
  const aiSource = await readFile(new URL("../src-tauri/src/ai.rs", import.meta.url), "utf8");

  assert.match(typesSource, /mode\?: "markdown" \| "html"/);
  assert.match(schemaSource, /mode === "html" \? "html" : "markdown"/);
  assert.match(rendererSource, /DOMPurify\.sanitize/);
  assert.match(rendererSource, /marked\.parse/);
  assert.match(rendererSource, /dangerouslySetInnerHTML/);
  assert.match(aiSource, /"mode":\{"type":"string","enum":\["markdown","html"\]\}/);
  assert.match(
    aiSource,
    /Content markdown widgets MUST set data\.mode to either markdown or html/,
  );
});
