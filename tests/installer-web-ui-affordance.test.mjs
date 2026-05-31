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

test("installed Ollama dialog exposes its local server endpoint", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /case "ollama":\s*return \{ url: "http:\/\/localhost:11434" \}/,
    "Ollama should advertise its local server endpoint",
  );
});

test("managed web UI tools expose Windows service helper actions", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /serviceAffordanceForRecipe\(recipe\)/,
    "InstalledInfoBody should derive service affordances from the installed recipe",
  );
  assert.match(
    source,
    /installer_install_service/,
    "Install service should invoke the dedicated backend helper",
  );
  assert.match(
    source,
    /installer_remove_service/,
    "Remove service should invoke the dedicated backend helper",
  );
  assert.match(
    source,
    /installer\.actions\.registerService/,
    "Register service action label should be translated",
  );
  assert.match(
    source,
    /installer\.actions\.removeService/,
    "Remove service action label should be translated",
  );
});

test("installed dialog uses a switch for pin version", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /ToggleSwitch/,
    "Pin version should use the shared switch control",
  );
});

test("managed web UI install completion auto-starts the app", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /maybeStartManagedWebUiAfterInstall/,
    "Install completion should start managed web UI apps automatically",
  );
});
