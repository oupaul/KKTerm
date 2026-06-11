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

test("installer properties surface user and system install modes", async () => {
  const dialogSource = await readFile(
    new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
    "utf8",
  );
  const detectSource = await readFile(
    new URL("../src-tauri/src/installer/detect.rs", import.meta.url),
    "utf8",
  );
  const enSource = await readFile(
    new URL("../src/i18n/locales/en.json", import.meta.url),
    "utf8",
  );

  assert.match(
    detectSource,
    /install_scope: Option<InstallScope>/,
    "Detection should expose the resolved winget install scope to the frontend",
  );
  assert.match(
    dialogSource,
    /installModeForInstalledRecipe\(detected\)/,
    "Installed properties should derive their install mode from detected scope",
  );
  assert.match(
    dialogSource,
    /installModeForOptions\(recipe, options\)/,
    "Not-installed properties should show the currently selected install mode",
  );
  assert.match(enSource, /"scopeUser": "User Mode"/);
  assert.match(enSource, /"scopeMachine": "System Mode\(UAC\)"/);
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

test("managed web UI status polling is throttled", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /statusRefreshInFlight/,
    "Status polling should avoid overlapping backend status requests",
  );
  assert.match(
    source,
    /10_000/,
    "Status polling should be slow enough not to make the properties dialog sluggish",
  );
});

test("installer command boundary keeps blocking work off the UI thread", async () => {
  const source = await readFile(
    new URL("../src-tauri/src/installer/commands.rs", import.meta.url),
    "utf8",
  );

  for (const command of [
    "installer_load_catalog",
    "installer_detect_all",
    "installer_load_detection_cache",
    "installer_redetect",
    "installer_get_state",
    "installer_set_pinned",
    "installer_run_web_ui",
    "installer_get_web_ui_status",
    "installer_stop_web_ui",
    "installer_install_service",
    "installer_remove_service",
    "installer_open_terminal_launcher",
  ]) {
    assert.match(
      source,
      new RegExp(`pub async fn ${command}\\(`),
      `${command} should be async so blocking work can leave the command path`,
    );
  }

  assert.match(
    source,
    /latest\.check\.worker\.start/,
    "latest-version sweeps should be dispatched to a background worker",
  );
  assert.match(
    source,
    /detect\.streaming\.worker\.start/,
    "streaming detection should be dispatched to a background worker",
  );
  assert.match(
    source,
    /install\.worker\.start/,
    "install commands should be dispatched to a background worker",
  );
  assert.match(
    source,
    /uninstall\.worker\.start/,
    "uninstall commands should be dispatched to a background worker",
  );
  assert.match(
    source,
    /tauri::async_runtime::spawn_blocking/,
    "blocking Installer Helper operations should use Tauri's blocking pool",
  );
});
