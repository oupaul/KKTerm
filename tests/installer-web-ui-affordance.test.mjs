import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("installed n8n dialog exposes Run and Open web UI actions", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /webUiAffordanceForRecipe\(recipe\)/,
    "InstalledInfoBody should derive web UI affordances from the installed recipe",
  );
  assert.match(
    source,
    /installer_run_web_ui/,
    "Run should invoke the dedicated Installer Helper web UI runner",
  );
  assert.match(
    source,
    /http:\/\/localhost:5678/,
    "n8n should advertise its default local web UI URL",
  );
  assert.match(
    source,
    /installer\.actions\.run/,
    "Run action label should be translated",
  );
  assert.match(
    source,
    /installer\.actions\.openWebUi/,
    "Open web UI action label should be translated",
  );
});
