import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import viteConfig from "../vite.config.ts";

test("Vite dev server ignores repository-local scratch trees", async () => {
  const config = typeof viteConfig === "function" ? await viteConfig() : viteConfig;
  const ignored = config.server?.watch?.ignored;

  assert.ok(Array.isArray(ignored));
  assert.ok(ignored.includes("**/.tmp/**"));
});

test("Tailwind scans only the frontend source tree", async () => {
  const css = await readFile(new URL("../src/App.css", import.meta.url), "utf8");

  assert.match(css, /^@import\s+["']tailwindcss["']\s+source\(["']\.["']\);/m);
});
