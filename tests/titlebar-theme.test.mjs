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

test("custom titlebar matches the default Windows title height", async () => {
  const appCssSource = await readFile(
    new URL("../src/app/app.css", import.meta.url),
    "utf8",
  );

  assert.match(appCssSource, /--app-titlebar-height:\s*31px;/);
  assert.match(
    appCssSource,
    /\.app-titlebar\s*\{[^}]*box-sizing:\s*border-box;[^}]*height:\s*var\(--app-titlebar-height\)/s,
    "the titlebar border should be included in the fixed Windows-height row",
  );
});
