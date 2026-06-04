import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("status bar uses rail-style native tooltips for Don't Sleep and X server", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \{ RailTooltip \} from "\.\.\/\.\.\/app\/RailTooltip";/);
  assert.match(source, /<RailTooltip label=\{t\("app\.dontSleep"\)\} \/>/);
  assert.match(source, /<RailTooltip label=\{t\("app\.xServer"\)\} \/>/);
  assert.doesNotMatch(source, /dont-sleep-status-tooltip/);
  assert.doesNotMatch(source, /x-server-status-tooltip/);
});

test("X server status icon opens native Restart and Stop menu", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
    "utf8",
  );
  const locale = JSON.parse(
    await readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  );

  assert.match(source, /showNativeContextMenu/);
  assert.match(source, /onContextMenu=\{\(event\) => void handleContextMenu\(event\)\}/);
  assert.match(source, /label: t\("app\.xServerRestart"\)/);
  assert.match(source, /invokeCommand\("restart_ssh_x_server"\)/);
  assert.match(source, /label: t\("app\.xServerStop"\)/);
  assert.match(source, /invokeCommand\("stop_ssh_x_server"\)/);
  assert.equal(locale.app.xServer, "X Server");
  assert.equal(locale.app.xServerRestart, "Restart");
  assert.equal(locale.app.xServerStop, "Stop");
});
