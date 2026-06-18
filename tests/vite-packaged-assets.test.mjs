import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Vite emits relative asset URLs for packaged Tauri webviews", async () => {
  const source = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

  assert.match(source, /base:\s*["']\.\/["']/);
});

test("Tauri asset scope covers user-writable media on every platform", async () => {
  const source = await readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8");
  const config = JSON.parse(source);
  const scope = config.app.security.assetProtocol.scope;

  // Custom fonts and dashboard backgrounds share the same per-platform storage:
  // macOS/Linux bundles are read-only, so media lives under the writable
  // app-data directory ($APPDATA/<dir>); Windows keeps it next to the per-user
  // executable, which $RESOURCE resolves to. Both scopes are required so
  // convertFileSrc() avoids a 403 on the platform each covers.
  for (const dir of ["fonts", "backgrounds"]) {
    assert.ok(
      scope.includes(`$APPDATA/${dir}/**/*`),
      `macOS/Linux ${dir} live under the app-data dir, which $APPDATA covers`,
    );
    assert.ok(
      scope.includes(`$RESOURCE/${dir}/**/*`),
      `Windows ${dir} resolve through $RESOURCE; keep it so direct-child files are not rejected with 403`,
    );
  }
});
