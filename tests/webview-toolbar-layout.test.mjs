import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL toolbar title keeps side breathing room and truncates before crowding controls", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/webview.css", import.meta.url),
    "utf8",
  );
  const headerMatch = source.match(/\.webview-pane\s*>\s*header\s*\{(?<body>[^}]+)\}/);
  const match = source.match(/\.webview-pane\s*>\s*header\s*>\s*\.webview-title-center\s*\{(?<body>[^}]+)\}/);

  assert.ok(
    headerMatch?.groups?.body,
    "webview header CSS should own toolbar column sizing",
  );
  assert.match(headerMatch.groups.body, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*[^)]+\)\s+max-content;/);

  assert.ok(
    match?.groups?.body,
    "webview title CSS rule should be specific enough to override the generic terminal header span rule",
  );
  const body = match.groups.body;

  assert.match(body, /display:\s*block;/);
  assert.match(body, /width:\s*100%;/);
  assert.match(body, /justify-self:\s*center;/);
  assert.match(body, /padding:\s*0\s+[^;]+;/);
  assert.match(body, /box-sizing:\s*border-box;/);
  assert.match(body, /text-overflow:\s*ellipsis;/);
  assert.match(body, /white-space:\s*nowrap;/);

  const actionsMatch = source.match(/\.webview-pane\s+\.terminal-pane-actions\s*\{(?<body>[^}]+)\}/);
  assert.ok(actionsMatch?.groups?.body, "webview toolbar actions should have a local sizing rule");
  assert.match(actionsMatch.groups.body, /min-width:\s*max-content;/);
});

test("URL workspace clips native WebView2 bounds to its host panel", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../src/modules/workspace/connections/webview/webview.css", import.meta.url),
    "utf8",
  );

  assert.match(source, /function\s+webviewBoundsClipElement/);
  assert.match(source, /\.closest\("([^"]*,\s*)?\.dashboard-connection-pane/);
  assert.match(source, /\.closest\("([^"]*,\s*)?\.embedded-workspace-pane/);
  assert.match(source, /intersectClientRects\(rect,\s*clipRect\)/);

  const workspaceMatch = css.match(/\.webview-workspace\s*\{(?<body>[^}]+)\}/);
  assert.ok(workspaceMatch?.groups?.body, "webview workspace should have a local containment rule");
  assert.match(workspaceMatch.groups.body, /box-sizing:\s*border-box;/);
  assert.match(workspaceMatch.groups.body, /min-width:\s*0;/);
  assert.match(workspaceMatch.groups.body, /overflow:\s*hidden;/);
});
