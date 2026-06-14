import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: an SFTP / FTP / File Explorer browser docked as a sub-pane did not
// expand to the full width of its split cell, because .embedded-workspace-pane is
// a flex row and only `.terminal-workspace` had a stretch rule. `.sftp-workspace`
// (the file-browser surface) needs the same flex/width or it sizes to content.
test("embedded file-browser sub-panes stretch to fill the pane width", async () => {
  const css = await readFile(
    new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.embedded-workspace-pane\s*>\s*\.sftp-workspace\s*\{[^}]*flex:\s*1 1 0;[^}]*width:\s*100%;[^}]*\}/,
    ".embedded-workspace-pane > .sftp-workspace must set flex: 1 1 0 and width: 100%",
  );
});
