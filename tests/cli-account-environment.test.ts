import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCliAccountBlock,
  buildCliAccountBlock,
  classifyCliAccountShell,
  cliAccountDirectory,
  slugCliAccountLabel,
} from "../src/modules/workspace/connections/connection-dialog/cliAccountEnvironment.ts";

test("classifies supported native and POSIX local shells", () => {
  assert.equal(classifyCliAccountShell("cmd.exe"), "cmd");
  assert.equal(classifyCliAccountShell("powershell.exe -NoLogo"), "powershell");
  assert.equal(classifyCliAccountShell("pwsh.exe"), "powershell");
  assert.equal(classifyCliAccountShell("wsl.exe --distribution Ubuntu"), "posix");
  assert.equal(classifyCliAccountShell("/bin/bash -l"), "posix");
  assert.equal(classifyCliAccountShell("/bin/zsh"), "posix");
  assert.equal(classifyCliAccountShell('"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoLogo'), "powershell");
  assert.equal(classifyCliAccountShell('"C:\\Program Files\\Git\\bin\\bash.exe" --login -i'), "posix");
  assert.equal(classifyCliAccountShell("C:\\Tools\\fish.exe"), null);
});

test("creates deterministic safe account slugs", () => {
  assert.equal(slugCliAccountLabel(" Work / Personal "), "work-personal");
  assert.equal(slugCliAccountLabel("Client__Two"), "client_two");
  assert.equal(slugCliAccountLabel("!!!"), "");
});

test("uses stable per-user data roots for each shell family", () => {
  assert.equal(
    cliAccountDirectory("claude-code", "work", "cmd"),
    "%LOCALAPPDATA%\\KKTerm\\cli-accounts\\claude-code\\work",
  );
  assert.equal(
    cliAccountDirectory("codex", "personal", "powershell"),
    "$env:LOCALAPPDATA\\KKTerm\\cli-accounts\\codex\\personal",
  );
  assert.equal(
    cliAccountDirectory("codex", "personal", "posix"),
    "${XDG_DATA_HOME:-$HOME/.local/share}/kkterm/cli-accounts/codex/personal",
  );
});

test("generates a Command Prompt Claude Code environment block", () => {
  const block = buildCliAccountBlock("claude-code", "Work", "cmd");

  assert.match(block, /set "CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\\KKTerm\\cli-accounts\\claude-code\\work"/);
  assert.match(block, /if not exist "%CLAUDE_CONFIG_DIR%" mkdir "%CLAUDE_CONFIG_DIR%"/);
  assert.doesNotMatch(block, /CODEX_HOME|API_KEY|TOKEN/);
});

test("generates PowerShell and POSIX Codex environment blocks", () => {
  const powershell = buildCliAccountBlock("codex", "Personal", "powershell");
  const posix = buildCliAccountBlock("codex", "Personal", "posix");

  assert.match(powershell, /\$env:CODEX_HOME = "\$env:LOCALAPPDATA\\KKTerm\\cli-accounts\\codex\\personal"/);
  assert.match(powershell, /New-Item -ItemType Directory -Force -Path \$env:CODEX_HOME \| Out-Null/);
  assert.match(posix, /export CODEX_HOME="\$\{XDG_DATA_HOME:-\$HOME\/\.local\/share\}\/kkterm\/cli-accounts\/codex\/personal"/);
  assert.match(posix, /mkdir -p "\$CODEX_HOME"/);
});

test("rejects labels that cannot produce a directory slug", () => {
  assert.throws(() => buildCliAccountBlock("codex", "!!!", "posix"), /account label/i);
});

test("appends a generated block without changing existing startup commands", () => {
  const existing = "echo before\necho after";
  const block = buildCliAccountBlock("codex", "Work", "posix");

  assert.equal(applyCliAccountBlock(existing, block), `${existing}\n\n${block}`);
});

test("replaces an existing generated block without duplicating it", () => {
  const first = buildCliAccountBlock("claude-code", "Work", "powershell");
  const second = buildCliAccountBlock("codex", "Personal", "powershell");
  const script = `Write-Host before\n${first}\nWrite-Host after`;
  const updated = applyCliAccountBlock(script, second);

  assert.equal(updated, `Write-Host before\n${second}\nWrite-Host after`);
  assert.equal(updated.match(/KKTerm CLI account environment begin/g)?.length, 1);
  assert.doesNotMatch(updated, /CLAUDE_CONFIG_DIR/);
});

test("keeps CRLF line endings when replacing a generated block", () => {
  const first = buildCliAccountBlock("claude-code", "Work", "cmd").replace(/\n/g, "\r\n");
  const second = buildCliAccountBlock("codex", "Personal", "cmd");
  const updated = applyCliAccountBlock(`echo before\r\n${first}\r\necho after`, second);

  assert.equal(updated.includes("\necho after"), true);
  assert.equal(updated.replace(/\r\n/g, "").includes("\n"), false);
});
