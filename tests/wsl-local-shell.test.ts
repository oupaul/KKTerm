import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWslDistributionShell,
  defaultWslConnectionName,
  distroFromWslShell,
  isWslShell,
  osIconRefForWslDistro,
  wslShellSelectorValue,
} from "../src/modules/workspace/connections/connection-dialog/wslLocalShell.ts";

test("buildWslDistributionShell stores selected distro in the local shell command line", () => {
  assert.equal(buildWslDistributionShell("Ubuntu"), "wsl.exe --distribution Ubuntu");
  assert.equal(buildWslDistributionShell("Ubuntu-24.04"), "wsl.exe --distribution Ubuntu-24.04");
});

test("distroFromWslShell reads existing distro-specific WSL shell commands", () => {
  assert.equal(distroFromWslShell("wsl.exe --distribution Ubuntu"), "Ubuntu");
  assert.equal(distroFromWslShell("wsl.exe -d Debian"), "Debian");
  assert.equal(distroFromWslShell("wsl.exe"), "");
});

test("wslShellSelectorValue keeps distro-specific WSL shells on the WSL selector tab", () => {
  assert.equal(wslShellSelectorValue("wsl.exe --distribution Ubuntu"), "wsl.exe");
  assert.equal(wslShellSelectorValue("pwsh.exe"), "pwsh.exe");
});

test("isWslShell detects WSL with or without distribution arguments", () => {
  assert.equal(isWslShell("wsl.exe"), true);
  assert.equal(isWslShell("wsl.exe --distribution Ubuntu"), true);
  assert.equal(isWslShell("C:\\Windows\\System32\\wsl.exe -d Ubuntu"), true);
  assert.equal(isWslShell("pwsh.exe"), false);
});

test("osIconRefForWslDistro maps explicit distro choices to bundled OS icons", () => {
  assert.equal(osIconRefForWslDistro("Ubuntu-24.04"), "os:ubuntu");
  assert.equal(osIconRefForWslDistro("Debian"), "os:debian");
  assert.equal(osIconRefForWslDistro("Kali-Linux"), "os:kalilinux");
  assert.equal(osIconRefForWslDistro("CustomDistro"), null);
});

test("defaultWslConnectionName names explicit distro connections", () => {
  assert.equal(defaultWslConnectionName("Ubuntu"), "WSL - Ubuntu");
  assert.equal(defaultWslConnectionName(""), null);
});
