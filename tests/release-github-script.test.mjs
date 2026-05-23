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
