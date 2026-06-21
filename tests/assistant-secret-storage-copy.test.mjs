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

test("assistant secret card copy follows the selected credential backend", async () => {
  const { assistantSecretStorageBackendKey } = await importTypeScriptModule(
    new URL("../src/ai/secretRequest.ts", import.meta.url),
  );

  assert.equal(
    assistantSecretStorageBackendKey("os"),
    "ai.secretCardStorageBackendOs",
  );
  assert.equal(
    assistantSecretStorageBackendKey("file"),
    "ai.secretCardStorageBackendFile",
  );
});
