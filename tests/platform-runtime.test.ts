// Behavioral tests for the runtime platform detector. These drive the real
// functions with concrete `navigator` shapes and assert the branch decisions
// callers depend on (which OS we are on, which features are exposed, what the
// default local shell is, and whether native window controls are used).
import assert from "node:assert/strict";
import test from "node:test";

import {
  currentPlatform,
  defaultLocalShell,
  isMacPlatform,
  isWindowsPlatform,
  supportsBuiltInMcp,
  supportsInstallerHelper,
  supportsMinimizeToTray,
  supportsRdp,
  usesNativeWindowControls,
} from "../src/lib/platform.ts";

type NavigatorLike = { userAgent: string; platform: string };

function withNavigator(value: NavigatorLike | undefined, run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  try {
    if (value === undefined) {
      // Simulate a non-browser runtime where `navigator` is absent.
      Object.defineProperty(globalThis, "navigator", {
        value: undefined,
        configurable: true,
      });
    } else {
      Object.defineProperty(globalThis, "navigator", {
        value,
        configurable: true,
      });
    }
    run();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "navigator", descriptor);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  }
}

const MAC: NavigatorLike = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  platform: "MacIntel",
};
const WINDOWS: NavigatorLike = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  platform: "Win32",
};
const LINUX: NavigatorLike = {
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  platform: "Linux x86_64",
};

test("currentPlatform classifies macOS, Windows, and Linux user agents", () => {
  withNavigator(MAC, () => assert.equal(currentPlatform(), "macos"));
  withNavigator(WINDOWS, () => assert.equal(currentPlatform(), "windows"));
  withNavigator(LINUX, () => assert.equal(currentPlatform(), "linux"));
});

test("currentPlatform defaults to windows when navigator is unavailable", () => {
  withNavigator(undefined, () => assert.equal(currentPlatform(), "windows"));
});

test("Windows-only helpers are gated to Windows", () => {
  withNavigator(WINDOWS, () => {
    assert.equal(isWindowsPlatform(), true);
    assert.equal(supportsInstallerHelper(), true);
    assert.equal(supportsMinimizeToTray(), true);
  });
  for (const nav of [MAC, LINUX]) {
    withNavigator(nav, () => {
      assert.equal(isWindowsPlatform(), false);
      assert.equal(supportsInstallerHelper(), false);
      assert.equal(supportsMinimizeToTray(), false);
    });
  }
});

test("built-in MCP is supported on Windows, macOS, and Linux", () => {
  for (const nav of [WINDOWS, MAC, LINUX]) {
    withNavigator(nav, () => assert.equal(supportsBuiltInMcp(), true));
  }
});

test("RDP is supported on Windows and macOS", () => {
  withNavigator(WINDOWS, () => assert.equal(supportsRdp(), true));
  withNavigator(MAC, () => assert.equal(supportsRdp(), true));
  withNavigator(LINUX, () => assert.equal(supportsRdp(), false));
});

test("native window controls are used only on macOS (overlay title bar)", () => {
  withNavigator(MAC, () => {
    assert.equal(isMacPlatform(), true);
    assert.equal(usesNativeWindowControls(), true);
  });
  for (const nav of [WINDOWS, LINUX]) {
    withNavigator(nav, () => {
      assert.equal(isMacPlatform(), false);
      assert.equal(usesNativeWindowControls(), false);
    });
  }
});

test("defaultLocalShell picks a sensible shell per platform", () => {
  withNavigator(WINDOWS, () => assert.equal(defaultLocalShell(), "powershell.exe"));
  withNavigator(MAC, () => assert.equal(defaultLocalShell(), "/bin/zsh"));
  withNavigator(LINUX, () => assert.equal(defaultLocalShell(), "/bin/bash"));
});
