import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("RDP overlay mouse activation keeps the no-activate overlay policy", async () => {
  const source = await readFile(new URL("../src-tauri/src/rdp.rs", import.meta.url), "utf8");
  const shim = source.match(/fn rdp_overlay_subclass_proc[\s\S]*?fn install_rdp_overlay_focus_subclass/)?.[0] ?? "";

  assert.match(shim, /WM_MOUSEACTIVATE/, "RDP focus shim should handle WM_MOUSEACTIVATE");
  assert.match(shim, /SetForegroundWindow\(owner\)/, "RDP focus shim should foreground the owner window");
  assert.match(shim, /SetFocus\(Some\(hwnd\)\)/, "RDP focus shim should focus the RDP control");
  assert.match(
    shim,
    /const MA_NOACTIVATE:\s*isize\s*=\s*3;/,
    "RDP focus shim should allow the click through without activating the WS_EX_NOACTIVATE overlay",
  );
  assert.doesNotMatch(
    shim,
    /LRESULT\(MA_ACTIVATE\)/,
    "RDP focus shim must not activate the overlay window while preserving keyboard focus",
  );
});
