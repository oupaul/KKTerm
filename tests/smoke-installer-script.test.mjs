import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const script = await readFile(
  new URL("../scripts/smoke-installer.ps1", import.meta.url),
  "utf8",
);

test("installer smoke test removes the per-user KKTerm registry key during cleanup", async () => {
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

test("smoke script detects a real per-user install before installing", () => {
  // Detection must read the product-scoped Apps & Features registration, which
  // identifies an existing install regardless of the temp /D= directory.
  assert.match(script, /function Get-ExistingRealInstall \{/);
  assert.match(
    script,
    /Uninstall\\KKTerm/,
    "should inspect the product uninstall registry key",
  );
  assert.match(
    script,
    /kkterm-installer-smoke-\*/,
    "should ignore stale registration left by a prior smoke run",
  );
});

test("smoke script skips the destructive install when a real install exists", () => {
  // The skip must come AFTER checksum verification (kept) but BEFORE the silent
  // install, so an existing dev install is never clobbered.
  const detectIdx = script.indexOf("$ExistingInstall = Get-ExistingRealInstall");
  const checksumIdx = script.indexOf("Installer checksum mismatch");
  const installIdx = script.indexOf("Silent installer smoke test");

  assert.ok(detectIdx !== -1, "detection call should exist");
  assert.ok(checksumIdx !== -1, "checksum verification should exist");
  assert.ok(installIdx !== -1, "silent install step should exist");
  assert.ok(
    checksumIdx < detectIdx && detectIdx < installIdx,
    "the existing-install guard must run after checksum and before the install",
  );
  assert.match(script, /Cleanup = "skipped \(existing install present\)"/);
});

test("smoke script exposes an override to force the full smoke locally", () => {
  assert.match(script, /\[switch\]\$AllowExistingInstall/);
  assert.match(script, /if \(-not \$AllowExistingInstall\) \{/);
});
