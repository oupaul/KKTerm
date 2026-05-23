import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Dashboard View tab gradients are selected from the left dot in edit mode", async () => {
  const page = await readFile(new URL("../src/modules/dashboard/DashboardPage.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/modules/dashboard/dashboard.css", import.meta.url), "utf8");

  assert.match(page, /className="dashboard-pill-dot"/);
  assert.match(page, /dashboard\.viewTabGradient/);
  assert.doesNotMatch(page, /className="dashboard-pill-gradient"/);
  assert.doesNotMatch(css, /\.dashboard-pill-gradient/);
  assert.doesNotMatch(css, /\.dashboard-pill\.active::before/);
});
