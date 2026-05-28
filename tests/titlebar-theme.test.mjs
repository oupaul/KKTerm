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
    /data-color-scheme=\{appearanceSettings\.colorScheme\}/,
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

test("main Tauri window starts without native decorations by default", async () => {
  const tauriConfigSource = await readFile(
    new URL("../src-tauri/tauri.conf.json", import.meta.url),
    "utf8",
  );
  const tauriConfig = JSON.parse(tauriConfigSource);

  assert.equal(tauriConfig.app.windows[0].decorations, false);
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
  const controlsRule = appCssSource.match(
    /\.app-titlebar-controls\s*\{(?<body>[^}]*)\}/s,
  );
  const buttonRule = appCssSource.match(
    /\.app-titlebar-button\s*\{(?<body>[^}]*)\}/s,
  );

  assert.ok(appRootRule?.groups?.body, "app-root CSS rule should exist");
  assert.ok(appShellRule?.groups?.body, "app-shell CSS rule should exist");
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
  assert.match(
    appShellRule.groups.body,
    /\bmin-width:\s*1120px;/,
    "the workspace shell keeps the desktop minimum width below the titlebar",
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
