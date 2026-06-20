import assert from "node:assert/strict";
import test from "node:test";

import {
  applyEnvironmentBlock,
  classifyEnvironmentShell,
  createCliAccountVariable,
  parseEnvironmentBlock,
  prepareLocalStartup,
  renderEnvironmentBlock,
  retargetEnvironmentBlock,
  slugCliAccountLabel,
  validateEnvironmentVariables,
  type EnvironmentShellFamily,
  type ManagedEnvironmentVariable,
} from "../src/modules/workspace/connections/connection-dialog/environmentVariables.ts";

test("classifies supported local shells", () => {
  assert.equal(classifyEnvironmentShell("cmd.exe"), "cmd");
  assert.equal(classifyEnvironmentShell('"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoLogo'), "powershell");
  assert.equal(classifyEnvironmentShell("wsl.exe --distribution Ubuntu"), "posix");
  assert.equal(classifyEnvironmentShell("/bin/zsh"), "posix");
  assert.equal(classifyEnvironmentShell("fish"), null);
});

test("validates portable unique names and single-line values", () => {
  assert.equal(validateEnvironmentVariables([{ name: "API_URL", value: "", source: "literal" }]), null);
  assert.equal(validateEnvironmentVariables([{ name: "2FAST", value: "x", source: "literal" }]), "invalidName");
  assert.equal(validateEnvironmentVariables([{ name: "GOOD", value: "a\nb", source: "literal" }]), "multilineValue");
  assert.equal(
    validateEnvironmentVariables([
      { name: "Path", value: "a", source: "literal" },
      { name: "PATH", value: "b", source: "literal" },
    ]),
    "duplicateName",
  );
});

test("creates stable CLI account rows", () => {
  assert.equal(slugCliAccountLabel(" Work / Personal "), "work-personal");
  assert.deepEqual(createCliAccountVariable("claude-code", "Work", "cmd"), {
    name: "CLAUDE_CONFIG_DIR",
    value: "%LOCALAPPDATA%\\KKTerm\\cli-accounts\\claude-code\\work",
    source: "cliAccount",
  });
  assert.equal(
    createCliAccountVariable("codex", "Personal", "posix").value,
    "${XDG_DATA_HOME:-$HOME/.local/share}/kkterm/cli-accounts/codex/personal",
  );
  assert.throws(() => createCliAccountVariable("codex", "!!!", "posix"), /account label/i);
});

const literalRows: ManagedEnvironmentVariable[] = [
  { name: "EMPTY", value: "", source: "literal" },
  { name: "QUOTED", value: 'say "hello" with %PATH%, $HOME, `tick`, and ^caret', source: "literal" },
];

for (const family of ["cmd", "powershell", "posix"] satisfies EnvironmentShellFamily[]) {
  test(`renders and parses ${family} variables`, () => {
    const account = createCliAccountVariable("codex", "Work", family);
    const block = renderEnvironmentBlock([...literalRows, account], family);
    const parsed = parseEnvironmentBlock(block, family);

    assert.equal(parsed.status, "ok");
    assert.deepEqual(parsed.variables, [...literalRows, account]);
    assert.match(block, /KKTerm environment variables begin/);
    assert.match(block, /CODEX_HOME/);
    assert.match(block, family === "cmd" ? /if not exist/ : family === "powershell" ? /New-Item/ : /mkdir -p/);
    if (family === "cmd") assert.match(block, /\^%PATH\^%/);
    if (family === "powershell") assert.match(block, /`\$HOME/);
    if (family === "posix") assert.match(block, /\\\$HOME/);
  });
}

test("imports the legacy CLI account block", () => {
  const legacy = [
    "# KKTerm CLI account environment begin",
    'export CODEX_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/kkterm/cli-accounts/codex/work"',
    'mkdir -p "$CODEX_HOME"',
    "# KKTerm CLI account environment end",
  ].join("\n");

  assert.deepEqual(parseEnvironmentBlock(legacy, "posix"), {
    status: "ok",
    variables: [createCliAccountVariable("codex", "work", "posix")],
  });
});

test("flags incomplete managed blocks as malformed", () => {
  assert.equal(parseEnvironmentBlock("# KKTerm environment variables begin\nexport A=\"b\"", "posix").status, "malformed");
});

test("replaces and removes managed blocks while preserving surrounding text and CRLF", () => {
  const first = renderEnvironmentBlock([{ name: "ONE", value: "1", source: "literal" }], "powershell").replace(
    /\n/gu,
    "\r\n",
  );
  const second = renderEnvironmentBlock([{ name: "TWO", value: "2", source: "literal" }], "powershell");
  const script = `Write-Host before\r\n${first}\r\nWrite-Host after`;
  const updated = applyEnvironmentBlock(script, second);

  assert.equal(updated, `Write-Host before\r\n${second.replace(/\n/gu, "\r\n")}\r\nWrite-Host after`);
  assert.equal(applyEnvironmentBlock(updated, ""), "Write-Host before\r\nWrite-Host after");
});

test("appends a block without changing existing commands", () => {
  const block = renderEnvironmentBlock([{ name: "A", value: "b", source: "literal" }], "posix");
  assert.equal(applyEnvironmentBlock("echo before", block), `echo before\n\n${block}`);
});

test("retargets managed CLI account scripting when the selected shell changes", () => {
  const cmdBlock = renderEnvironmentBlock(
    [
      { name: "PLAIN", value: "unchanged", source: "literal" },
      createCliAccountVariable("claude-code", "Ryan", "cmd"),
    ],
    "cmd",
  );
  const script = `Write-Host before\n${cmdBlock}\nWrite-Host after`;
  const updated = retargetEnvironmentBlock(script, "powershell");

  assert.match(updated, /# KKTerm environment variables begin/);
  assert.match(updated, /\$env:PLAIN = "unchanged"/);
  assert.match(updated, /\$env:CLAUDE_CONFIG_DIR = "\$env:LOCALAPPDATA\\KKTerm\\cli-accounts\\claude-code\\ryan"/);
  assert.doesNotMatch(updated, /%LOCALAPPDATA%|^REM |^set "/m);
  assert.match(updated, /^Write-Host before/m);
  assert.match(updated, /^Write-Host after/m);
});

test("extracts managed variables before launch instead of typing them into the shell", () => {
  const variable = createCliAccountVariable("claude-code", "Work", "powershell");
  const script = `Write-Host before\n\n${renderEnvironmentBlock([variable], "powershell")}\n\nWrite-Host after`;

  const prepared = prepareLocalStartup(script, "powershell");

  assert.deepEqual(prepared.environmentVariables, [variable]);
  assert.equal(prepared.startupScript.replace(/\n+/gu, "\n"), "Write-Host before\nWrite-Host after");
  assert.doesNotMatch(prepared.startupScript, /KKTerm environment variables|New-Item|CLAUDE_CONFIG_DIR/);
});
