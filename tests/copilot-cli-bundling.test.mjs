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
  assert.match(
    copilotDependency,
    /default-features\s*=\s*false/,
    "github-copilot-sdk must keep the bundled-cli feature off",
  );
  assert.doesNotMatch(cargoConfig, /COPILOT_CLI_VERSION/);
  assert.doesNotMatch(cargoConfig, /BUNDLED_CLI_CACHE_DIR/);
  // KKTerm calls the Copilot CLI externally; the SDK build script must not
  // download/extract a CLI into the build machine's cache (which is absent on
  // end users' machines). See src-tauri/src/ai.rs::resolve_copilot_cli.
  assert.match(
    cargoConfig,
    /COPILOT_SKIP_CLI_DOWNLOAD\s*=\s*"1"/,
    "COPILOT_SKIP_CLI_DOWNLOAD must stay set so the CLI is never fetched at build time",
  );
});
