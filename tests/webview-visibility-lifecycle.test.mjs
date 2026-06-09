import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backend URL sessions are stubbed instead of managing child WebViews", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  assert.match(source, /Embedded URL-browser backend/);
  assert.match(source, /open_url\(url\.to_string\(\), None::<&str>\)/);
  assert.match(source, /pub fn update_bounds\(&self, _request: UpdateWebviewBoundsRequest\) -> Result<\(\), String> \{\s*Ok\(\(\)\)\s*\}/);
  assert.match(source, /pub fn set_visibility\(&self, _request: SetWebviewVisibilityRequest\) -> Result<\(\), String> \{\s*Ok\(\(\)\)\s*\}/);
  assert.doesNotMatch(source, /use tauri::\{[\s\S]*WebviewBuilder/);
  assert.doesNotMatch(source, /WebviewBuilder::new|\.add_child\(|\.build_as_child\(/);
  assert.doesNotMatch(source, /fn show_webview|fn hide_webview/);
});

test("frontend URL WebView runtime session ids stay within backend limits", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /function createWebviewSessionId/);
  assert.match(source, /useRef<string>\(createWebviewSessionId\(\)\)/);
  assert.doesNotMatch(
    source,
    /`webview-\$\{tab\.id\}/,
    "backend WebView session ids should not include variable-length tab ids",
  );
});

test("backend URL visibility commands remain no-op stubs", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  const visibilityFunction = source.match(
    /pub fn set_visibility\(&self, _request: SetWebviewVisibilityRequest\) -> Result<\(\), String> \{[\s\S]*?\n    pub fn focus/,
  )?.[0];

  assert.ok(visibilityFunction, "set_visibility should exist");
  assert.match(visibilityFunction, /Ok\(\(\)\)/);
  assert.doesNotMatch(
    visibilityFunction,
    /show_webview|hide_webview|sessions\.get|sessions\.insert/,
    "stubbed URL visibility should not manage native child WebView sessions",
  );
});

test("Dashboard catalog dialog suppresses embedded URL Connection WebViews", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/nativeOverlay.ts", import.meta.url),
    "utf8",
  );

  const webviewSelector = source.match(/const WEBVIEW_BLOCKING_OVERLAY_SELECTOR = \[[\s\S]*?\]\.join/)?.[0];

  assert.ok(webviewSelector, "WebView blocking overlay selector should exist");
  assert.match(webviewSelector, /\.dw-catalog-backdrop/);
});

test("backend no longer parks child URL WebViews offscreen", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  assert.doesNotMatch(source, /const HIDDEN_WEBVIEW_POSITION/);
  assert.doesNotMatch(source, /LogicalPosition|LogicalSize/);
  assert.doesNotMatch(source, /fn hide_webview|fn show_webview/);
});

test("Dashboard background picker directly suppresses embedded URL Connection widgets", async () => {
  const page = await readFile(new URL("../src/modules/dashboard/DashboardPage.tsx", import.meta.url), "utf8");
  const canvas = await readFile(new URL("../src/modules/dashboard/view/DashboardCanvas.tsx", import.meta.url), "utf8");
  const frame = await readFile(new URL("../src/modules/dashboard/view/WidgetFrame.tsx", import.meta.url), "utf8");
  const body = await readFile(new URL("../src/modules/dashboard/view/WidgetBody.tsx", import.meta.url), "utf8");
  const registry = await readFile(new URL("../src/modules/dashboard/registry/builtInRegistry.ts", import.meta.url), "utf8");
  const connectionWidget = await readFile(
    new URL("../src/modules/dashboard/widgets/builtin/connections/ConnectionWidget.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /suppressNativeWebviews=\{backgroundOpen\}/);
  assert.match(canvas, /suppressNativeWebviews: boolean;/);
  assert.match(frame, /suppressNativeWebviews: boolean;/);
  assert.match(body, /suppressNativeWebviews: boolean;/);
  assert.match(registry, /suppressNativeWebviews: boolean;/);
  assert.match(connectionWidget, /isViewActive && !suppressNativeWebviews/);
});
