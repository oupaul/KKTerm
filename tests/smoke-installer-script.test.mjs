import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("installer smoke test removes the per-user KKTerm registry key during cleanup", async () => {
  const script = await readFile(
    new URL("../scripts/smoke-installer.ps1", import.meta.url),
    "utf8",
  );

  assert.match(
    script,
    /\$SmokeRegistryKey\s*=\s*"Registry::HKEY_CURRENT_USER\\Software\\Ryan Tsai\\KKTerm"/,
  );
  assert.match(script, /Remove-SmokeRegistryKey/);
  assert.match(
    script,
    /finally\s*\{[\s\S]*Remove-SmokeRegistryKey[\s\S]*\}/,
  );
  assert.match(
    script,
    /Remove-Item\s+-LiteralPath\s+\$SmokeRegistryKey\s+-Recurse\s+-Force/,
  );
});
