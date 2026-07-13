import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("RDP overlay keyboard focus uses a low-level click hook, not WM_MOUSEACTIVATE", async () => {
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

  // The active fix: a low-level click hook that is not tied to the ActiveX child thread.
  assert.match(shim, /WH_MOUSE_LL/, "RDP focus fix should install a low-level mouse hook");
  assert.match(
    shim,
    /SetWindowsHookExW\(\s*WH_MOUSE_LL,/,
    "RDP focus fix should install the hook via SetWindowsHookExW(WH_MOUSE_LL, ...)",
  );
  assert.match(
    shim,
    /SetWindowsHookExW\([\s\S]*WH_MOUSE_LL[\s\S]*,\s*0\s*\)/,
    "RDP focus hook should be global low-level (dwThreadId = 0) so it is not tied to a recreated ActiveX child thread",
  );
  assert.match(
    shim,
    /MSLLHOOKSTRUCT/,
    "RDP focus hook should read the low-level mouse point from MSLLHOOKSTRUCT",
  );
  assert.match(
    shim,
    /WindowFromPoint\(info\.pt\)/,
    "RDP focus hook should resolve the real HWND under the click from the screen point",
  );
  assert.match(
    source,
    /fn focus_rdp_window\([\s\S]*AttachThreadInput\(current_thread, foreground_thread, true\)[\s\S]*SetForegroundWindow\(owner\)[\s\S]*SetForegroundWindow\(active\)[\s\S]*SetFocus\(Some\(focus\)\)/,
    "RDP focus should attach input queues before foregrounding KKTerm/the overlay and focusing the clicked or hosted ActiveX HWND",
  );
  assert.match(
    source,
    /let previous_focus = GetFocus\(\);[\s\S]*SetFocus\(Some\(focus\)\)[\s\S]*let resulting_focus = GetFocus\(\);[\s\S]*let set_focus_succeeded = resulting_focus == focus/,
    "RDP focus repair should verify the resulting focus instead of treating SetFocus's nullable previous-focus return as a success flag",
  );
  assert.match(
    source,
    /rdp_debug\(\s*"focus\.apply"[\s\S]*"setFocusSucceeded"[\s\S]*"previousFocusHwnd"[\s\S]*"resultingFocusHwnd"/,
    "RDP focus repair should log the focus outcome and the before/after HWNDs",
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
