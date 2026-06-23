import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("encrypted credential storage unlock is deferred until a secret operation requests it", async () => {
  const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const settingsSource = await readFile(
    new URL("../src/modules/settings/CredentialsSettings.tsx", import.meta.url),
    "utf8",
  );
  const defaultsSource = await readFile(
    new URL("../src/app-defaults.ts", import.meta.url),
    "utf8",
  );
  const statusBarSource = await readFile(
    new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
    "utf8",
  );
  const connectionSidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(appSource, /shouldPromptForEncryptedFileSetup/);
  assert.doesNotMatch(appSource, /encryptedFileAutoPromptCheckedRef/);
  assert.match(appSource, /CREDENTIAL_UNLOCK_REQUIRED_EVENT/);
  assert.match(appSource, /credentialUnlockCompletionsRef/);
  assert.match(appSource, /completeCredentialUnlockRequests\(true\)/);
  assert.match(appSource, /completeCredentialUnlockRequests\(false\)/);

  assert.doesNotMatch(settingsSource, /shouldPromptForEncryptedFileSetup/);
  assert.match(settingsSource, /encryptedStoreLaunchPrompt/);
  assert.match(defaultsSource, /encryptedStoreLaunchPrompt:\s*"never"/);
  assert.match(appSource, /shouldPromptForEncryptedStoreOnLaunch/);

  assert.match(statusBarSource, /CredentialStoreStatusButton/);
  assert.match(statusBarSource, /credential_secret_store_status/);
  assert.match(statusBarSource, /lock_encrypted_file_secret_store/);
  assert.match(statusBarSource, /configure_encrypted_file_secret_store/);

  const submitHandler = connectionSidebarSource.slice(
    connectionSidebarSource.indexOf("async function handleConnectionSubmit("),
    connectionSidebarSource.indexOf("async function handleConnectionUpdate("),
  );
  assert.match(
    submitHandler,
    /ensureCredentialStoreReadyForConnectionRequest/,
    "Add Connection should request unlock before creating durable data",
  );
  assert.ok(
    submitHandler.indexOf("ensureCredentialStoreReadyForConnectionRequest") <
      submitHandler.indexOf('invokeCommand("create_connection"'),
    "credential unlock preflight must run before create_connection",
  );

  const updateHandler = connectionSidebarSource.slice(
    connectionSidebarSource.indexOf("async function handleConnectionUpdate("),
    connectionSidebarSource.indexOf("function handleCreateFolder("),
  );
  assert.match(
    updateHandler,
    /ensureCredentialStoreReadyForConnectionRequest/,
    "Connection Properties should request unlock before updating durable data",
  );
  assert.ok(
    updateHandler.indexOf("ensureCredentialStoreReadyForConnectionRequest") <
      updateHandler.indexOf('invokeCommand("update_connection"'),
    "credential unlock preflight must run before update_connection",
  );
});
