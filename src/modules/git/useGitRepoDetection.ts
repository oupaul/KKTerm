// Detects whether a directory is inside a git work tree, for the toolbar Git
// icons in terminal panes and the File Explorer. Debounced so it does not run
// on every keystroke of a tracked cwd, and only when enabled (local surfaces).
import { useEffect, useState } from "react";
import { gitDetectRepo } from "./gitCommands";

export interface GitRepoInfo {
  repoRoot: string;
  /** Trailing folder name of the repo root, for the overlay title. */
  label: string;
}

function repoLabel(repoRoot: string): string {
  const normalized = repoRoot.replace(/[\\/]+$/, "").replace(/\\/g, "/");
  const i = normalized.lastIndexOf("/");
  return i < 0 ? normalized : normalized.slice(i + 1);
}

export function useGitRepoDetection(path: string | undefined, enabled: boolean): GitRepoInfo | null {
  const [info, setInfo] = useState<GitRepoInfo | null>(null);

  useEffect(() => {
    if (!enabled || !path || !path.trim()) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void gitDetectRepo(path)
        .then((result) => {
          if (cancelled) {
            return;
          }
          setInfo(
            result.available && result.repoRoot
              ? { repoRoot: result.repoRoot, label: repoLabel(result.repoRoot) }
              : null,
          );
        })
        .catch(() => {
          if (!cancelled) {
            setInfo(null);
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [path, enabled]);

  return info;
}
