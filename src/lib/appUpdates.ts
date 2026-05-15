import { getVersion } from "@tauri-apps/api/app";
import { invokeCommand, isTauriRuntime, openExternalUrl } from "./tauri";

let debugBuildPromise: Promise<boolean> | null = null;

export function isDebugBuild(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return Promise.resolve(false);
  }
  if (!debugBuildPromise) {
    debugBuildPromise = invokeCommand("is_debug_build").catch(() => false);
  }
  return debugBuildPromise;
}

const RELEASES_API_URL = "https://api.github.com/repos/ryantsai/KKTerm/releases/latest";
const RELEASES_PAGE_URL = "https://github.com/ryantsai/KKTerm/releases/latest";

export type AppUpdate = {
  currentVersion: string;
  version: string;
  body: string;
  htmlUrl: string;
};

function normalizeTag(tag: string) {
  return tag.replace(/^v/i, "").trim();
}

// Compare two dot-separated version strings. Returns >0 if a>b, <0 if a<b, 0 equal.
// Build metadata (+suffix) is stripped per semver — it does not affect precedence.
// Pre-release suffixes (e.g. "1.2.3-beta.1") are treated as lower than the same
// version without a suffix, which is enough for "is there a newer release" checks.
export function compareVersions(a: string, b: string): number {
  const cleanA = a.split("+")[0].trim();
  const cleanB = b.split("+")[0].trim();
  const [coreA, preA = ""] = cleanA.split("-");
  const [coreB, preB = ""] = cleanB.split("-");

  const partsA = coreA.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const partsB = coreB.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }

  if (preA === preB) return 0;
  if (!preA) return 1;
  if (!preB) return -1;
  return preA < preB ? -1 : 1;
}

type GitHubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
};

export async function checkForAppUpdate(): Promise<AppUpdate | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const currentVersion = await getVersion();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let release: GitHubRelease;
  try {
    const response = await fetch(RELEASES_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }
    release = (await response.json()) as GitHubRelease;
  } finally {
    clearTimeout(timeout);
  }

  if (release.draft || release.prerelease || !release.tag_name) {
    return null;
  }

  const latestVersion = normalizeTag(release.tag_name);
  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return null;
  }

  return {
    currentVersion,
    version: latestVersion,
    body: (release.body ?? "").trim(),
    htmlUrl: release.html_url ?? RELEASES_PAGE_URL,
  };
}

export async function openReleaseDownloadPage(update: AppUpdate) {
  await openExternalUrl(update.htmlUrl);
}
