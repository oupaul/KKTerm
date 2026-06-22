import assert from "node:assert/strict";
import test from "node:test";
import {
  createCredentialUnlockRequest,
  isCredentialUnlockRequiredError,
} from "../src/lib/credentialUnlock";
import {
  connectionRequestNeedsCredentialStoreUnlock,
  shouldDeleteSshSocksProxySecret,
} from "../src/modules/workspace/connections/credentialUnlockPreflight";

test("credential unlock errors include startup, explicit lock, and wrong-password failures", () => {
  assert.equal(
    isCredentialUnlockRequiredError(
      "KKTERM_SECRET_STORE_PASSWORD is required for encrypted SQLite secret storage",
    ),
    true,
  );
  assert.equal(
    isCredentialUnlockRequiredError(
      "Encrypted SQLite secret store is locked until the master password is entered",
    ),
    true,
  );
  assert.equal(
    isCredentialUnlockRequiredError("could not decrypt encrypted SQLite secret"),
    true,
  );
  assert.equal(isCredentialUnlockRequiredError("connection name is required"), false);
});

test("credential unlock requests resume the pending operation after a successful unlock", async () => {
  let complete: ((unlocked: boolean) => void) | undefined;
  const pending = createCredentialUnlockRequest((detail) => {
    complete = detail.complete;
  });

  complete?.(true);

  assert.equal(await pending, true);
});

test("connection save preflights encrypted credential unlock before storing new secrets", () => {
  assert.equal(
    connectionRequestNeedsCredentialStoreUnlock({ password: "ssh-password" }),
    true,
  );
  assert.equal(
    connectionRequestNeedsCredentialStoreUnlock({ keyPassphrase: "key-passphrase" }),
    true,
  );
  assert.equal(
    connectionRequestNeedsCredentialStoreUnlock({ urlPassword: "url-password" }),
    true,
  );
  assert.equal(
    connectionRequestNeedsCredentialStoreUnlock({ sshSocksProxyPassword: "proxy-password" }),
    true,
  );
});

test("connection save does not preflight unlock for metadata-only credential choices", () => {
  assert.equal(
    connectionRequestNeedsCredentialStoreUnlock({
      passwordCredentialId: "connection-password:abc",
    }),
    false,
  );
});

test("new ssh connections without per-connection proxy auth do not clear a missing proxy secret", () => {
  assert.equal(
    shouldDeleteSshSocksProxySecret({
      type: "ssh",
      sshSocksProxyInheritDefaults: true,
      existingSecretExists: false,
    }),
    false,
  );
});

test("editing ssh proxy auth clears an existing proxy secret only when auth is removed", () => {
  assert.equal(
    shouldDeleteSshSocksProxySecret({
      type: "ssh",
      sshSocksProxyInheritDefaults: true,
      existingSecretExists: true,
    }),
    true,
  );
  assert.equal(
    shouldDeleteSshSocksProxySecret({
      type: "ssh",
      sshSocksProxy: "127.0.0.1:1080",
      sshSocksProxyUsername: "proxy-user",
      sshSocksProxyInheritDefaults: false,
      existingSecretExists: true,
    }),
    false,
  );
});
