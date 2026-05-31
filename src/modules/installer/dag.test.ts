import { resolveInstallPlan } from "./dag";
import type { Catalog, Recipe } from "./types";

function wingetRecipe(id: string, wingetId: string): Recipe {
  return {
    id,
    name: id,
    descriptionEn: id,
    category: "tools",
    icon: "Package",
    provider: { kind: "winget", id: wingetId },
    options: ["scope"],
  };
}

const catalog: Catalog = {
  schemaVersion: 1,
  generatedAt: "2026-05-31",
  recipes: [
    wingetRecipe("git", "Git.Git"),
    wingetRecipe("nvm-windows", "CoreyButler.NVMforWindows"),
    {
      id: "node-bundle",
      name: "Node (nvm-windows)",
      descriptionEn: "Node (nvm-windows)",
      category: "runtime",
      icon: "Boxes",
      provider: { kind: "bundle", steps: ["nvm-windows"] },
    },
    wingetRecipe("ripgrep", "BurntSushi.ripgrep.MSVC"),
  ],
};

const gitPlan = resolveInstallPlan("git", catalog, {}, { scope: "user" });
if (gitPlan.uacPromptEstimate !== 1) {
  throw new Error(
    `Git for Windows should warn about self-elevation in user scope; got ${gitPlan.uacPromptEstimate}`,
  );
}

const nvmPlan = resolveInstallPlan("nvm-windows", catalog, {}, { scope: "user" });
if (nvmPlan.uacPromptEstimate !== 1) {
  throw new Error(
    `nvm-windows should warn about self-elevation in user scope; got ${nvmPlan.uacPromptEstimate}`,
  );
}

const nodeBundlePlan = resolveInstallPlan("node-bundle", catalog, {}, {});
if (nodeBundlePlan.uacPromptEstimate !== 1) {
  throw new Error(
    `Node bundle should inherit the nvm-windows self-elevation warning; got ${nodeBundlePlan.uacPromptEstimate}`,
  );
}

const ripgrepPlan = resolveInstallPlan("ripgrep", catalog, {}, { scope: "user" });
if (ripgrepPlan.uacPromptEstimate !== 0) {
  throw new Error(
    `Ordinary user-scope winget installs should not warn about UAC; got ${ripgrepPlan.uacPromptEstimate}`,
  );
}
