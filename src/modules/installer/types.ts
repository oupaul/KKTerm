// TypeScript mirror of the Rust types in src-tauri/src/installer/.
// Any change here must be matched in the Rust side. See ADR 0007.

export type ProviderKind =
  | "winget"
  | "npm"
  | "githubRelease"
  | "windowsFeature"
  | "bundle";

export type GithubReleaseLayout = "zip" | "exeInstaller" | "msi";

export type RecipeOption = "scope" | "version" | "location" | "addToPath";

export type Provider =
  | { kind: "winget"; id: string }
  | { kind: "npm"; pkg: string }
  | {
      kind: "githubRelease";
      repo: string;
      assetPattern: string;
      layout: GithubReleaseLayout;
    }
  | { kind: "windowsFeature"; feature: string; reboot?: boolean }
  | { kind: "bundle"; steps: string[] };

export interface Recipe {
  id: string;
  name: string;
  descriptionEn: string;
  descriptionLocales?: Record<string, string>;
  needs?: string[];
  icon?: string;
  category?: string;
  provider: Provider;
  options?: RecipeOption[];
  /// Optional official project website, surfaced in the not-installed dialog.
  homepage?: string;
  /// Optional release-notes / changelog URL. UI derives a fallback from the
  /// provider when absent.
  releaseNotesUrl?: string;
}

/// Stepper plan declared by a provider runner before any work begins. The
/// frontend renders one row per step in declared order, lighting each up as
/// `StepStarted` / `StepFinished` events land.
export interface PlanStep {
  id: string;
  /// i18n key under `installer.steps.*`. The frontend resolves it through
  /// `t()`; the backend never sends English strings.
  labelKey: string;
}

export interface Catalog {
  schemaVersion: number;
  generatedAt?: string;
  recipes: Recipe[];
}

export interface DetectedState {
  installed: boolean;
  installedVersion: string | null;
  partialCount: [number, number] | null;
  /// Best-effort install directory. Populated for github-release recipes
  /// (we own the install dir); null elsewhere. UI hides the row when null.
  installLocation?: string | null;
}

export interface ToolState {
  toolId: string;
  pinned: boolean;
  latestVersionSeen: string | null;
  lastCheckAt: number | null;
}

export interface InstallOptions {
  scope?: "user" | "machine";
  version?: string;
  location?: string;
  addToPath?: boolean;
}

export type ProgressEvent =
  | { kind: "plan"; toolId: string; steps: PlanStep[] }
  | { kind: "stepStarted"; toolId: string; stepId: string }
  | {
      kind: "stepFinished";
      toolId: string;
      stepId: string;
      ok: boolean;
      error?: string;
    }
  | { kind: "step"; toolId: string; message: string }
  | { kind: "stdout"; toolId: string; stepId?: string; line: string }
  | { kind: "stderr"; toolId: string; stepId?: string; line: string }
  | { kind: "progress"; toolId: string; stepId?: string; ratio: number }
  | {
      kind: "completed";
      toolId: string;
      installedVersion: string | null;
    }
  | { kind: "failed"; toolId: string; message: string }
  | { kind: "cancelled"; toolId: string }
  | { kind: "checkStarted"; toolIds: string[] }
  | {
      kind: "checkResult";
      toolId: string;
      latestVersion: string | null;
      error?: string;
    }
  | { kind: "checkFinished" };

export const PROGRESS_EVENT_NAME = "installer://progress";

/// Localized display name lookup with safe English fallback.
export function localizedDescription(recipe: Recipe, localeId: string): string {
  return (
    recipe.descriptionLocales?.[localeId] ??
    recipe.descriptionEn ??
    ""
  );
}
