import assert from "node:assert/strict";
import test from "node:test";

import {
  connectionToolbarTitle,
  resolveAvailableLocalShell,
  type LocalShellOption,
} from "../src/modules/workspace/connections/utils.tsx";

const WINDOWS_OPTIONS: LocalShellOption[] = [
  { label: "Command Prompt", value: "cmd.exe" },
  { label: "PowerShell", value: "powershell.exe" },
  { label: "WSL", value: "wsl.exe" },
];

test("resolveAvailableLocalShell preserves distro-specific WSL command lines", () => {
  assert.equal(
    resolveAvailableLocalShell("wsl.exe --distribution Ubuntu", WINDOWS_OPTIONS),
    "wsl.exe --distribution Ubuntu",
  );
});

test("resolveAvailableLocalShell still falls back for unavailable shells", () => {
  assert.equal(resolveAvailableLocalShell("missing-shell.exe", WINDOWS_OPTIONS), "cmd.exe");
});

test("local connection toolbar title uses the saved connection name instead of the shell command", () => {
  assert.equal(
    connectionToolbarTitle({
      id: "local-wsl-ubuntu",
      name: "WSL - Ubuntu",
      type: "local",
      host: "",
      port: 0,
      user: "",
      auth: "password",
      password: "",
      privateKey: "",
      localShell: "wsl.exe --distribution Ubuntu",
    }),
    "WSL - Ubuntu",
  );
});
