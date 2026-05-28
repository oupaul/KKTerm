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

test("script source editor preserves body metadata while replacing source", async () => {
  const { updateScriptBodySourceJson } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/edit/scriptSourceEditor.ts", import.meta.url),
  );
  const bodyJson = JSON.stringify({
    source: "document.body.textContent = 'old';",
    permissions: { network: true, pollSeconds: 30 },
    libraries: ["dayjs"],
    lifecycle: { kind: "periodic", minTickMs: 1000 },
    htmlShim: "<main id=\"root\"></main>",
  });

  const nextJson = updateScriptBodySourceJson(bodyJson, "document.body.textContent = 'new';");
  const next = JSON.parse(nextJson);

  assert.equal(next.source, "document.body.textContent = 'new';");
  assert.deepEqual(next.permissions, { network: true, pollSeconds: 30 });
  assert.deepEqual(next.libraries, ["dayjs"]);
  assert.deepEqual(next.lifecycle, { kind: "periodic", minTickMs: 1000 });
  assert.equal(next.htmlShim, "<main id=\"root\"></main>");
});

