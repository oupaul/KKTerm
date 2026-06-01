import type { Provider, Recipe } from "./types";

export function providerSupportsLatestVersion(provider: Provider): boolean {
  switch (provider.kind) {
    case "winget":
    case "npm":
    case "uvPip":
    case "githubRelease":
      return true;
    case "bundle":
      return provider.steps.length === 1;
    case "downloadInstaller":
    case "windowsFeature":
    case "wslDistro":
      return false;
  }
}

export function recipeSupportsLatestVersion(recipe: Recipe): boolean {
  return providerSupportsLatestVersion(recipe.provider);
}

export function latestVersionWebUrlForRecipe(recipe: Recipe): string | null {
  if (recipeSupportsLatestVersion(recipe)) return null;
  if (recipe.provider.kind === "downloadInstaller") {
    return recipe.provider.url;
  }
  return null;
}
