import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("encrypted credential storage unlock is deferred until a secret operation requests it", async () => {
  const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const settingsSource = await readFile(
    new URL("../src/modules/settings/CredentialsSettings.tsx", import.meta.url),
    "utf8",
  );
  const statusBarSource = await readFile(
    new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(appSource, /shouldPromptForEncryptedFileSetup/);
  assert.doesNotMatch(appSource, /encryptedFileAutoPromptCheckedRef/);
  assert.match(appSource, /CREDENTIAL_UNLOCK_REQUIRED_EVENT/);

  assert.doesNotMatch(settingsSource, /encryptedStoreLaunchPrompt/);
  assert.doesNotMatch(settingsSource, /shouldPromptForEncryptedFileSetup/);

  assert.match(statusBarSource, /CredentialStoreStatusButton/);
  assert.match(statusBarSource, /credential_secret_store_status/);
  assert.match(statusBarSource, /lock_encrypted_file_secret_store/);
  assert.match(statusBarSource, /configure_encrypted_file_secret_store/);
});
