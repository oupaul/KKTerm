import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = encodeURIComponent(transpiled.outputText);
  return import(`data:text/javascript;charset=utf-8,${encoded}`);
}

test("dashboard visual context stays compact for light preset backgrounds", async () => {
  const { dashboardVisualContextForView } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/visualContext.ts", import.meta.url),
  );

  assert.deepEqual(
    dashboardVisualContextForView({ background: { kind: "preset", preset: "mist" } }),
    {
      colorScheme: "light",
      backgroundKind: "preset",
      backgroundTone: "light",
      backgroundId: "mist",
      requiresOpaqueTextSurface: false,
    },
  );
});

test("dashboard visual context marks image backgrounds as mixed and requiring readable surfaces", async () => {
  const { dashboardVisualContextForView } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/visualContext.ts", import.meta.url),
  );

  assert.deepEqual(
    dashboardVisualContextForView({
      background: { kind: "image", file: "wallpaper.png", fit: "fill", dim: 0 },
    }),
    {
      colorScheme: "light",
      backgroundKind: "image",
      backgroundTone: "mixed",
      backgroundId: "wallpaper.png",
      requiresOpaqueTextSurface: true,
    },
  );
});

test("dashboard visual context marks dark preset backgrounds as dark", async () => {
  const { dashboardVisualContextForView } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/visualContext.ts", import.meta.url),
  );

  assert.deepEqual(
    dashboardVisualContextForView({ background: { kind: "preset", preset: "graphite" } }),
    {
      colorScheme: "dark",
      backgroundKind: "preset",
      backgroundTone: "dark",
      backgroundId: "graphite",
      requiresOpaqueTextSurface: false,
    },
  );

  assert.deepEqual(
    dashboardVisualContextForView({ background: { kind: "preset", preset: "g-nocturne" } }),
    {
      colorScheme: "dark",
      backgroundKind: "preset",
      backgroundTone: "dark",
      backgroundId: "g-nocturne",
      requiresOpaqueTextSurface: false,
    },
  );
});
