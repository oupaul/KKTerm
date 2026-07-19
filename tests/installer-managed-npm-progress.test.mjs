import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

test("managed npm installs drive the three-stage progress design", async () => {
  const source = await read("../src-tauri/src/installer/install.rs");
  const start = source.indexOf("fn install_managed_npm_app(");
  const end = source.indexOf("fn install_managed_excalidraw(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const managedNpm = source.slice(start, end);

  assert.match(managedNpm, /ProgressEvent::Plan/);
  for (const key of [
    "installer.steps.resolveDependencyPlan",
    "installer.steps.ensureNodeLts",
    "installer.steps.installNamed",
  ]) {
    assert.match(managedNpm, new RegExp(key.replaceAll(".", "\\.")));
  }
  assert.equal(
    managedNpm.match(/run_install_step\(/g)?.length,
    3,
    "each reference stage should execute through the structured lifecycle helper",
  );
  assert.match(source, /fn run_install_step<[\s\S]*?ProgressEvent::StepStarted/);
  assert.match(source, /fn run_install_step<[\s\S]*?ProgressEvent::StepFinished/);
  assert.match(
    managedNpm,
    /ensure_node_lts_for_managed_npm/,
    "the Node stage should activate a current LTS instead of accepting any installed Node build",
  );
  assert.match(
    source,
    /fn ensure_node_lts_for_managed_npm[\s\S]*?"install"[\s\S]*?"lts"[\s\S]*?"use"[\s\S]*?"lts"/,
    "managed npm installs should install and activate the current Node LTS",
  );
});

test("installer log panels have a defined readable terminal foreground", async () => {
  const [schemes, installerCss] = await Promise.all([
    read("../src/styles/colorSchemes.css"),
    read("../src/modules/installer/installer.css"),
  ]);

  assert.match(schemes, /:root\s*\{[\s\S]*?--terminal-fg:\s*#[0-9a-f]{6};/i);
  assert.match(
    installerCss,
    /\.installer-stepper__log\s*\{[\s\S]*?color:\s*var\(--terminal-fg\)/,
  );
});

test("running stages keep a progress track visible without a determinate ratio", async () => {
  const dialog = await read("../src/modules/installer/InstallerToolDialog.tsx");
  assert.match(
    dialog,
    /status === "running"[\s\S]*?<progress[\s\S]*?value=\{ratio \?\? undefined\}/,
  );
});
