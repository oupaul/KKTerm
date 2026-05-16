import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("github copilot support does not embed the copilot cli in the app bundle", async () => {
  const [cargoToml, cargoConfig] = await Promise.all([
    readFile(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8"),
    readFile(new URL("../.cargo/config.toml", import.meta.url), "utf8"),
  ]);

  const copilotDependency = cargoToml.match(/^github-copilot-sdk\s*=\s*[^\n]+/m)?.[0] ?? "";
  assert.ok(copilotDependency, "github-copilot-sdk dependency should remain explicit");
  assert.doesNotMatch(copilotDependency, /embedded-cli/);
  assert.doesNotMatch(cargoConfig, /COPILOT_CLI_VERSION/);
  assert.doesNotMatch(cargoConfig, /BUNDLED_CLI_CACHE_DIR/);
});
