import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backend bounds updates do not re-show hidden URL WebView sessions", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  assert.match(source, /struct WebviewSession/);
  assert.match(source, /visible: bool/);
  assert.match(source, /if session\.visible\s*\{\s*show_webview/);
  assert.match(source, /session\.visible = false;/);
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

test("backend can keep multiple child URL WebViews visible at once", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  const visibilityFunction = source.match(
    /pub fn set_visibility\(&self, request: SetWebviewVisibilityRequest\) -> Result<\(\), String> \{[\s\S]*?\n    pub fn navigate/,
  )?.[0];

  assert.ok(visibilityFunction, "set_visibility should exist");
  assert.doesNotMatch(
    visibilityFunction,
    /hide_other|for \(other_session_id, other_session\) in sessions\.iter_mut\(\)/,
    "showing one URL WebView must not hide another visible URL WebView",
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

test("backend parks hidden child WebViews offscreen instead of relying on DOM visibility", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  assert.match(source, /const HIDDEN_WEBVIEW_POSITION: f64 = -32_000\.0;/);
  assert.match(source, /fn hide_webview[\s\S]*?HIDDEN_WEBVIEW_POSITION[\s\S]*?LogicalSize::new\(1\.0, 1\.0\)/);
  assert.doesNotMatch(source, /fn hide_webview[\s\S]*?\.hide\(\)/);
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
