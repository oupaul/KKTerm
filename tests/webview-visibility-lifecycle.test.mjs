import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backend URL sessions use stable overlay WebviewWindows", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  assert.match(source, /Embedded URL-browser backend/);
  assert.match(source, /WebviewWindowBuilder::new/);
  assert.match(source, /\.owner\(&host_window\)/);
  assert.match(source, /\.skip_taskbar\(true\)/);
  assert.match(source, /\.visible\(false\)/);
  assert.match(source, /fn show_webview_window/);
  assert.doesNotMatch(source, /tauri_plugin_opener|open_url\(/);
  assert.doesNotMatch(source, /WebviewBuilder::new|\.add_child\(|\.build_as_child\(/);
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

test("backend URL visibility commands track hidden overlay state", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  const visibilityFunction = source.match(
    /pub fn set_visibility\(&self, request: SetWebviewVisibilityRequest\) -> Result<\(\), String> \{[\s\S]*?\n    pub fn focus/,
  )?.[0];

  assert.ok(visibilityFunction, "set_visibility should exist");
  assert.match(visibilityFunction, /show_webview\(session/);
  assert.match(visibilityFunction, /session\.visible = true;/);
  assert.match(visibilityFunction, /hide_webview\(&session\.window\)/);
  assert.match(visibilityFunction, /session\.visible = false;/);
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

test("backend hides overlay URL WebViews instead of using unstable child APIs", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");

  assert.match(source, /const HIDDEN_WEBVIEW_POSITION: f64 = -32_000\.0;/);
  assert.match(source, /fn hide_webview[\s\S]*?\.hide\(\)/);
  assert.match(source, /fn overlay_rect/);
  assert.doesNotMatch(source, /Window::add_child|\.add_child\(|\.build_as_child\(/);
});

test("backend realizes hidden URL overlay windows before HWND-dependent no-activate show", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");
  const showFunction = source.match(/fn show_webview_window\(window: &WebviewWindow\) -> Result<\(\), String> \{[\s\S]*?\n\}/)?.[0];

  assert.ok(showFunction, "Windows show_webview_window should exist");
  assert.match(showFunction, /match window\.hwnd\(\)/);
  assert.match(showFunction, /window\s*\.show\(\)/);
  assert.match(showFunction, /failed to get URL webview HWND after realize/);
  assert.match(showFunction, /SW_SHOWNOACTIVATE/);
  assert.match(showFunction, /SWP_NOACTIVATE/);
});

test("backend positions URL overlays from the host WebView client origin", async () => {
  const source = await readFile(new URL("../src-tauri/src/webview.rs", import.meta.url), "utf8");
  const overlayFunction = source.match(/fn overlay_rect\([\s\S]*?\n\}/)?.[0];

  assert.ok(overlayFunction, "overlay_rect should exist");
  assert.match(overlayFunction, /inner_position\(\)/);
  assert.doesNotMatch(
    overlayFunction,
    /outer_position\(\)/,
    "DOM client coordinates should be offset from the host WebView content origin",
  );
});

test("frontend repushes URL overlay bounds on native window move", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const repushOnNativeMove = \(\) => \{/);
  assert.match(source, /lastBoundsRef\.current = null;/);
  assert.match(source, /listen\("tauri:\/\/move", repushOnNativeMove\)/);
  assert.match(source, /listen\("tauri:\/\/resize", repushOnNativeMove\)/);
});

test("frontend opens target blank URL navigations in new Workspace Tabs", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const listener = source.match(/listen<WebviewNewWindowEvent>\("webview-new-window",[\s\S]*?\),\r?\n      listen<WebviewTitleChangedEvent>/)?.[0];

  assert.ok(listener, "webview-new-window listener should exist");
  assert.match(source, /const openUrlInNewTab = useWorkspaceStore/);
  assert.match(listener, /openUrlInNewTab\(tab\.connection,\s*event\.payload\.url/);
  assert.doesNotMatch(
    listener,
    /webview_navigate/,
    "target=_blank should not silently replace the current URL Session",
  );
});

test("store creates top-level WebView Tabs for URL new-tab launches", async () => {
  const source = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");
  const openUrlInNewTab = source.match(/openUrlInNewTab: \(connection, url, options\) => \{[\s\S]*?\r?\n  \},\r?\n  openChildConnectionInNewTab/)?.[0];
  const openConnectionInNewTab = source.match(/openConnectionInNewTab: \(connection, options\) => \{[\s\S]*?\r?\n  \},\r?\n  openUrlInNewTab/)?.[0];
  const openUrlConnection = source.match(/openUrlConnection: \(connection\) => \{[\s\S]*?openSshPortForwardBrowser/)?.[0];

  assert.ok(openUrlInNewTab, "openUrlInNewTab action should exist");
  assert.ok(openConnectionInNewTab, "openConnectionInNewTab action should exist");
  assert.ok(openUrlConnection, "openUrlConnection action should exist");
  assert.match(openConnectionInNewTab, /connection\.type === "url"[\s\S]*?get\(\)\.openUrlInNewTab/);
  assert.match(openUrlInNewTab, /kind: "webview"/);
  assert.match(openUrlInNewTab, /panes: \[\]/);
  assert.match(openUrlInNewTab, /url: nextUrl/);
  assert.match(openUrlConnection, /kind: "webview"/);
  assert.doesNotMatch(openUrlConnection, /kind: "terminal"/);
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
