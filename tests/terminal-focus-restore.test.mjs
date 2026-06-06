import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const terminalWorkspaceSource = await readFile(
  new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
  "utf8",
);
const tauriLibSource = await readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");
const tauriWrapperSource = await readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8");

test("terminal focus restore runs when Workspace becomes active again", () => {
  assert.match(
    terminalWorkspaceSource,
    /restoreFocusedTerminalPane\("workspace-activated"\)/,
    "switching back to the Workspace Module should restore text input focus to the focused terminal Pane",
  );
  assert.match(
    terminalWorkspaceSource,
    /requestAnimationFrame\(restore\)/,
    "Workspace activation focus restore should run after layout has settled",
  );
});

test("terminal focus restore does not run a delayed retry loop", () => {
  assert.doesNotMatch(
    terminalWorkspaceSource,
    /window\.setTimeout\(restore,\s*80\)/,
    "Focus restore must not schedule a forced delayed retry that can fight xterm textarea focus",
  );
});

test("terminal focus restore does not subscribe to native app-window activation", () => {
  assert.doesNotMatch(
    terminalWorkspaceSource,
    /listenMainWindowFocusChanged/,
    "TerminalWorkspace must not restore focus from every native window focus event",
  );
  assert.doesNotMatch(
    terminalWorkspaceSource,
    /window-activated/,
    "Window activation focus restore is disabled until a non-looping design is proven",
  );
  assert.doesNotMatch(
    terminalWorkspaceSource,
    /focusTerminalWindowAfterExternalActivation/,
    "TerminalWorkspace must not call the content-HWND focus repair path",
  );
});

test("terminal content HWND command is not registered", () => {
  assert.doesNotMatch(
    tauriLibSource,
    /focus_terminal_window_after_external_activation/,
    "Rust should not register the WebView2 content-HWND focus command",
  );
  assert.doesNotMatch(
    tauriWrapperSource,
    /focusTerminalWindowAfterExternalActivation|focus_terminal_window_after_external_activation/,
    "Frontend Tauri wrappers should not expose the WebView2 content-HWND focus command",
  );
});
