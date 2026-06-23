import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL WebView Shift-click opens http links externally through the title bridge", async () => {
  const rustSource = await readFile(
    new URL("../src-tauri/src/webview.rs", import.meta.url),
    "utf8",
  );
  const workspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(rustSource, /__KKTERM_URL_EXTERNAL_LINK__/);
  assert.match(rustSource, /event\.shiftKey/);
  assert.match(rustSource, /event\.preventDefault\(\)/);
  assert.match(rustSource, /new URL\(anchor\.getAttribute\("href"\), window\.location\.href\)/);
  assert.match(rustSource, /protocol !== "http:" && url\.protocol !== "https:"/);
  assert.match(rustSource, /token: BRIDGE_TOKEN/);

  assert.match(workspaceSource, /openExternalUrl/);
  assert.match(workspaceSource, /EXTERNAL_LINK_TITLE_PREFIX/);
  assert.match(workspaceSource, /payload\.token !== expectedToken/);
  assert.match(workspaceSource, /openExternalUrl\(externalUrl\)/);
});
