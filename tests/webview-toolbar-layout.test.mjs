import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL toolbar nav region truncates before crowding the controls", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/webview.css", import.meta.url),
    "utf8",
  );
  // The header is a two-column grid: a flexible nav region (icon, nav cluster,
  // address bar) and a content-sized actions column. The flexible column must be
  // allowed to shrink to zero so the address bar truncates instead of pushing the
  // controls off the edge.
  const headerMatch = source.match(/\.webview-pane\s*>\s*header\s*\{(?<body>[^}]+)\}/);
  assert.ok(
    headerMatch?.groups?.body,
    "webview header CSS should own toolbar column sizing",
  );
  assert.match(headerMatch.groups.body, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content;/);
  assert.match(headerMatch.groups.body, /overflow:\s*hidden;/);

  // The nav region is the shrinkable side: it clips its overflow so the address
  // bar can collapse rather than crowd the action buttons.
  const navMatch = source.match(/\.webview-nav-group\s*\{(?<body>[^}]+)\}/);
  assert.ok(navMatch?.groups?.body, "webview nav group should have a local sizing rule");
  assert.match(navMatch.groups.body, /min-width:\s*0;/);
  assert.match(navMatch.groups.body, /overflow:\s*hidden;/);

  // The actions column never shrinks below the buttons' intrinsic width.
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
