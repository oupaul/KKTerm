import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workspace = fs.readFileSync(
  new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
  "utf8",
);
const layout = fs.readFileSync(new URL("../src/modules/workspace/layout.ts", import.meta.url), "utf8");
const backend = fs.readFileSync(new URL("../src-tauri/src/sessions.rs", import.meta.url), "utf8");

test("terminal text encoding is per Pane, persisted, and applied bidirectionally", () => {
  assert.match(workspace, /textEncoding: normalizeTerminalEncoding\(pane\.textEncoding\)/);
  assert.match(workspace, /invokeCommand\("set_terminal_encoding"/);
  assert.match(layout, /textEncoding: "textEncoding" in pane \? pane\.textEncoding : undefined/);
  assert.match(backend, /encoding\.encode\(&input\)/);
  assert.match(backend, /TerminalOutputDecoder::new\(encoding\)/);
});
