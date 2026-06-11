// TypeScript mirror of the Rust types in src-tauri/src/installer/.
// Any change here must be matched in the Rust side. See ADR 0007.

export type ProviderKind =
  | "winget"
  | "npm"
  | "uvPip"
  | "downloadInstaller"
  | "githubRelease"
  | "windowsFeature"
  | "wslDistro"
  | "bundle";

export type GithubReleaseLayout = "zip" | "exeInstaller" | "msi";

export type RecipeOption = "scope" | "version" | "location" | "addToPath" | "provider";

export interface Detection {
  registryKeys?: string[];
  displayNames?: string[];
  displayNamePrefixes?: string[];
}

export type Provider =
  | { kind: "winget"; id: string }
  | { kind: "npm"; pkg: string }
  | { kind: "uvPip"; package: string }
  | { kind: "downloadInstaller"; url: string; fileName: string }
  | {
      kind: "githubRelease";
      repo: string;
      assetPattern: string;
      layout: GithubReleaseLayout;
      pathSubdir?: string;
    }
  | { kind: "windowsFeature"; feature: string; reboot?: boolean }
  | { kind: "wslDistro"; distro: string }
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
  downloadProvider?: Provider;
  options?: RecipeOption[];
  /// Optional official project website, surfaced in the not-installed dialog.
  homepage?: string;
  /// Optional release-notes / changelog URL. UI derives a fallback from the
  /// provider when absent.
  releaseNotesUrl?: string;
  /// Fast local detection hints for installs that may not report under the
  /// same identifier used by the install/update provider.
  detection?: Detection;
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
  /// Best-effort install directory. Populated for app-local installs KKTerm
  /// owns, such as github-release recipes and managed server apps.
  installLocation?: string | null;
  /// Best-effort winget install scope detected from Add/Remove Programs.
  installScope?: "user" | "machine" | null;
  /// Extra runtime version for manager-backed bundles. For Node/Python
  /// bundles, installedVersion remains nvm/uv for update comparisons while
  /// this carries the managed Node/Python runtime version.
  runtimeVersion?: string | null;
  /// Unix timestamp from the last completed detection pass. Cached Windows
  /// registry snapshots use this so the tile can show how stale it is.
  lastCheckedAt?: number | null;
}

export interface ToolState {
  toolId: string;
  pinned: boolean;
  latestVersionSeen: string | null;
  lastCheckAt: number | null;
}

export interface ManagedWebUiStatus {
  running: boolean;
  serviceInstalled: boolean;
  serviceState: string | null;
  startup: string | null;
}

export interface InstallOptions {
  scope?: "user" | "machine";
  version?: string;
  location?: string;
  addToPath?: boolean;
  provider?: "default" | "download";
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
  | { kind: "checkFinished" }
  | { kind: "detectStarted"; toolIds: string[] }
  | { kind: "detectResult"; toolId: string; state: DetectedState }
  | { kind: "detectFinished" };

export const PROGRESS_EVENT_NAME = "installer://progress";

/// Localized display name lookup with safe English fallback.
export function localizedDescription(recipe: Recipe, localeId: string): string {
  return (
    recipe.descriptionLocales?.[localeId] ??
    recipe.descriptionEn ??
    ""
  );
}
