import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("RDP overlay keyboard focus uses a thread-local WH_MOUSE hook, not WM_MOUSEACTIVATE", async () => {
  const source = await readFile(new URL("../src-tauri/src/rdp.rs", import.meta.url), "utf8");
  const shim = source.match(/struct RdpOverlayFocusHook[\s\S]*?fn uninstall_rdp_overlay_focus_hook/)?.[0] ?? "";

  // The fix must NOT be the reverted WM_MOUSEACTIVATE subclass.
  assert.doesNotMatch(
    source,
    /fn rdp_overlay_subclass_proc/,
    "the WM_MOUSEACTIVATE subclass from PR #465 must be removed (it never fired on clicks and stole focus on hover)",
  );
  assert.doesNotMatch(
    source,
    /install_rdp_overlay_focus_subclass/,
    "the WM_MOUSEACTIVATE subclass install path must be removed",
  );

  // The active fix: a thread-local WH_MOUSE hook.
  assert.match(shim, /WH_MOUSE/, "RDP focus fix should install a WH_MOUSE hook");
  assert.match(
    shim,
    /SetWindowsHookExW\(WH_MOUSE,/,
    "RDP focus fix should install the hook via SetWindowsHookExW(WH_MOUSE, ...)",
  );
  assert.match(
    shim,
    /GetCurrentThreadId\(\)/,
    "RDP focus hook must be thread-local (dwThreadId = GetCurrentThreadId), not a global desktop hook that would require a DLL",
  );
  assert.match(
    shim,
    /focus_rdp_control\(owner, overlay\)/,
    "RDP focus hook should reuse focus_rdp_control to bring the owner forward and focus the overlay",
  );
  assert.match(
    shim,
    /CallNextHookEx\(None, code, wparam, lparam\)/,
    "RDP focus hook must always call CallNextHookEx so the click still reaches the remote session",
  );
  assert.match(
    shim,
    /IsChild\(overlay, target\)/,
    "RDP focus hook should only act on clicks inside the overlay subtree (IsChild)",
  );
  assert.match(
    shim,
    /fn uninstall_rdp_overlay_focus_hook/,
    "RDP focus hook must be explicitly uninstallable for clean lifecycle",
  );
});