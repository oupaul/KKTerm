import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("tmux session list uses direct tmux metadata for previous-session clues", async () => {
  const sessionsSource = await readFile(new URL("../src-tauri/src/sessions.rs", import.meta.url), "utf8");
  const tauriSource = await readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8");
  const terminalSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sessionsSource, /#\{session_last_attached\}/);
  assert.match(sessionsSource, /#\{session_path\}/);
  assert.match(sessionsSource, /pub last_attached: Option<u64>/);
  assert.match(sessionsSource, /pub path: Option<String>/);

  assert.match(tauriSource, /lastAttached\?: number;/);
  assert.match(tauriSource, /path\?: string;/);

  assert.match(terminalSource, /formatTmuxSessionTimestamp\(session\.lastAttached\)/);
  assert.match(terminalSource, /session\.path \? <small className="tmux-session-path">\{session\.path\}<\/small> : null/);
  assert.doesNotMatch(
    terminalSource,
    /\{session\.windows\}w/,
    "tmux session rows should not spend space on window count",
  );
});
