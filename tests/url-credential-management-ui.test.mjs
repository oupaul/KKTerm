import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const urlSettings = readFileSync("src/modules/settings/UrlSettings.tsx", "utf8");
const credentialsSettings = readFileSync(
  "src/modules/settings/CredentialsSettings.tsx",
  "utf8",
);
const managerPath = "src/modules/settings/UrlCredentialManager.tsx";
const manager = existsSync(managerPath) ? readFileSync(managerPath, "utf8") : "";
const english = readFileSync("src/i18n/locales/en.json", "utf8");
const backend = readFileSync("src-tauri/src/lib.rs", "utf8");
const tauri = readFileSync("src/lib/tauri.ts", "utf8");

test("URL and Credentials settings share one website-data manager", () => {
  assert.match(urlSettings, /<UrlCredentialManager/);
  assert.match(credentialsSettings, /<UrlCredentialManager/);
  assert.match(manager, /export function UrlCredentialManager/);
});

test("saved website data uses compact rows with the same edit and delete controls", () => {
  assert.match(manager, /className="settings-url-credential-row"/);
  assert.match(manager, /settings-url-credential-address/);
  assert.match(manager, /<Pencil/);
  assert.match(manager, /<Trash2/);
  assert.match(english, /"savedWebsitePasswords": "Saved website password\/input data"/);
});

test("website data editing uses a shared app-owned dialog instead of inline fields", () => {
  assert.match(manager, /<DialogShell>/);
  assert.match(manager, /<Sheet/);
  assert.match(manager, /<Actions/);
  assert.match(manager, /<TextInput/);
  assert.doesNotMatch(urlSettings, /settings-credential-edit/);
});

test("website data editor labels every value by exact selector and occurrence", () => {
  assert.match(manager, /field\.selector/);
  assert.match(manager, /field\.index \+ 1/);
  assert.doesNotMatch(manager, /settings-url-credential-editor-grid/);
  assert.doesNotMatch(manager, /label=\{t\("settings\.urlCredentialUsername"\)\}/);
});

test("website data editor masks passwords and persists optional masks for other values", () => {
  assert.match(manager, /import \{ Eye, EyeOff, Lock, LockOpen, Pencil, Trash2 \}/);
  assert.match(manager, /masked: Boolean\(candidate\.masked\)/);
  assert.match(manager, /editTarget\.passwordSelector/);
  assert.match(manager, /settings\.urlCredentialShowValue/);
  assert.match(manager, /settings\.urlCredentialHideValue/);
  assert.match(manager, /settings\.urlCredentialMaskValue/);
  assert.match(manager, /settings\.urlCredentialUnmaskValue/);
  assert.match(manager, /type=\{[\s\S]*\? "text" : "password"\}/);
});

test("website data editor loads the stored password only for its masked reveal field", () => {
  assert.match(backend, /fn read_url_credential_password\(/);
  assert.match(backend, /secrets\.read_url_password\(owner_id\)/);
  assert.match(tauri, /read_url_credential_password:/);
  assert.match(manager, /invokeCommand\("read_url_credential_password"/);
});
