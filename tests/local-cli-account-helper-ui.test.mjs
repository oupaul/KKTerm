import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Local Connection opens the CLI account helper from an icon-only wand", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/connection-dialog/LocalConnectionFields.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /CliAccountDialog/);
  assert.match(source, /classifyEnvironmentShell/);
  assert.match(source, /WandSparkles/);
  assert.match(source, /connections\.cliAccountAlternateProfileHint/);
  assert.match(source, /aria-label=\{t\("connections\.cliAccountAlternateProfileHint"\)\}/);
  assert.doesNotMatch(source, /ListTree/);
  assert.doesNotMatch(source, />\s*\{t\("connections\.environmentVariables"\)\}\s*<\/button>/);
  assert.match(source, /name="localStartupScript"[\s\S]*value=\{localStartupScript\}/);
  assert.match(source, /setLocalStartupScript\(event\.currentTarget\.value\)/);
  assert.doesNotMatch(source, /cliAccountTool|cliAccountLabel|buildCliAccountBlock/);
});

test("CLI account helper uses branded CLI choices and remembered editable labels", async () => {
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
  assert.match(source, /connections\.cliAccountHelper/);
  assert.match(source, /createCliAccountVariable/);
  assert.match(source, /claude-code\.svg\?url/);
  assert.match(source, /codex\.svg\?url/);
  assert.match(source, /KKTERM_CLI_ACCOUNT_LABELS_STORAGE_KEY/);
  assert.match(source, /<datalist/);
  assert.match(source, /list=\{accountLabelListId\}/);
  assert.doesNotMatch(source, /environmentVariableAdd/);
  assert.match(css, /\.connection-cli-tool-option/);
  assert.doesNotMatch(css, /\.local-cli-account-panel/);
});

test("managed account variables are attached before local shell spawn", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /prepareLocalStartup/);
  assert.match(source, /environmentVariables:\s*localStartup\.environmentVariables/);
  assert.match(source, /localStartup\.startupInput/);
});
