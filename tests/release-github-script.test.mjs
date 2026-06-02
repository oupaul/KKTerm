import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const script = await readFile(new URL("../scripts/release-github.ps1", import.meta.url), "utf8");

test("release script lists version tags instead of treating v-star as a tag name", () => {
  assert.match(script, /git tag --list "v\*" --sort=-v:refname/);
  assert.doesNotMatch(script, /git tag --sort=-v:refname "v\*"/);
});

test("release script updates tauri config without inline node argument quoting", () => {
  const match = script.match(/function Set-TauriConfigVersion \{[\s\S]*?\n\}/);
  assert.ok(match, "Set-TauriConfigVersion function should exist");
  const functionBody = match[0];

  assert.match(functionBody, /ConvertFrom-Json/);
  assert.match(functionBody, /ConvertTo-Json/);
  assert.doesNotMatch(functionBody, /node"\s*-ArgumentList @\("-e"/);
});

test("release script writes version files as utf8 without bom", () => {
  assert.match(script, /function Set-TextFileUtf8NoBom \{/);
  assert.match(script, /New-Object System\.Text\.UTF8Encoding\(\$false\)/);
  assert.match(script, /\[System\.IO\.File\]::WriteAllText\(\$Path, \$Value, \$Utf8NoBom\)/);

  const tauriMatch = script.match(/function Set-TauriConfigVersion \{[\s\S]*?\n\}/);
  assert.ok(tauriMatch, "Set-TauriConfigVersion function should exist");
  assert.match(tauriMatch[0], /Set-TextFileUtf8NoBom/);
  assert.doesNotMatch(tauriMatch[0], /Set-Content[\s\S]*-Encoding UTF8/);
});

test("release script stages Cargo.lock with Rust version files", () => {
  assert.match(script, /"src-tauri\/Cargo\.toml", "src-tauri\/Cargo\.lock"/);
});

test("release script can also build and publish the ARM64 installer", () => {
  // Opt-in switch keeps the default x64-only release unchanged.
  assert.match(script, /\[switch\]\$IncludeArm64/);
  // ARM64 build provisions its toolchain via the dedicated packaging script.
  assert.match(
    script,
    /"run", "package:installer:arm64", "--", "-InstallMissing"/,
  );
  // ARM64 assets follow the windows-arm64 naming convention and are appended
  // to the release asset list only when requested.
  assert.match(script, /kkterm-\$NextVersion-\$Arm64Triple-setup\.exe/);
  assert.match(script, /if \(\$IncludeArm64\) \{\s*\$ReleaseAssets \+= /);
  // The GitHub upload args are built from the asset list, not hardcoded, so the
  // ARM64 artifacts ride along when present.
  assert.match(script, /\$GhArgs \+= \$ReleaseAssets/);
});
