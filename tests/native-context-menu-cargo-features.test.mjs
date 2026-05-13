import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("tauri enables png image support for native menu icons", async () => {
  const cargoToml = await readFile(
    new URL("../src-tauri/Cargo.toml", import.meta.url),
    "utf8",
  );

  const tauriDependency = cargoToml.match(/^tauri\s*=\s*\{[^\n]+\}/m)?.[0] ?? "";
  assert.match(tauriDependency, /"image-png"/);
});
