import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/workspace/connections/terminal/TerminalRecordingsDialog.tsx", import.meta.url),
  "utf8",
);
const css = await readFile(
  new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
  "utf8",
);

test("recording names open the built-in editor in a nested modal instead of a Workspace Tab", () => {
  assert.match(source, /function TerminalRecordingViewerDialog/);
  assert.match(source, /zClassName="kk-qc-subdialog"/);
  assert.match(source, /<FileViewerWorkspace embeddedDialog isActive tab=\{tab\} \/>/);
  assert.doesNotMatch(source, /openFileViewerPath/);
});

test("a live recording path is forwarded for initial selection without becoming a host filter", () => {
  assert.match(source, /initialRecordingPath=\{browser\.initialRecordingPath\}/);
  assert.match(source, /setSelected\(new Set\(\[initialRecordingId\]\)\)/);
});

test("the recording browser uses an explicit pointer resize handle instead of WebView CSS resizing", () => {
  assert.match(source, /function TerminalRecordingsDialogResizeHandle/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /--terminal-recordings-dialog-width/);
  assert.match(css, /\.terminal-recordings-dialog-resizer/);
  assert.doesNotMatch(css, /\.terminal-recordings-dialog\s*\{[^}]*resize:\s*both/s);
});
