import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadPersistenceModule() {
  const source = await readFile(
    new URL("../src/modules/settings/aiCliStatusPersistence.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module });
  return module.exports;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("AI CLI status persistence round-trips manual check result with timestamp", async () => {
  const {
    readStoredAiCliBackendStatus,
    writeStoredAiCliBackendStatus,
  } = await loadPersistenceModule();
  const storage = memoryStorage();

  writeStoredAiCliBackendStatus(
    "codex",
    {
      provider: "codex",
      command: "C:\\nvm4w\\nodejs\\codex.cmd",
      installed: true,
      authenticated: false,
      version: "codex-cli 0.137.0",
      error: "Auth required",
    },
    "2026-06-07T03:30:00.000Z",
    storage,
  );

  assert.equal(
    JSON.stringify(readStoredAiCliBackendStatus("codex", storage)),
    JSON.stringify({
      checkedAt: "2026-06-07T03:30:00.000Z",
      status: {
        provider: "codex",
        command: "C:\\nvm4w\\nodejs\\codex.cmd",
        installed: true,
        authenticated: false,
        version: "codex-cli 0.137.0",
        error: "Auth required",
      },
    }),
  );
});

test("AI CLI status persistence ignores malformed or mismatched stored results", async () => {
  const { readStoredAiCliBackendStatus } = await loadPersistenceModule();
  const storage = memoryStorage();
  storage.setItem(
    "kkterm.settings.aiCliBackendStatus.v1.claudeCode",
    JSON.stringify({
      checkedAt: "2026-06-07T03:30:00.000Z",
      status: {
        provider: "codex",
        command: "codex",
        installed: true,
        authenticated: true,
      },
    }),
  );
  storage.setItem("kkterm.settings.aiCliBackendStatus.v1.codex", "{bad json");

  assert.equal(readStoredAiCliBackendStatus("claudeCode", storage), null);
  assert.equal(readStoredAiCliBackendStatus("codex", storage), null);
});
