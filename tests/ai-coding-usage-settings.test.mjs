import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadSettingsModule() {
  const source = await readFile(
    new URL("../src/modules/dashboard/widgets/builtin/ai-coding-usage/settings.ts", import.meta.url),
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

test("AI coding usage widget settings start empty and add providers idempotently", async () => {
  const {
    addAiCodingUsageProvider,
    parseAiCodingUsageSettingsJson,
    serializeAiCodingUsageSettings,
  } = await loadSettingsModule();

  const empty = parseAiCodingUsageSettingsJson("");
  assert.equal(JSON.stringify(empty.providers), "[]");

  const withCodex = addAiCodingUsageProvider(empty, "codex");
  const stillOneCodex = addAiCodingUsageProvider(withCodex, "codex");
  assert.equal(JSON.stringify(stillOneCodex.providers), JSON.stringify(["codex"]));

  const roundTripped = parseAiCodingUsageSettingsJson(
    serializeAiCodingUsageSettings(addAiCodingUsageProvider(stillOneCodex, "claudeCode")),
  );
  assert.equal(
    JSON.stringify(roundTripped.providers),
    JSON.stringify(["codex", "claudeCode"]),
  );
});

test("AI coding usage widget settings discard unknown and duplicate providers", async () => {
  const { availableAiCodingUsageProviders, parseAiCodingUsageSettingsJson } =
    await loadSettingsModule();

  const settings = parseAiCodingUsageSettingsJson(
    JSON.stringify({ providers: ["claudeCode", "bad", "codex", "claudeCode"] }),
  );

  assert.equal(
    JSON.stringify(settings.providers),
    JSON.stringify(["claudeCode", "codex"]),
  );
  assert.equal(JSON.stringify(availableAiCodingUsageProviders(settings)), "[]");
});
