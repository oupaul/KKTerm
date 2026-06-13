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

test("native context menu uses explicit Tauri icon menu items for icon entries", async () => {
  const source = await readFile(
    new URL("../src/lib/nativeContextMenu.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /IconMenuItem\.new/);
});

test("native context menu rasterizer passes PNG bytes to Tauri Image.fromBytes", async () => {
  const source = await readFile(
    new URL("../src/lib/nativeContextMenu.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /canvasToPngBytes/);
  assert.match(source, /imageFactory\.fromBytes\(pngBytes\)/);
});

test("native context menu uses macOS template icons for matching command glyphs", async () => {
  const source = await readFile(
    new URL("../src/lib/nativeContextMenu.ts", import.meta.url),
    "utf8",
  );
  const { nativeMenuIcons } = await importTypeScriptModule(
    new URL("../src/lib/nativeMenuIcons.ts", import.meta.url),
  );

  assert.match(source, /macosTemplateIconForSvg/);
  assert.match(source, /\[nativeMenuIcons\.plus,\s*"Add"\]/);
  assert.match(source, /\[nativeMenuIcons\.squarePlus,\s*"Add"\]/);
  for (const iconName of Object.keys(nativeMenuIcons)) {
    assert.match(
      source,
      new RegExp(`\\[nativeMenuIcons\\.${iconName},\\s*"`),
      `${iconName} should use a macOS native template icon`,
    );
  }
});
