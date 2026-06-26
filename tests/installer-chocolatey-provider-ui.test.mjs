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

test("not-installed Chocolatey dialog states the admin + machine-wide requirement", () => {
  assert.match(
    dialogSource,
    /selectedProvider\.kind === "chocolatey"[\s\S]*installer\.dialog\.adminRequiredChocolatey/,
    "The not-installed dialog should show the admin/UAC hint when the selected provider is Chocolatey.",
  );
});

test("Chocolatey update is gated by an admin confirmation before elevating", () => {
  assert.match(
    dialogSource,
    /function startUpdate\(\)[\s\S]*usesChocolatey[\s\S]*setUpdateConfirm\(true\)/,
    "startUpdate should require confirmation for Chocolatey tools instead of elevating silently.",
  );
  assert.match(
    dialogSource,
    /updateConfirm \?[\s\S]*installer\.confirm\.adminChocolateyFooter/,
    "The update confirmation should carry the Chocolatey admin footer.",
  );
});

test("Chocolatey uninstall confirmation carries the admin footer", () => {
  assert.match(
    dialogSource,
    /footer=\{\s*usesChocolatey\s*\?\s*t\("installer\.confirm\.adminChocolateyFooter"\)/,
    "The uninstall confirmation footer should show the Chocolatey admin notice when the op runs through choco.",
  );
});

test("Chocolatey provider predicate mirrors the Rust selection fallback", () => {
  assert.match(
    dialogSource,
    /function recipeUsesChocolateyProvider\([\s\S]*chocolateyProvider\?\.kind === "chocolatey"[\s\S]*detected\["chocolatey"\]\?\.installed/,
    "recipeUsesChocolateyProvider should fall back to choco once Chocolatey itself is installed.",
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
