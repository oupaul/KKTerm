import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("RDP Settings resolution selector hides obsolete smart sizing and DPI zoom modes", async () => {
  const source = await readFile(
    new URL("../src/modules/settings/RdpSettings.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /<option value="smartSizing"/);
  assert.doesNotMatch(source, /<option value="dpiZoom"/);
  assert.doesNotMatch(source, /rdpRemoteResolutionSmartSizing|rdpRemoteResolutionDpiZoom/);
});

test("RDP Connection properties resolution selector hides obsolete smart sizing and DPI zoom modes", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /<option value="smartSizing"/);
  assert.doesNotMatch(source, /<option value="dpiZoom"/);
  assert.doesNotMatch(source, /rdpRemoteResolutionSmartSizing|rdpRemoteResolutionDpiZoom/);
});
