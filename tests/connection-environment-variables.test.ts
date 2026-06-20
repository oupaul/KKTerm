import assert from "node:assert/strict";
import test from "node:test";

import {
  applyEnvironmentBlock,
  classifyEnvironmentShell,
  createCliAccountVariable,
  parseEnvironmentBlock,
  renderEnvironmentBlock,
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
