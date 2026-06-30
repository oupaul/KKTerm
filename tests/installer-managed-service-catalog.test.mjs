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

test("Chocolatey is a Package Managers tool installed via winget", () => {
  const chocolatey = byId.get("chocolatey");

  assert.ok(chocolatey, "Chocolatey should be present in the installer catalog");
  assert.equal(chocolatey.category, "package-managers");
  assert.deepEqual(chocolatey.provider, {
    kind: "winget",
    id: "Chocolatey.Chocolatey",
  });
  assert.deepEqual(chocolatey.chocolateyProvider, {
    kind: "chocolatey",
    id: "chocolatey",
  });
  assert.ok(
    chocolatey.needs?.includes("winget"),
    "Chocolatey should install through the existing winget prerequisite flow",
  );
  assert.ok(
    !chocolatey.options?.includes("provider"),
    "Chocolatey should bootstrap through winget, then use choco for self-updates without exposing a recursive provider picker",
  );
});

test("uv is winget-backed but does not request scoped portable installs", () => {
  const uv = byId.get("uv");

  assert.ok(uv, "uv should be present in the installer catalog");
  assert.deepEqual(uv.provider, {
    kind: "winget",
    id: "astral-sh.uv",
  });
  assert.ok(
    !uv.options?.includes("scope"),
    "uv is a portable winget package and should not ask winget for user/machine scope",
  );
});

test("PowerShell 7 detection covers versioned ARP display names", () => {
  const powershell = byId.get("powershell-7");

  assert.ok(powershell, "PowerShell 7 should be present in the installer catalog");
  assert.ok(
    powershell.detection?.displayNamePrefixes?.includes("PowerShell 7"),
    "PowerShell 7 should match versioned names such as PowerShell 7.6.3.0-x64",
  );
});

test("winget and Chocolatey live in the Package Managers section above Utilities", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.packageManagers"[\s\S]*ids:\s*\[[^\]]*"winget"[^\]]*"chocolatey"/,
    "winget and Chocolatey should be listed in the Package Managers section",
  );
  // The Package Managers section must appear before Utilities in display order.
  assert.ok(
    source.indexOf('"installer.section.packageManagers"') <
      source.indexOf('"installer.section.utilities"'),
    "Package Managers should be ordered above Utilities",
  );
});

test("Bun is visible in the Install Helper Development section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.development"[\s\S]*ids:\s*\[[^\]]*"bun"/,
    "Bun should be listed in the visible Development section",
  );
});

test("Bun catalog entry offers winget, Chocolatey, and GitHub-release sources", () => {
  const bun = byId.get("bun");

  assert.ok(bun, "Bun should be present in the installer catalog");
  assert.equal(bun.category, "development");
  assert.deepEqual(bun.provider, { kind: "winget", id: "Oven-sh.Bun" });
  assert.deepEqual(bun.chocolateyProvider, { kind: "chocolatey", id: "bun" });
  assert.equal(bun.downloadProvider?.kind, "githubRelease");
  assert.equal(bun.downloadProvider?.repo, "oven-sh/bun");
  assert.ok(
    bun.options?.includes("provider"),
    "Bun should expose the provider selector for its alternate sources",
  );
});

test("curated Chocolatey overlaps expose Chocolatey alternate providers", () => {
  const expected = new Map([
    ["git", "git.install"],
    ["github-cli", "gh"],
    ["vscode", "vscode.install"],
    ["notepadpp", "notepadplusplus.install"],
    ["nssm", "nssm"],
    ["powershell-7", "powershell-core"],
    ["ffmpeg", "ffmpeg"],
  ]);

  for (const [toolId, packageId] of expected) {
    const recipe = byId.get(toolId);
    assert.ok(recipe, `${toolId} should be present in the installer catalog`);
    assert.deepEqual(recipe.chocolateyProvider, {
      kind: "chocolatey",
      id: packageId,
    });
    assert.ok(
      recipe.options?.includes("provider"),
      `${toolId} should expose the provider selector`,
    );
  }
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

test("scrcpy is a Utilities tool installed via winget", () => {
  const scrcpy = byId.get("scrcpy");

  assert.ok(scrcpy, "scrcpy should be present in the installer catalog");
  assert.equal(scrcpy.category, "utilities");
  assert.deepEqual(scrcpy.provider, { kind: "winget", id: "Genymobile.scrcpy" });
  assert.ok(scrcpy.options?.includes("version"));
  assert.ok(scrcpy.options?.includes("provider"));
});

test("scrcpy is visible in the Install Helper Utilities section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.utilities"[\s\S]*ids:\s*\[[^\]]*"scrcpy"/,
    "scrcpy should be listed in the visible Utilities section",
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

test("OpenFlowKit is a Design managed web app", () => {
  const openflowkit = byId.get("openflowkit");

  assert.ok(openflowkit, "OpenFlowKit should be present in the installer catalog");
  assert.equal(openflowkit.category, "design");
  assert.ok(
    openflowkit.needs?.includes("node-bundle"),
    "OpenFlowKit should install Node before building the managed web app",
  );
  assert.deepEqual(openflowkit.provider, {
    kind: "npm",
    pkg: "github:Vrun-design/openflowkit",
  });
});

test("Design tools are visible in the Install Helper Design section", async () => {
  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.design"[\s\S]*ids:\s*\[[^\]]*"excalidraw"[^\]]*"openflowkit"[^\]]*"drawio"[^\]]*"krita"[^\]]*"inkscape"/,
    "Design tools should be listed in the visible Design section",
  );
});

test("Draw.IO, Krita, and Inkscape are Design tools installed via winget", () => {
  const expected = new Map([
    ["drawio", "JGraph.Draw"],
    ["krita", "KDE.Krita"],
    ["inkscape", "Inkscape.Inkscape"],
  ]);

  for (const [toolId, wingetId] of expected) {
    const recipe = byId.get(toolId);
    assert.ok(recipe, `${toolId} should be present in the installer catalog`);
    assert.equal(recipe.category, "design");
    assert.deepEqual(recipe.provider, { kind: "winget", id: wingetId });
    assert.ok(recipe.options?.includes("provider"));
  }
});

test("Hermes Desktop is visible in AI Agents and uses a direct installer source", async () => {
  const recipe = byId.get("hermes-desktop");
  assert.ok(recipe, "Hermes Desktop should be present in the installer catalog");
  assert.equal(recipe.category, "ai-agent");
  assert.deepEqual(recipe.provider, {
    kind: "downloadInstaller",
    url: "https://hermes-assets.nousresearch.com/Hermes-Setup.exe?build=c9269fbfb689",
    fileName: "Hermes-Setup.exe",
  });

  const source = await readFile(
    new URL("../src/modules/installer/sections.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /titleKey:\s*"installer\.section\.aiAgents"[\s\S]*ids:\s*\[[^\]]*"hermes-agent"[^\]]*"hermes-desktop"/,
    "Hermes Desktop should be listed in the visible AI Agents section",
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
