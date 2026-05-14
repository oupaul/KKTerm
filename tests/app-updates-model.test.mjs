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

test("startup update check only runs once when enabled in the Tauri runtime", async () => {
  const { shouldRunStartupUpdateCheck } = await importTypeScriptModule(
    new URL("../src/lib/appUpdatesModel.ts", import.meta.url),
  );

  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: true,
      hasCheckedThisLaunch: false,
      isTauriRuntime: true,
    }),
    true,
  );
  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: true,
      hasCheckedThisLaunch: true,
      isTauriRuntime: true,
    }),
    false,
  );
  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: false,
      hasCheckedThisLaunch: false,
      isTauriRuntime: true,
    }),
    false,
  );
  assert.equal(
    shouldRunStartupUpdateCheck({
      autoUpdateChecksEnabled: true,
      hasCheckedThisLaunch: false,
      isTauriRuntime: false,
    }),
    false,
  );
});

