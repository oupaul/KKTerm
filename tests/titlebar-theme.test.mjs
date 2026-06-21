import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("custom titlebar inherits the same color scheme as the activity rail", async () => {
  const [appSource, appCssSource] = await Promise.all([
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/app.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    appSource,
    /data-color-scheme=\{appliedColorScheme\}/,
    "the app root should carry the active color scheme so titlebar and shell share tokens",
  );
  assert.match(
    appCssSource,
    /\.app-titlebar\s*\{[^}]*background:\s*var\(--nav-toolbar-bg\)/s,
    "custom titlebar should use the navigation toolbar background token",
  );
  assert.match(
    appCssSource,
    /\.activity-rail\s*\{[^}]*background:\s*var\(--nav-toolbar-bg\)/s,
    "activity rail should use the same navigation toolbar background token",
  );
});

test("custom titlebar is always rendered by the frontend shell", async () => {
  const [appSource, appCssSource] = await Promise.all([
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/app.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /<TitleBar\b/);
  assert.doesNotMatch(appSource, /useCustomTitleBar/);
  assert.doesNotMatch(appCssSource, /app-root--no-titlebar/);
});

test("custom titlebar panel buttons match module scope", async () => {
  const [appSource, titleBarSource] = await Promise.all([
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/TitleBar.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(
    appSource,
    /<TitleBar[\s\S]*?activePage=\{activePage\}/,
    "TitleBar should know the active Module before rendering module-scoped controls",
  );
  assert.match(
    titleBarSource,
    /activePage === "workspace"/,
    "the Connections panel titlebar toggle should only render inside Workspace",
  );
  assert.match(
    titleBarSource,
    /<Bot size=\{15\} strokeWidth=\{1\.8\} \/>/,
    "the AI Assistant titlebar toggle should use the robot icon",
  );
});

test("collapsed AI Assistant strip is hidden when the titlebar toggle is available", async () => {
  const [appSource, layoutSource, effectsSource] = await Promise.all([
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/workspaceChromeLayout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/appShellEffects.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    appSource,
    /showCollapsedTab=\{false\}/,
    "App should hide the right collapsed strip because the custom titlebar can reopen the panel",
  );
  assert.match(
    layoutSource,
    /collapsed && !showCollapsedTab[\s\S]*?<div[\s\S]*?aria-hidden="true"/,
    "the hidden collapsed strip should not leave a focusable button behind",
  );
  assert.match(
    effectsSource,
    /--ai-resize-width", aiPanelLayout\.collapsed \? "0px" : "3px"/,
    "the AI resize grid column should collapse to zero width with the strip hidden",
  );
});

test("main Tauri window starts without native decorations by default", async () => {
  // The main window is created in Rust (so RDP/WebView2 stability browser args
  // can be applied per launch), not declared in tauri.conf.json. Verify the
  // config no longer declares a window and the Rust builder removes decorations.
  const [tauriConfigSource, libSource] = await Promise.all([
    readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8"),
  ]);
  const tauriConfig = JSON.parse(tauriConfigSource);

  assert.deepEqual(
    tauriConfig.app.windows,
    [],
    "the main window is built in Rust, so config should not declare one",
  );
  assert.match(
    libSource,
    /WebviewWindowBuilder::new\([\s\S]*?\.decorations\(false\)/,
    "the Rust-built main window should start without native decorations",
  );
});

test("custom titlebar matches the native Windows title height", async () => {
  const appCssSource = await readFile(
    new URL("../src/app/app.css", import.meta.url),
    "utf8",
  );

  assert.match(appCssSource, /--app-titlebar-height:\s*23px;/);
  assert.match(
    appCssSource,
    /\.app-titlebar\s*\{[^}]*box-sizing:\s*border-box;[^}]*height:\s*var\(--app-titlebar-height\)/s,
    "the titlebar border should be included in the fixed Windows-height row",
  );
});

test("custom titlebar controls stay anchored to the visible viewport", async () => {
  const appCssSource = await readFile(
    new URL("../src/app/app.css", import.meta.url),
    "utf8",
  );

  const appRootRule = appCssSource.match(/\.app-root\s*\{(?<body>[^}]*)\}/s);
  const appShellRule = appCssSource.match(/\.app-shell\s*\{(?<body>[^}]*)\}/s);
  const appShellAnimatingRule = appCssSource.match(
    /\.app-shell\.panel-animating\s*\{(?<body>[^}]*)\}/s,
  );
  const controlsRule = appCssSource.match(
    /\.app-titlebar-controls\s*\{(?<body>[^}]*)\}/s,
  );
  const buttonRule = appCssSource.match(
    /\.app-titlebar-button\s*\{(?<body>[^}]*)\}/s,
  );

  assert.ok(appRootRule?.groups?.body, "app-root CSS rule should exist");
  assert.ok(appShellRule?.groups?.body, "app-shell CSS rule should exist");
  assert.ok(
    appShellAnimatingRule?.groups?.body,
    "app-shell panel animation CSS rule should exist",
  );
  assert.ok(
    controlsRule?.groups?.body,
    "titlebar controls CSS rule should exist",
  );
  assert.ok(buttonRule?.groups?.body, "titlebar button CSS rule should exist");
  assert.doesNotMatch(
    appRootRule.groups.body,
    /\bmin-width\s*:/,
    "the root titlebar row should not be widened past the visible viewport",
  );
  assert.doesNotMatch(
    appShellRule.groups.body,
    /\bmin-width\s*:/,
    "the workspace shell should shrink with the viewport so focusing the AI Assistant composer cannot scroll the Activity Rail off-screen",
  );
  assert.doesNotMatch(
    appShellAnimatingRule.groups.body,
    /\bgrid-template-columns\b/,
    "panel toggles should not animate the whole shell grid because that can jiggle the Activity Rail and Connections Panel",
  );
  assert.match(
    controlsRule.groups.body,
    /\bposition:\s*absolute;/,
    "the window controls cluster should be positioned independently of title text layout",
  );
  assert.match(
    controlsRule.groups.body,
    /\bright:\s*0;/,
    "the window controls cluster should stay anchored to the visible right edge",
  );
  assert.match(
    controlsRule.groups.body,
    /\bflex:\s*0\s+0\s+auto;/,
    "the window controls cluster should not shrink away from the right edge",
  );
  assert.match(
    buttonRule.groups.body,
    /\bflex:\s*0\s+0\s+46px;/,
    "each window control should preserve its fixed hit target width",
  );
});
