import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("AI-authored widgets use a two-second blue pixel reveal", async () => {
  const css = await readFile(new URL("../src/dashboard/dashboard.css", import.meta.url), "utf8");

  assert.match(css, /\.dw-custom-widget\.dw-reveal-pixelating::after/);
  assert.match(css, /animation:\s*dw-widget-pixel-clear\s+2s/);
  assert.match(css, /#2563eb/);
  assert.match(css, /image-rendering:\s*pixelated/);
});
