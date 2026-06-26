import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dialogSource = await readFile(
  new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
  "utf8",
);
const dagSource = await readFile(
  new URL("../src/modules/installer/dag.ts", import.meta.url),
  "utf8",
);

test("Chocolatey provider selection opens Chocolatey install dialog when missing", () => {
  assert.match(
    dialogSource,
    /selectedProvider\.kind === "chocolatey"[\s\S]*!detected\["chocolatey"\]\?\.installed[\s\S]*openInfoDialog\("chocolatey"\)/,
    "Chocolatey-backed installs should route to the Chocolatey recipe when choco is missing.",
  );
});

test("provider selector offers Chocolatey when a recipe declares a Chocolatey provider", () => {
  assert.match(
    dialogSource,
    /canChooseChocolatey[\s\S]*recipe\.chocolateyProvider\?\.kind === "chocolatey"/,
    "InstallerToolDialog should detect recipes with Chocolatey alternate providers.",
  );
  assert.match(
    dialogSource,
    /<option value="chocolatey">[\s\S]*providerSummary\(recipe\.chocolateyProvider!\)/,
    "InstallerToolDialog should render a Chocolatey option in the provider selector.",
  );
});

test("Chocolatey-backed plans depend on Chocolatey instead of the recipe's winget provider", () => {
  assert.match(
    dagSource,
    /selectedProviderForOptions\(recipe, options\)\.kind === "chocolatey"[\s\S]*"chocolatey"/,
    "Chocolatey provider plans should add Chocolatey as the manager prerequisite.",
  );
  assert.match(
    dagSource,
    /id !== targetRecipeId && detected\[id\]\?\.installed[\s\S]*order\.push\(recipe\)/,
    "Already-installed prerequisites should satisfy their own dependency chain.",
  );
});
