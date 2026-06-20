import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Local Connection exposes an editable CLI account helper through Startup script", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/connection-dialog/LocalConnectionFields.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /classifyCliAccountShell/);
  assert.match(source, /buildCliAccountBlock/);
  assert.match(source, /applyCliAccountBlock/);
  assert.match(source, /connections\.cliAccountHelper/);
  assert.match(source, /connections\.cliAccountTool/);
  assert.match(source, /connections\.cliAccountLabel/);
  assert.match(source, /connections\.cliAccountApply/);
  assert.match(source, /name="localStartupScript"[\s\S]*value=\{localStartupScript\}/);
  assert.match(source, /setLocalStartupScript\(event\.currentTarget\.value\)/);
  assert.doesNotMatch(source, /name="cliAccount(?:Tool|Label)"/);
});

test("CLI account helper styling stays scoped to the Local Connection form", async () => {
  const css = await readFile(
    new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.local-cli-account-label-row/);
  assert.match(css, /\.local-cli-account-panel/);
  assert.match(css, /\.local-cli-account-actions/);
});
