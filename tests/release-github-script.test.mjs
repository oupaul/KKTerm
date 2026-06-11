import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const script = await readFile(new URL("../scripts/release-github.ps1", import.meta.url), "utf8");
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

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

test("release script validates source before mutating the version files", () => {
  // Guardrail: lint/type/test must run before the version bump, so a test
  // failure aborts on a pristine tree with nothing to roll back.
  const checkIdx = script.indexOf('@("run", "check")');
  const cargoTestIdx = script.indexOf(
    '@("test", "--manifest-path", "src-tauri/Cargo.toml")',
  );
  const versionBumpIdx = script.indexOf('@("version", $NextVersion');

  assert.ok(checkIdx !== -1, "npm run check step should exist");
  assert.ok(cargoTestIdx !== -1, "cargo test step should exist");
  assert.ok(versionBumpIdx !== -1, "npm version bump step should exist");
  assert.ok(
    checkIdx < versionBumpIdx && cargoTestIdx < versionBumpIdx,
    "validation must run before the version bump",
  );
});

test("release script rolls back local mutations when a release step fails", () => {
  assert.match(script, /function Undo-ReleaseMutations \{/);
  assert.match(script, /git reset --hard \$OriginalHead/);
  assert.match(script, /\$OriginalHead = \(git rev-parse HEAD\)/);
  // The mutate->publish region is wrapped so failures trigger the rollback.
  assert.match(script, /Undo-ReleaseMutations\s+`?\s*-OriginalHead/);
});

test("release script pushes the commit and tag atomically", () => {
  assert.match(
    script,
    /@\("push", "--atomic", \$Remote, "HEAD:\$Branch", \$TagName\)/,
  );
  // The two-step commit-then-tag push is gone.
  assert.doesNotMatch(script, /"push", \$Remote, \$TagName\)/);
});

test("release script detects a stale half-applied release up front", () => {
  assert.match(script, /\$TrackedVersionFiles = @\(/);
  assert.match(script, /git checkout -- \$ResetTargets/);
});

test("release script imports local env files without overriding existing environment", () => {
  assert.match(script, /function Import-LocalEnvFiles \{/);
  assert.match(script, /@\(.*"\.env\.local".*"\.env".*\)/s);
  assert.match(script, /Test-Path "Env:\$Name"/);
  assert.match(script, /Set-Item -Path "Env:\$Name" -Value \$Value/);
  assert.match(script, /Import-LocalEnvFiles -RootPath \$RepoRoot/);
});

test("both-arch release script delegates to release-github with IncludeArm64", async () => {
  const wrapper = await readFile(
    new URL("../scripts/release-github-both-arch.ps1", import.meta.url),
    "utf8",
  );

  assert.match(wrapper, /release-github\.ps1/);
  assert.match(wrapper, /IncludeArm64\s*=\s*\$true/);
  assert.doesNotMatch(wrapper, /package:installer:arm64/);
  assert.doesNotMatch(wrapper, /gh\s+release\s+create/);
  assert.doesNotMatch(wrapper, /git\s+push/);
  assert.equal(
    packageJson.scripts["release:github:both-arch"],
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-github-both-arch.ps1",
  );
});

test("both-arch release script forwards release switches explicitly", async () => {
  const wrapper = await readFile(
    new URL("../scripts/release-github-both-arch.ps1", import.meta.url),
    "utf8",
  );

  for (const switchName of [
    "Draft",
    "Prerelease",
    "DryRun",
    "SkipBuild",
    "SkipSmoke",
    "SkipAiReleaseNotes",
    "AllowDirty",
  ]) {
    assert.match(wrapper, new RegExp(`\\[switch\\]\\$${switchName}`));
    assert.match(wrapper, new RegExp(`if \\(\\$${switchName}\\)`));
    assert.match(
      wrapper,
      new RegExp(`\\$ForwardParams\\["${switchName}"\\] = \\$true`),
    );
  }
});
