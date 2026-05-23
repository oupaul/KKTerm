import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadGridModule() {
  const source = await readFile(new URL("../src/modules/dashboard/grid.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(js)}`;
  return import(url);
}

test("dashboard append placement uses a finite bottom row", async () => {
  const { nextDashboardAppendGridY } = await loadGridModule();
  assert.equal(
    nextDashboardAppendGridY(
      [
        { viewId: "one", gridY: 0, gridH: 3 },
        { viewId: "one", gridY: 5, gridH: 4 },
        { viewId: "two", gridY: 50, gridH: 3 },
      ],
      "one",
      3,
    ),
    9,
  );
});

test("dashboard grid coordinates clamp persisted sentinel values", async () => {
  const { clampDashboardGridY, MAX_DASHBOARD_GRID_ROWS } = await loadGridModule();
  assert.equal(clampDashboardGridY(Number.MAX_SAFE_INTEGER, 3), MAX_DASHBOARD_GRID_ROWS - 3);
  assert.equal(clampDashboardGridY(-5, 3), 0);
  assert.equal(clampDashboardGridY(Number.NaN, 3), 0);
});
