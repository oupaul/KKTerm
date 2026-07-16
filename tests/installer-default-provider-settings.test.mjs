import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const settingsSource = await readFile(
  new URL("../src/modules/settings/InstallerSettings.tsx", import.meta.url),
  "utf8",
);
const dialogSource = await readFile(
  new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
  "utf8",
);
const defaultsSource = await readFile(
  new URL("../src/app-defaults.ts", import.meta.url),
  "utf8",
);
const storageSource = await readFile(
  new URL("../src-tauri/src/storage.rs", import.meta.url),
  "utf8",
);

test("Install Helper settings persist a default package provider", () => {
  assert.match(
    defaultsSource,
    /installerDefaultProvider:\s*"winget"/,
    "Frontend settings should default new installs to WinGet.",
  );
  assert.match(
    storageSource,
    /installer_default_provider: default_installer_default_provider\(\)/,
    "Rust settings should serialize a default installer provider for older settings rows.",
  );
  assert.match(
    settingsSource,
    /installerDefaultProvider !== generalSettings\.installerDefaultProvider/,
    "InstallerSettings should mark provider changes as saveable.",
  );
  assert.match(
    settingsSource,
    /installerDefaultProvider: draft\.installerDefaultProvider/,
    "InstallerSettings should include the provider in the saved general settings request.",
  );
});

test("new install dialogs only preselect Chocolatey when both package providers are available", () => {
  assert.match(
    dialogSource,
    /defaultInstallOptionsForRecipe[\s\S]*preferredProvider === "chocolatey"[\s\S]*recipe\.options\?\.includes\("provider"\)[\s\S]*recipe\.provider\.kind === "winget"[\s\S]*recipe\.chocolateyProvider\?\.kind === "chocolatey"[\s\S]*return \{ provider: "chocolatey" \}/,
    "Chocolatey should only become the initial provider for WinGet recipes that expose a Chocolatey alternate provider.",
  );
  assert.match(
    dialogSource,
    /useWorkspaceStore\([\s\S]*state\.generalSettings\.installerDefaultProvider/,
    "InstallerToolDialog should read the persisted default provider from general settings.",
  );
});
