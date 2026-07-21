import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("portable creator is an installed-Windows Settings action", async () => {
  const general = await source("src/modules/settings/GeneralSettings.tsx");
  const dialog = await source("src/modules/settings/PortableCreatorDialog.tsx");

  assert.match(general, /windowsPlatform\s*&&\s*!portableMode/);
  assert.match(general, /settings\.portableCreatorAction/);
  const portableSection = general.indexOf('settings.portableInstallSection');
  const debugSection = general.indexOf('data-tutorial-id="settings.debug"');
  assert.ok(portableSection > -1 && portableSection < debugSection);
  assert.match(dialog, /invokeCommand\("create_portable_copy"/);
  assert.match(dialog, /settings\.portableCreatorCredentialsExcluded/);
  assert.doesNotMatch(
    dialog,
    /includeCredentials|passphrase/,
    "portable creation must not offer to copy saved secrets",
  );
});

test("portable creator stages a complete marker-launched application", async () => {
  const creator = await source("src-tauri/src/portable_creator.rs");
  const lib = await source("src-tauri/src/lib.rs");

  for (const resource of [
    "KKTerm.exe",
    "kkterm-cli.exe",
    "manual",
    "assistant-skills",
    "data",
  ]) {
    assert.match(creator, new RegExp(resource.replaceAll(".", "\\.")));
  }
  assert.match(creator, /PORTABLE_MARKER_FILENAME/);
  assert.match(creator, /prepare_portable_data_dir/);
  assert.match(creator, /create_portable_database/);
  assert.match(creator, /destination folder must be empty/);
  assert.match(lib, /portable_creator::create_portable_copy/);
  assert.match(lib, /portable_creator::launch_portable_copy/);
});
