import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadDisplayModule() {
  const source = await readFile(
    new URL("../src/modules/dashboard/widgets/builtin/ai-coding-usage/display.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, Intl, Date });
  return module.exports;
}

test("AI coding usage last refresh displays only the time", async () => {
  const { formatTimeOnly } = await loadDisplayModule();

  assert.equal(
    formatTimeOnly("2026-05-20T13:45:00.000Z", "en-US", "UTC"),
    "1:45 PM",
  );
});

test("AI coding usage product labels include vendor names", async () => {
  const en = JSON.parse(
    await readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  );

  assert.equal(en.dashboard.aiCodingUsageProviderProduct.codex, "OpenAI Codex");
  assert.equal(
    en.dashboard.aiCodingUsageProviderProduct.claudeCode,
    "Anthropic Claude Code",
  );
});
