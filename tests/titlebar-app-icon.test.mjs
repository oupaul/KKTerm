import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("custom titlebar uses the bundled KKTerm app icon", async () => {
  const [titleBarSource, tauriConfigSource] = await Promise.all([
    readFile(new URL("../src/app/TitleBar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
  ]);
  const tauriConfig = JSON.parse(tauriConfigSource);

  assert.doesNotMatch(titleBarSource, /src=["']\/favicon\.svg["']/);
  assert.match(titleBarSource, /src-tauri\/icons\/32x32\.png/);
  assert.ok(
    tauriConfig.bundle.icon.includes("icons/32x32.png"),
    "the frontend titlebar icon should match a Tauri bundle icon asset",
  );
});

test("web favicon embeds the bundled KKTerm app icon", async () => {
  const [faviconSource, appIconBytes] = await Promise.all([
    readFile(new URL("../public/favicon.svg", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/icons/32x32.png", import.meta.url)),
  ]);
  const appIconBase64 = appIconBytes.toString("base64");

  assert.match(faviconSource, /<image\b/);
  assert.match(faviconSource, /href="data:image\/png;base64,/);
  assert.ok(
    faviconSource.includes(appIconBase64),
    "favicon.svg should embed the same 32x32 PNG used by the Tauri bundle",
  );
});
