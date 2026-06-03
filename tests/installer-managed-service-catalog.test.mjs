import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(
  await readFile(new URL("../installer/catalog.v1.json", import.meta.url), "utf8"),
);
const byId = new Map(catalog.recipes.map((recipe) => [recipe.id, recipe]));

test("NSSM is a Utilities tool for managed Windows service helpers", () => {
  const nssm = byId.get("nssm");

  assert.ok(nssm, "NSSM should be present in the installer catalog");
  assert.equal(nssm.category, "utilities");
  assert.deepEqual(nssm.provider, { kind: "winget", id: "NSSM.NSSM" });
});

test("NSSM is visible in the Installer Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerPage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"nssm"/,
    "NSSM should be listed in the visible Utilities section",
  );
});

test("Coreutils is a Utilities tool with winget and download providers", () => {
  const coreutils = byId.get("coreutils");

  assert.ok(coreutils, "Coreutils should be present in the installer catalog");
  assert.equal(coreutils.category, "cli");
  assert.deepEqual(coreutils.provider, { kind: "winget", id: "Microsoft.Coreutils" });
  assert.equal(coreutils.downloadProvider?.kind, "downloadInstaller");
  assert.match(coreutils.downloadProvider?.url, /github\.com\/microsoft\/coreutils/);
  assert.ok(
    coreutils.options?.includes("provider"),
    "Coreutils should expose the provider selector",
  );
});

test("Coreutils is visible in the Installer Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerPage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"coreutils"/,
    "Coreutils should be listed in the visible Utilities section",
  );
});

test("FFmpeg is visible in the Installer Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/InstallerPage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"ffmpeg"/,
    "FFmpeg should be listed in the visible Utilities section",
  );
});

test("managed server apps depend on NSSM for service registration", () => {
  for (const id of ["n8n", "ollama"]) {
    const recipe = byId.get(id);
    assert.ok(recipe, `${id} should be present in the installer catalog`);
    assert.ok(
      recipe.needs?.includes("nssm"),
      `${id} should install NSSM before exposing service registration`,
    );
  }
});
