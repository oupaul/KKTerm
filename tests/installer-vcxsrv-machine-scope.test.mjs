import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("VcXsrv catalog entry is machine-scope only", async () => {
  const catalog = JSON.parse(
    await readFile(new URL("../installer/catalog.v1.json", import.meta.url), "utf8"),
  );
  const vcxsrv = catalog.recipes.find((recipe) => recipe.id === "vcxsrv");

  assert.ok(vcxsrv, "VcXsrv should be present in the installer catalog");
  assert.equal(vcxsrv.provider.kind, "winget");
  assert.equal(vcxsrv.provider.id, "marha.VcXsrv");
  assert.equal(vcxsrv.category, "utilities");
  assert.ok(!vcxsrv.options?.includes("scope"), "VcXsrv should not offer user scope");
});

test("Krita catalog entry is machine-scope only", async () => {
  const catalog = JSON.parse(
    await readFile(new URL("../installer/catalog.v1.json", import.meta.url), "utf8"),
  );
  const krita = catalog.recipes.find((recipe) => recipe.id === "krita");

  assert.ok(krita, "Krita should be present in the installer catalog");
  assert.equal(krita.provider.kind, "winget");
  assert.equal(krita.provider.id, "KDE.Krita");
  assert.equal(krita.category, "design");
  assert.ok(!krita.options?.includes("scope"), "Krita should not offer user scope");
});

test("VcXsrv machine-only winget install estimates UAC", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/dag.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /"marha\.vcxsrv"/);
});
