import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(
  await readFile(new URL("../installer/catalog.v1.json", import.meta.url), "utf8"),
);

test("VcXsrv catalog entry is machine-scope only", async () => {
  const vcxsrv = catalog.recipes.find((recipe) => recipe.id === "vcxsrv");

  assert.ok(vcxsrv, "VcXsrv should be present in the installer catalog");
  assert.equal(vcxsrv.provider.kind, "winget");
  assert.equal(vcxsrv.provider.id, "marha.VcXsrv");
  assert.equal(vcxsrv.category, "utilities");
  assert.ok(!vcxsrv.options?.includes("scope"), "VcXsrv should not offer user scope");
});

test("Krita catalog entry is machine-scope only", async () => {
  const krita = catalog.recipes.find((recipe) => recipe.id === "krita");

  assert.ok(krita, "Krita should be present in the installer catalog");
  assert.equal(krita.provider.kind, "winget");
  assert.equal(krita.provider.id, "KDE.Krita");
  assert.equal(krita.category, "design");
  assert.ok(!krita.options?.includes("scope"), "Krita should not offer user scope");
});

test("Blender catalog entry is machine-scope only", async () => {
  const blender = catalog.recipes.find((recipe) => recipe.id === "blender");

  assert.ok(blender, "Blender should be present in the installer catalog");
  assert.equal(blender.provider.kind, "winget");
  assert.equal(blender.provider.id, "BlenderFoundation.Blender");
  assert.equal(blender.category, "design");
  assert.ok(!blender.options?.includes("scope"), "Blender should not offer user scope");
});

test("only currently dual-scope winget manifests expose the scope selector", () => {
  const scopedWingetRecipes = catalog.recipes
    .filter((recipe) => recipe.provider?.kind === "winget")
    .filter((recipe) => recipe.options?.includes("scope"))
    .map((recipe) => recipe.id)
    .sort();

  assert.deepEqual(scopedWingetRecipes, [
    "cursor",
    "git",
    "lmstudio",
    "powertoys",
    "sharex",
    "vscode",
  ]);
});

test("VcXsrv machine-only winget install estimates UAC", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/dag.ts", import.meta.url),
    "utf8",
  );

  for (const id of [
    "7zip.7zip",
    "blenderfoundation.blender",
    "bruno.bruno",
    "chocolatey.chocolatey",
    "ditto.ditto",
    "docker.dockerdesktop",
    "github.cli",
    "jgraph.draw",
    "kde.krita",
    "microsoft.coreutils",
    "microsoft.powershell",
    "notepad++.notepad++",
    "tailscale.tailscale",
    "voidtools.everything",
    "inkscape.inkscape",
    "marha.vcxsrv",
  ]) {
    assert.ok(source.includes(`"${id}"`), `${id} should estimate machine-scope UAC`);
  }
});
