import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Install Helper Update all is disabled for the whole update-check sweep", async () => {
  const pageSource = await readFile(
    new URL("../src/modules/installer/InstallerPage.tsx", import.meta.url),
    "utf8",
  );
  const updateAllMarker = 'data-tutorial-id="installer.updateAll"';
  const updateAllIndex = pageSource.indexOf(updateAllMarker);
  assert.notEqual(updateAllIndex, -1, "Update all button should keep its tutorial target");

  const updateAllButton = pageSource.slice(
    Math.max(0, updateAllIndex - 240),
    pageSource.indexOf("</button>", updateAllIndex),
  );
  assert.match(
    updateAllButton,
    /disabled=\{checkInProgress \|\| !catalog \|\| updateAllRecipes\.length === 0\}/,
    "Update all should stay disabled while scanning or checking latest versions",
  );
});

test("Install Helper primary disabled buttons keep readable token colors", async () => {
  const css = await readFile(
    new URL("../src/modules/installer/installer.css", import.meta.url),
    "utf8",
  );
  const match = css.match(/\.installer-button\.primary:disabled\s*\{(?<body>[^}]*)\}/);
  assert.ok(match?.groups?.body, "primary disabled installer buttons need an explicit style");

  const body = match.groups.body;
  assert.match(body, /background:\s*var\(--surface-muted\);/);
  assert.match(body, /border-color:\s*var\(--border\);/);
  assert.match(body, /color:\s*var\(--text-muted\);/);
});
