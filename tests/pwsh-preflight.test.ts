// Behavioral tests for the pwsh shell predicate that gates the PowerShell 7
// pre-flight install flow. The predicate is the decision callers depend on:
// "is this requested local shell PowerShell 7 (pwsh)?" in any casing or path
// form. The install/spawn flow itself needs the Tauri runtime and is verified
// manually; this isolates the pure decision.
import assert from "node:assert/strict";
import test from "node:test";

import { isPwshShell } from "../src/modules/workspace/connections/terminal/pwshShell.ts";

test("isPwshShell matches pwsh in any casing or path form", () => {
  assert.equal(isPwshShell("pwsh.exe"), true);
  assert.equal(isPwshShell("PWSH.EXE"), true);
  assert.equal(isPwshShell("pwsh"), true);
  assert.equal(isPwshShell("C:\\Program Files\\PowerShell\\7\\pwsh.exe"), true);
});

test("isPwshShell rejects other shells", () => {
  assert.equal(isPwshShell("powershell.exe"), false);
  assert.equal(isPwshShell("cmd.exe"), false);
  assert.equal(isPwshShell("wsl.exe"), false);
  assert.equal(isPwshShell(undefined), false);
});
