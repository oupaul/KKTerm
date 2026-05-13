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

test("script widget source is encoded as data before iframe execution", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/dashboard/script/permissions.ts", import.meta.url),
  );
  const source = "document.body.innerHTML = `<div><script>alert(1)</script></div>`;";
  const srcdoc = buildSrcdoc({
    source,
    permissions: { network: false },
  });

  assert.match(srcdoc, /script-src 'unsafe-inline' blob:/);
  assert.match(srcdoc, /const source = /);
  assert.doesNotMatch(srcdoc, /<script>alert\(1\)<\/script><\/div>`;/);
  assert.match(srcdoc, /\\u003cscript>alert\(1\)\\u003c\/script>\\u003c\/div>`;/);
});
