import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL toolbar site logo is an unframed transparent identity mark", async () => {
  const css = await readFile(
    new URL("../src/modules/workspace/connections/webview/webview.css", import.meta.url),
    "utf8",
  );
  const iconRule = css.match(/\.webview-conn-icon\s*\{(?<body>[^}]+)\}/);
  const imageRule = css.match(/\.webview-conn-icon\s+img\s*\{(?<body>[^}]+)\}/);

  assert.ok(iconRule?.groups?.body, "URL toolbar connection icon rule should exist");
  assert.match(iconRule.groups.body, /background:\s*transparent;/);
  assert.match(iconRule.groups.body, /box-shadow:\s*none;/);
  assert.doesNotMatch(iconRule.groups.body, /var\(--surface-muted\)/);
  assert.doesNotMatch(iconRule.groups.body, /var\(--border\)/);

  assert.ok(imageRule?.groups?.body, "URL toolbar favicon image rule should exist");
  assert.match(imageRule.groups.body, /border-radius:\s*0;/);
});

test("URL overlay bounds round outward so the browser fills its host frame", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const boundsFunction = source.match(/function boundsFromVisibleRect[\s\S]*?\n\}/)?.[0];
  const computeBounds = source.match(/const computeBounds = \(\) => \{[\s\S]*?\n  \};/)?.[0];

  assert.ok(boundsFunction, "URL WebView should centralize DOM-to-native bounds rounding");
  assert.match(boundsFunction, /Math\.floor\(rect\.left\)/);
  assert.match(boundsFunction, /Math\.floor\(rect\.top\)/);
  assert.match(boundsFunction, /Math\.ceil\(rect\.right\)/);
  assert.match(boundsFunction, /Math\.ceil\(rect\.bottom\)/);
  assert.doesNotMatch(boundsFunction, /Math\.round/);

  assert.ok(computeBounds, "URL WebView should compute native bounds from the visible browser rect");
  assert.match(computeBounds, /boundsFromVisibleRect\(visibleRect\)/);
});
