import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(
  await readFile(new URL("../installer/catalog.v1.json", import.meta.url), "utf8"),
);

test("winget is a Package Managers tool with a web installer", () => {
  const winget = catalog.recipes.find((recipe) => recipe.id === "winget");

  assert.ok(winget, "catalog should include winget");
  assert.equal(winget.category, "package-managers");
  assert.equal(winget.provider.kind, "downloadInstaller");
  assert.match(winget.provider.url, /github\.com\/microsoft\/winget-cli/);
});

test("every winget-provider recipe depends on the winget prerequisite", () => {
  const missing = catalog.recipes
    .filter((recipe) => recipe.provider.kind === "winget")
    .filter((recipe) => !(recipe.needs ?? []).includes("winget"))
    .map((recipe) => recipe.id);

  assert.deepEqual(missing, []);
});

test("winget installer bootstraps documented AppX dependencies", async () => {
  const installSource = await readFile(
    new URL("../src-tauri/src/installer/install.rs", import.meta.url),
    "utf8",
  );

  assert.match(installSource, /Microsoft\.VCLibs\.x64\.14\.00\.Desktop\.appx/);
  assert.match(installSource, /Microsoft\.VCLibs\.arm64\.14\.00\.Desktop\.appx/);
  assert.match(installSource, /Microsoft\.UI\.Xaml\/2\.8\.6/);
  assert.match(installSource, /Add-AppxPackage -Path \$vclibsPath/);
  assert.match(installSource, /Add-AppxPackage -Path \$xamlPath/);
  assert.match(installSource, /Add-AppxPackage -Path __PACKAGE_PATH__/);
});

test("Antigravity CLI uses a bundled Antigravity icon", async () => {
  const iconsSource = await readFile(
    new URL("../src/modules/installer/icons.ts", import.meta.url),
    "utf8",
  );

  assert.match(iconsSource, /antigravity\.svg\?url/);
  assert.match(iconsSource, /"antigravity-cli": antigravity/);
});
