import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = encodeURIComponent(transpiled.outputText);
  return import(`data:text/javascript;charset=utf-8,${encoded}`);
}

test("credential storage model preserves Windows secret backend choices", async () => {
  const { normalizeAvailableSecretStores, normalizeSecretStoreKind } =
    await importTypeScriptModule(
      new URL("../src/modules/settings/credentialStorageModel.ts", import.meta.url),
    );

  assert.equal(normalizeSecretStoreKind("os"), "os");
  assert.equal(normalizeSecretStoreKind("file"), "file");
  assert.deepEqual(normalizeAvailableSecretStores(["os", "file"], "os"), [
    "os",
    "file",
  ]);
});

test("credential storage model keeps the selected backend renderable for bad status", async () => {
  const { normalizeAvailableSecretStores, normalizeSecretStoreKind } =
    await importTypeScriptModule(
      new URL("../src/modules/settings/credentialStorageModel.ts", import.meta.url),
    );

  assert.equal(normalizeSecretStoreKind("Windows Credential Manager"), "os");
  assert.deepEqual(normalizeAvailableSecretStores([], "file"), ["file"]);
  assert.deepEqual(normalizeAvailableSecretStores(["unknown", "os", "os"], "file"), [
    "file",
    "os",
  ]);
});

test("credential storage model routes file backend selection through setup", async () => {
  const { credentialStorageSelectionAction } =
    await importTypeScriptModule(
      new URL("../src/modules/settings/credentialStorageModel.ts", import.meta.url),
    );

  assert.equal(
    credentialStorageSelectionAction({
      currentStore: "os",
      nextStore: "file",
      secretStatus: {
        available: false,
        selectedStore: "file",
        availableStores: ["os", "file"],
      },
    }),
    "setup-file",
  );
  assert.equal(
    credentialStorageSelectionAction({
      currentStore: "file",
      nextStore: "file",
      secretStatus: {
        available: true,
        selectedStore: "file",
        availableStores: ["os", "file"],
      },
    }),
    "select",
  );
  assert.equal(
    credentialStorageSelectionAction({
      currentStore: "file",
      nextStore: "os",
      secretStatus: {
        available: true,
        selectedStore: "file",
        availableStores: ["os", "file"],
      },
    }),
    "select",
  );
});

test("credential storage model auto-prompts Linux when encrypted file storage needs setup", async () => {
  const { shouldPromptForEncryptedFileSetup } =
    await importTypeScriptModule(
      new URL("../src/modules/settings/credentialStorageModel.ts", import.meta.url),
    );

  assert.equal(
    shouldPromptForEncryptedFileSetup({
      platform: "linux",
      selectedStore: "file",
      secretStatus: {
        available: false,
        selectedStore: "file",
        availableStores: ["file"],
      },
    }),
    true,
  );
  assert.equal(
    shouldPromptForEncryptedFileSetup({
      platform: "windows",
      selectedStore: "file",
      secretStatus: {
        available: false,
        selectedStore: "file",
        availableStores: ["os", "file"],
      },
    }),
    false,
  );
  assert.equal(
    shouldPromptForEncryptedFileSetup({
      platform: "linux",
      selectedStore: "file",
      secretStatus: {
        available: true,
        selectedStore: "file",
        availableStores: ["file"],
      },
    }),
    false,
  );
});
