import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL toolbar renders a close button only when a close handler is provided", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /onClose\?:\s*\(\)\s*=>\s*void/);
  assert.match(source, /\{onClose \?/);
  assert.match(source, /className="terminal-pane-action webview-close-action"/);
  assert.match(source, /onClick=\{onClose\}/);
  assert.match(source, /aria-label=\{t\("workspace\.closeTab", \{ title: tab\.title \}\)\}/);
});

test("WorkspaceCanvas wires the URL close button to closeTab only when the tab strip is hidden", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/WorkspaceCanvas.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const closeTab = useWorkspaceStore\(\(state\) => state\.closeTab\);/);
  assert.match(
    source,
    /const hideTopTabButtons = useWorkspaceStore\(\(state\) => state\.generalSettings\.hideTopTabButtons\);/,
  );
  assert.match(source, /onClose=\{hideTopTabButtons \? \(\) => closeTab\(tab\.id\) : undefined\}/);
});
