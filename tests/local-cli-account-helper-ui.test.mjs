import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Local Connection opens the environment variable manager through Startup script", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/connection-dialog/LocalConnectionFields.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /EnvironmentVariablesDialog/);
  assert.match(source, /classifyEnvironmentShell/);
  assert.match(source, /connections\.environmentVariables/);
  assert.match(source, /name="localStartupScript"[\s\S]*value=\{localStartupScript\}/);
  assert.match(source, /setLocalStartupScript\(event\.currentTarget\.value\)/);
  assert.doesNotMatch(source, /cliAccountTool|cliAccountLabel|buildCliAccountBlock/);
});

test("environment manager uses shared dialogs and keeps CLI accounts as a nested helper", async () => {
  const source = await readFile(
    new URL(
      "../src/modules/workspace/connections/connection-dialog/EnvironmentVariablesDialog.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const css = await readFile(
    new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
    "utf8",
  );

  assert.match(source, /DialogShell/);
  assert.match(source, /<Sheet/);
  assert.match(source, /<Actions/);
  assert.match(source, /connections\.environmentVariableAdd/);
  assert.match(source, /connections\.cliAccountHelper/);
  assert.match(source, /createCliAccountVariable/);
  assert.match(css, /\.connection-environment-dialog/);
  assert.match(css, /\.connection-environment-row/);
  assert.doesNotMatch(css, /\.local-cli-account-panel/);
});
