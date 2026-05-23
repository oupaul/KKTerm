import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL toolbar includes an open externally button for the current address", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ExternalLink/);
  assert.match(source, /function handleOpenExternal\(\)/);
  assert.match(source, /openExternalUrl\(addressInput\)/);
  assert.match(source, /aria-label=\{t\("webview\.openExternally"\)\}/);
  assert.match(source, /title=\{t\("webview\.openExternally"\)\}/);
});
