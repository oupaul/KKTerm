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

test("NSSM is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"nssm"/,
    "NSSM should be listed in the visible Utilities section",
  );
});

test("VcXsrv is a Utilities tool for SSH X11 forwarding", () => {
  const vcxsrv = byId.get("vcxsrv");

  assert.ok(vcxsrv, "VcXsrv should be present in the installer catalog");
  assert.equal(vcxsrv.category, "utilities");
  assert.deepEqual(vcxsrv.provider, { kind: "winget", id: "marha.VcXsrv" });
});

test("VcXsrv is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"vcxsrv"/,
    "VcXsrv should be listed in the visible Utilities section",
  );
});

test("Oh My Posh is a Utilities tool installed via winget", () => {
  const ohMyPosh = byId.get("oh-my-posh");

  assert.ok(ohMyPosh, "Oh My Posh should be present in the installer catalog");
  assert.equal(ohMyPosh.category, "utilities");
  assert.deepEqual(ohMyPosh.provider, {
    kind: "winget",
    id: "JanDeDobbeleer.OhMyPosh",
  });
});

test("Oh My Posh is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"oh-my-posh"/,
    "Oh My Posh should be listed in the visible Utilities section",
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

test("Coreutils is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"coreutils"/,
    "Coreutils should be listed in the visible Utilities section",
  );
});

test("FFmpeg is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"ffmpeg"/,
    "FFmpeg should be listed in the visible Utilities section",
  );
});

test("BentoPDF is a Utilities managed web app", () => {
  const bentopdf = byId.get("bentopdf");

  assert.ok(bentopdf, "BentoPDF should be present in the installer catalog");
  assert.equal(bentopdf.category, "utilities");
  assert.ok(
    bentopdf.needs?.includes("node-bundle"),
    "BentoPDF should install Node before building the managed web app",
  );
  assert.deepEqual(bentopdf.provider, { kind: "npm", pkg: "github:alam00000/bentopdf" });
});

test("BentoPDF is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"bentopdf"/,
    "BentoPDF should be listed in the visible Utilities section",
  );
});

test("OpenFlowKit is a Utilities managed web app", () => {
  const openflowkit = byId.get("openflowkit");

  assert.ok(openflowkit, "OpenFlowKit should be present in the installer catalog");
  assert.equal(openflowkit.category, "utilities");
  assert.ok(
    openflowkit.needs?.includes("node-bundle"),
    "OpenFlowKit should install Node before building the managed web app",
  );
  assert.deepEqual(openflowkit.provider, {
    kind: "npm",
    pkg: "github:Vrun-design/openflowkit",
  });
});

test("OpenFlowKit is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"openflowkit"/,
    "OpenFlowKit should be listed in the visible Utilities section",
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
