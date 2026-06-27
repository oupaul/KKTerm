// Git Browser overlay shell. Composes the toolbar, sidebar, commit graph +
// inspector (History view) and the staging/commit workflow (Commit view),
// wiring every surface to the system-git backend. Opened as a full-window
// modal from a terminal pane or the File Explorer toolbar.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { ConfirmSheet, type ConfirmTone } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type {
  GitBrowserTarget,
  GitChangedFile,
  GitOverview,
  GitDiffLine,
  GitStatus,
  GraphCommit,
} from "./gitTypes";
import { assignLanes } from "./lane";
import { lanePalette } from "./gitPalette";
import { GitIcon } from "./GitIcon";
import { GitGraph } from "./GitGraph";
import { GitSidebar, sidebarKey, type SidebarRef } from "./GitSidebar";
import { ChangedFiles, DetailHead } from "./GitDetail";
import { GitDiffViewer } from "./GitDiffViewer";
import { WorkingTree, type WorkingTreeSelection } from "./WorkingTree";
import { GitCommitMenu, type CommitMenuItem } from "./GitCommitMenu";
import { GitNamePrompt } from "./GitNamePrompt";
import { GitInstallGate } from "./GitInstallGate";
import { GitResizeHandle } from "./GitResizeHandle";
import { useGitLayout } from "./useGitLayout";
import { splitPath } from "./gitPath";
import { useGitTheme } from "./useGitTheme";
import {
  gitCheckout,
  gitCherryPick,
  gitCommit,
  gitCommitFiles,
  gitCreateBranch,
  gitCreateTag,
  gitDeleteBranch,
  gitDetectRepo,
  gitDiffCommit,
  gitDiffWorktree,
  gitDiscard,
  gitFetch,
  gitLogGraph,
  gitMerge,
  gitPull,
  gitPush,
  gitRenameBranch,
  gitRepoOverview,
  gitReset,
  gitRevert,
  gitStage,
  gitStageAll,
  gitStashApply,
  gitStashDrop,
  gitStashPop,
  gitStashPush,
  gitStatus,
  gitUnstage,
  gitUnstageAll,
  gitWorktreeAdd,
  gitWorktreeRemove,
} from "./gitCommands";

const ROW_HEIGHT = 30; // compact density

type GitView = "history" | "commit";

interface DetailEntry {
  file: GitChangedFile;
  /** True for the staged copy of a working-tree file. */
  staged: boolean;
  untracked: boolean;
  /** True when this file belongs to a committed change (uses commit diff). */
  fromCommit: boolean;
}

interface PromptState {
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
}

interface ConfirmState {
  title: string;
  message?: string;
  tone: ConfirmTone;
  confirmLabel: string;
  onConfirm: () => void;
}

export function GitBrowser({
  target,
  onClose,
}: {
  target: GitBrowserTarget;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // The browser can be re-pointed to a linked worktree from the sidebar, so the
  // active root is stateful; all git calls below use `repoRoot`.
  const [activeRoot, setActiveRoot] = useState(target.repoRoot);
  const repoRoot = activeRoot;
  const repoLabel =
    activeRoot === target.repoRoot
      ? target.label
      : splitPath(activeRoot.replace(/\\/g, "/")).name || target.label;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const theme = useGitTheme(rootRef);
  const palette = useMemo(() => lanePalette("colorful", theme), [theme]);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const { layout, nudge, nudgeWindow } = useGitLayout();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [view, setView] = useState<GitView>("history");
  const [overview, setOverview] = useState<GitOverview | null>(null);
  const [commits, setCommits] = useState<GraphCommit[]>([]);
  const [status, setStatusState] = useState<GitStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  // History selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wtSelected, setWtSelected] = useState(false);
  const [commitFiles, setCommitFiles] = useState<GitChangedFile[]>([]);
  const [fileIndex, setFileIndex] = useState(0);

  // Commit-view selection
  const [wtSelection, setWtSelection] = useState<WorkingTreeSelection | null>(null);

  // Diff
  const [diffLines, setDiffLines] = useState<GitDiffLine[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);

  // Sidebar single-click selection (visual; double-click activates).
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  // Transient UI
  const [menu, setMenu] = useState<{ x: number; y: number; commit: GraphCommit } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: (CommitMenuItem | null)[] } | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  const notifyError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(message, { tone: "error" });
    },
    [showStatusBarNotice],
  );

  const reload = useCallback(async () => {
    try {
      const [nextOverview, nextCommits, nextStatus] = await Promise.all([
        gitRepoOverview(repoRoot),
        gitLogGraph(repoRoot, { allRefs: true }),
        gitStatus(repoRoot),
      ]);
      setOverview(nextOverview);
      setCommits(assignLanes(nextCommits));
      setStatusState(nextStatus);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, [repoRoot]);

  const detect = useCallback(async () => {
    try {
      const result = await gitDetectRepo(repoRoot);
      setAvailable(result.available);
      if (result.available) {
        await reload();
      }
    } catch (error) {
      setAvailable(false);
      notifyError(error);
    }
  }, [repoRoot, reload, notifyError]);

  useEffect(() => {
    void detect();
  }, [detect]);

  // Default the History selection to the newest commit once loaded.
  useEffect(() => {
    if (!selectedId && !wtSelected && commits.length > 0) {
      setSelectedId(commits[0].id);
    }
  }, [commits, selectedId, wtSelected]);

  // Load changed files when a commit is selected in History.
  useEffect(() => {
    if (view !== "history" || wtSelected || !selectedId) {
      return;
    }
    let cancelled = false;
    void gitCommitFiles(repoRoot, selectedId)
      .then((files) => {
        if (!cancelled) {
          setCommitFiles(files);
          setFileIndex(0);
        }
      })
      .catch(notifyError);
    return () => {
      cancelled = true;
    };
  }, [repoRoot, selectedId, wtSelected, view, notifyError]);

  // Esc closes the overlay.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !prompt && !confirm && !menu && !ctxMenu) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prompt, confirm, menu, ctxMenu]);

  const selectedCommit = useMemo(
    () => commits.find((c) => c.id === selectedId) ?? null,
    [commits, selectedId],
  );

  // History detail entries: working-tree (staged+unstaged) or commit files.
  const detailEntries: DetailEntry[] = useMemo(() => {
    if (wtSelected && status) {
      return [
        ...status.staged.map((file) => ({
          file,
          staged: true,
          untracked: false,
          fromCommit: false,
        })),
        ...status.unstaged.map((file) => ({
          file,
          staged: false,
          untracked: file.status === "?",
          fromCommit: false,
        })),
      ];
    }
    return commitFiles.map((file) => ({
      file,
      staged: false,
      untracked: false,
      fromCommit: true,
    }));
  }, [wtSelected, status, commitFiles]);

  const activeEntry: DetailEntry | null = useMemo(() => {
    if (view === "commit") {
      if (!wtSelection) {
        return null;
      }
      return {
        file: wtSelection.file,
        staged: wtSelection.staged,
        untracked: wtSelection.untracked,
        fromCommit: false,
      };
    }
    if (detailEntries.length === 0) {
      return null;
    }
    return detailEntries[Math.min(fileIndex, detailEntries.length - 1)];
  }, [view, wtSelection, detailEntries, fileIndex]);

  // Load the diff for whichever file is active.
  useEffect(() => {
    if (!activeEntry) {
      setDiffLines([]);
      return;
    }
    let cancelled = false;
    setDiffLoading(true);
    const loader =
      activeEntry.fromCommit && selectedId
        ? gitDiffCommit(repoRoot, selectedId, activeEntry.file.path)
        : gitDiffWorktree(repoRoot, activeEntry.file.path, {
            staged: activeEntry.staged,
            untracked: activeEntry.untracked,
          });
    void loader
      .then((lines) => {
        if (!cancelled) {
          setDiffLines(lines);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDiffLines([]);
          notifyError(error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDiffLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeEntry, repoRoot, selectedId, notifyError]);

  /** Run a mutating git action, then reload and report the outcome. */
  const runAction = useCallback(
    async (action: () => Promise<string>, successMessage: string) => {
      setBusy(true);
      try {
        await action();
        await reload();
        showStatusBarNotice(successMessage, { tone: "success" });
        return true;
      } catch (error) {
        notifyError(error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload, showStatusBarNotice, notifyError],
  );

  const selectCommit = (id: string) => {
    setSelectedId(id);
    setWtSelected(false);
    setFileIndex(0);
  };

  const currentBranch = overview?.currentBranch ?? null;
  const ahead = overview?.localBranches.find((b) => b.current)?.ahead ?? 0;

  const filteredCommits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return commits;
    }
    return commits.filter(
      (c) =>
        c.subject.toLowerCase().includes(query) ||
        c.shortId.toLowerCase().includes(query) ||
        c.authorName.toLowerCase().includes(query),
    );
  }, [commits, search]);

  // ── toolbar actions ───────────────────────────────────────────────────────
  const onFetch = () => void runAction(() => gitFetch(repoRoot, { prune: true }), t("git.fetchDone"));
  const onPull = () => void runAction(() => gitPull(repoRoot), t("git.pullDone"));
  const onPush = () =>
    setConfirm({
      title: t("git.pushConfirmTitle"),
      message: t("git.pushConfirmBody", { branch: currentBranch ?? "HEAD" }),
      tone: "info",
      confirmLabel: t("git.push"),
      onConfirm: () => void runAction(() => gitPush(repoRoot), t("git.pushDone")),
    });
  // Sync = rebase-pull then push, behind a single confirm. Push runs only when
  // the pull succeeds (runAction stops on the first thrown error).
  const onSync = () =>
    setConfirm({
      title: t("git.syncConfirmTitle"),
      message: t("git.syncConfirmBody", { branch: currentBranch ?? "HEAD" }),
      tone: "info",
      confirmLabel: t("git.sync"),
      onConfirm: () =>
        void runAction(async () => {
          await gitPull(repoRoot, { rebase: true });
          return gitPush(repoRoot);
        }, t("git.syncDone")),
    });
  const onNewBranch = () =>
    setPrompt({
      title: t("git.newBranchTitle"),
      label: t("git.branchName"),
      confirmLabel: t("git.createBranch"),
      onSubmit: (name) =>
        void runAction(() => gitCreateBranch(repoRoot, name, { checkout: true }), t("git.branchCreated", { name })),
    });
  const onMerge = () =>
    setPrompt({
      title: t("git.mergeTitle"),
      label: t("git.mergeRef"),
      placeholder: t("git.mergeRefPlaceholder"),
      confirmLabel: t("git.merge"),
      onSubmit: (ref) => void runAction(() => gitMerge(repoRoot, ref), t("git.mergeDone", { ref })),
    });
  const onStash = () =>
    void runAction(() => gitStashPush(repoRoot, { includeUntracked: true }), t("git.stashed"));

  // ── commit-view actions ───────────────────────────────────────────────────
  const onStageFile = (file: GitChangedFile) =>
    void runAction(() => gitStage(repoRoot, [file.path]), t("git.stagedNotice"));
  const onUnstageFile = (file: GitChangedFile) =>
    void runAction(() => gitUnstage(repoRoot, [file.path]), t("git.unstagedNotice"));
  const onStageAll = () => void runAction(() => gitStageAll(repoRoot), t("git.stagedAllNotice"));
  const onUnstageAll = () => void runAction(() => gitUnstageAll(repoRoot), t("git.unstagedAllNotice"));
  const onCommit = (message: string, amend: boolean) =>
    runAction(() => gitCommit(repoRoot, message, amend), t("git.committedDone"));

  const discardOne = (file: GitChangedFile) =>
    file.status === "?"
      ? gitDiscard(repoRoot, [], [file.path])
      : gitDiscard(repoRoot, [file.path]);
  const onDiscardFile = (file: GitChangedFile) =>
    setConfirm({
      title: t("git.discardConfirmTitle"),
      message: t("git.discardConfirmBody", { path: file.path }),
      tone: "danger",
      confirmLabel: t("git.discard"),
      onConfirm: () => void runAction(() => discardOne(file), t("git.discardedNotice")),
    });
  const onDiscardAll = () => {
    const unstaged = status?.unstaged ?? [];
    if (unstaged.length === 0) {
      return;
    }
    const tracked = unstaged.filter((f) => f.status !== "?").map((f) => f.path);
    const untracked = unstaged.filter((f) => f.status === "?").map((f) => f.path);
    setConfirm({
      title: t("git.discardConfirmTitle"),
      message: t("git.discardAllConfirmBody", { count: unstaged.length }),
      tone: "danger",
      confirmLabel: t("git.discardAll"),
      onConfirm: () => void runAction(() => gitDiscard(repoRoot, tracked, untracked), t("git.discardedNotice")),
    });
  };

  // ── sidebar: switch root, checkout, branch + worktree management ───────────
  const switchRoot = (root: string) => {
    setActiveRoot(root);
    setSelectedId(null);
    setWtSelected(false);
    setCommitFiles([]);
    setFileIndex(0);
    setWtSelection(null);
    setSelectedRef(null);
  };

  const confirmCheckout = (ref: string) =>
    setConfirm({
      title: t("git.switchRefConfirmTitle"),
      message: t("git.switchRefConfirmBody", { ref }),
      tone: "warn",
      confirmLabel: t("git.checkout"),
      onConfirm: () => void runAction(() => gitCheckout(repoRoot, ref), t("git.checkedOut")),
    });

  // Double-clicking a sidebar row activates it (after confirmation where it
  // mutates the working tree).
  const onSidebarActivate = (ref: SidebarRef) => {
    switch (ref.kind) {
      case "branch":
        confirmCheckout(ref.name);
        return;
      case "tag":
        confirmCheckout(ref.name);
        return;
      case "remote": {
        // Prefer creating/refreshing a local tracking branch over a detached HEAD.
        const localExists = overview?.localBranches.some((b) => b.name === ref.branch);
        if (localExists) {
          confirmCheckout(ref.branch);
          return;
        }
        setConfirm({
          title: t("git.switchRefConfirmTitle"),
          message: t("git.trackRemoteConfirmBody", { ref: ref.ref, branch: ref.branch }),
          tone: "warn",
          confirmLabel: t("git.checkout"),
          onConfirm: () =>
            void runAction(
              () => gitCreateBranch(repoRoot, ref.branch, { startPoint: ref.ref, checkout: true }),
              t("git.checkedOut"),
            ),
        });
        return;
      }
      case "worktree": {
        const { worktree } = ref;
        if (worktree.isCurrent || worktree.path === activeRoot) {
          return;
        }
        setConfirm({
          title: t("git.switchWorktreeConfirmTitle"),
          message: t("git.switchWorktreeConfirmBody", { path: worktree.path }),
          tone: "info",
          confirmLabel: t("git.switchWorktree"),
          onConfirm: () => switchRoot(worktree.path),
        });
        return;
      }
    }
  };

  // Right-click a branch or worktree row for management actions.
  const onSidebarContext = (event: React.MouseEvent, ref: SidebarRef) => {
    event.preventDefault();
    setSelectedRef(sidebarKey(ref));
    if (ref.kind === "branch") {
      const isCurrent = currentBranch === ref.name;
      setCtxMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            icon: "branch",
            label: t("git.checkout"),
            onClick: () => confirmCheckout(ref.name),
          },
          {
            icon: "pencil",
            label: t("git.renameBranch"),
            onClick: () =>
              setPrompt({
                title: t("git.renameBranchTitle"),
                label: t("git.branchName"),
                confirmLabel: t("git.rename"),
                initialValue: ref.name,
                onSubmit: (newName) =>
                  void runAction(
                    () => gitRenameBranch(repoRoot, ref.name, newName),
                    t("git.branchRenamed", { name: newName }),
                  ),
              }),
          },
          {
            icon: "trash",
            label: t("git.deleteBranch"),
            danger: true,
            onClick: () =>
              setConfirm({
                title: t("git.deleteBranchConfirmTitle"),
                message: t("git.deleteBranchConfirmBody", { name: ref.name }),
                tone: "danger",
                confirmLabel: t("git.delete"),
                onConfirm: () =>
                  void runAction(
                    () => gitDeleteBranch(repoRoot, ref.name),
                    t("git.branchDeleted", { name: ref.name }),
                  ),
              }),
            // Deleting the current branch is impossible; git will reject it, and
            // the error surfaces via the Status Bar.
          },
        ].filter((item) => !(isCurrent && item?.icon === "trash")) as (CommitMenuItem | null)[],
      });
    } else if (ref.kind === "worktree") {
      const { worktree } = ref;
      setCtxMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            icon: "worktree",
            label: t("git.switchWorktree"),
            onClick: () => onSidebarActivate(ref),
          },
          {
            icon: "trash",
            label: t("git.removeWorktree"),
            danger: true,
            onClick: () =>
              setConfirm({
                title: t("git.removeWorktreeConfirmTitle"),
                message: t("git.removeWorktreeConfirmBody", { path: worktree.path }),
                tone: "danger",
                confirmLabel: t("git.remove"),
                onConfirm: () =>
                  void runAction(
                    () => gitWorktreeRemove(repoRoot, worktree.path),
                    t("git.worktreeRemoved"),
                  ),
              }),
          },
        ].filter((item) => !(worktree.isCurrent && item?.icon === "trash")) as (CommitMenuItem | null)[],
      });
    }
  };

  const onAddWorktree = () =>
    setPrompt({
      title: t("git.addWorktreeTitle"),
      label: t("git.worktreePath"),
      placeholder: t("git.worktreePathPlaceholder"),
      confirmLabel: t("git.addWorktree"),
      onSubmit: (path) => void runAction(() => gitWorktreeAdd(repoRoot, path), t("git.worktreeAdded")),
    });

  const sidebarProps = {
    overview,
    palette,
    width: layout.sidebarW,
    selectedKey: selectedRef,
    onSelect: setSelectedRef,
    onActivate: onSidebarActivate,
    onContext: onSidebarContext,
    onAddWorktree,
    onStashApply: (i: number) => void runAction(() => gitStashApply(repoRoot, i), t("git.stashApplied")),
    onStashPop: (i: number) => void runAction(() => gitStashPop(repoRoot, i), t("git.stashPopped")),
    onStashDrop: (i: number) => void runAction(() => gitStashDrop(repoRoot, i), t("git.stashDropped")),
  };

  // ── commit context menu ───────────────────────────────────────────────────
  const menuItems = (commit: GraphCommit): (CommitMenuItem | null)[] => [
    {
      icon: "branch",
      label: t("git.checkoutCommit"),
      onClick: () =>
        setConfirm({
          title: t("git.checkoutConfirmTitle"),
          message: t("git.checkoutConfirmBody", { sha: commit.shortId }),
          tone: "warn",
          confirmLabel: t("git.checkout"),
          onConfirm: () => void runAction(() => gitCheckout(repoRoot, commit.id), t("git.checkedOut")),
        }),
    },
    {
      icon: "branch",
      label: t("git.createBranchHere"),
      onClick: () =>
        setPrompt({
          title: t("git.newBranchTitle"),
          label: t("git.branchName"),
          confirmLabel: t("git.createBranch"),
          onSubmit: (name) =>
            void runAction(
              () => gitCreateBranch(repoRoot, name, { startPoint: commit.id, checkout: true }),
              t("git.branchCreated", { name }),
            ),
        }),
    },
    {
      icon: "tag",
      label: t("git.createTag"),
      onClick: () =>
        setPrompt({
          title: t("git.newTagTitle"),
          label: t("git.tagName"),
          confirmLabel: t("git.createTag"),
          onSubmit: (name) =>
            void runAction(() => gitCreateTag(repoRoot, name, { sha: commit.id }), t("git.tagCreated", { name })),
        }),
    },
    null,
    {
      icon: "merge",
      label: t("git.cherryPick"),
      onClick: () =>
        setConfirm({
          title: t("git.cherryPickConfirmTitle"),
          message: t("git.cherryPickConfirmBody", { sha: commit.shortId }),
          tone: "warn",
          confirmLabel: t("git.cherryPick"),
          onConfirm: () => void runAction(() => gitCherryPick(repoRoot, commit.id), t("git.cherryPicked")),
        }),
    },
    {
      icon: "history",
      label: t("git.revertCommit"),
      danger: true,
      onClick: () =>
        setConfirm({
          title: t("git.revertConfirmTitle"),
          message: t("git.revertConfirmBody", { sha: commit.shortId }),
          tone: "danger",
          confirmLabel: t("git.revert"),
          onConfirm: () => void runAction(() => gitRevert(repoRoot, commit.id), t("git.reverted")),
        }),
    },
    null,
    {
      icon: "reset",
      label: t("git.resetSoft"),
      onClick: () =>
        setConfirm({
          title: t("git.resetConfirmTitle"),
          message: t("git.resetSoftConfirmBody", { sha: commit.shortId }),
          tone: "warn",
          confirmLabel: t("git.reset"),
          onConfirm: () => void runAction(() => gitReset(repoRoot, commit.id, "soft"), t("git.resetDone")),
        }),
    },
    {
      icon: "reset",
      label: t("git.resetMixed"),
      onClick: () =>
        setConfirm({
          title: t("git.resetConfirmTitle"),
          message: t("git.resetMixedConfirmBody", { sha: commit.shortId }),
          tone: "warn",
          confirmLabel: t("git.reset"),
          onConfirm: () => void runAction(() => gitReset(repoRoot, commit.id, "mixed"), t("git.resetDone")),
        }),
    },
    {
      icon: "reset",
      label: t("git.resetHard"),
      danger: true,
      onClick: () =>
        setConfirm({
          title: t("git.resetConfirmTitle"),
          message: t("git.resetHardConfirmBody", { sha: commit.shortId }),
          tone: "danger",
          confirmLabel: t("git.reset"),
          onConfirm: () => void runAction(() => gitReset(repoRoot, commit.id, "hard"), t("git.resetDone")),
        }),
    },
    null,
    {
      icon: "copy",
      label: t("git.copySha"),
      onClick: () => void navigator.clipboard?.writeText(commit.id),
    },
    {
      icon: "copy",
      label: t("git.copyMessage"),
      onClick: () => void navigator.clipboard?.writeText(`${commit.subject}\n\n${commit.body}`.trim()),
    },
  ];

  // ── render ────────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (available === null) {
    body = <div className="git-loading">{t("git.loading")}</div>;
  } else if (available === false) {
    body = <GitInstallGate onRetry={() => void detect()} />;
  } else if (loadError) {
    body = (
      <div className="git-loading git-load-error">
        {t("git.loadFailed")}
        <span className="detail">{loadError}</span>
      </div>
    );
  } else if (view === "commit") {
    body = (
      <div className="git-body">
        <GitSidebar {...sidebarProps} />
        <GitResizeHandle
          axis="x"
          className="git-pane-resizer"
          ariaLabel={t("git.resizeSidebar")}
          onResize={(dx) => nudge("sidebarW", dx)}
        />
        <WorkingTree
          staged={status?.staged ?? []}
          unstaged={status?.unstaged ?? []}
          selectedKey={wtSelection?.key ?? null}
          onSelect={setWtSelection}
          onStageFile={onStageFile}
          onUnstageFile={onUnstageFile}
          onStageAll={onStageAll}
          onUnstageAll={onUnstageAll}
          onDiscardFile={onDiscardFile}
          onDiscardAll={onDiscardAll}
          onCommit={onCommit}
          committing={busy}
          style={{ width: layout.worktreeW, flex: "0 0 auto" }}
        />
        <GitResizeHandle
          axis="x"
          className="git-pane-resizer"
          ariaLabel={t("git.resizeWorktree")}
          onResize={(dx) => nudge("worktreeW", dx)}
        />
        <GitDiffViewer file={activeEntry?.file ?? null} lines={diffLines} loading={diffLoading} />
      </div>
    );
  } else {
    body = (
      <div className="git-body">
        <GitSidebar {...sidebarProps} />
        <GitResizeHandle
          axis="x"
          className="git-pane-resizer"
          ariaLabel={t("git.resizeSidebar")}
          onResize={(dx) => nudge("sidebarW", dx)}
        />
        <GitGraph
          commits={filteredCommits}
          selectedId={selectedId}
          onSelect={selectCommit}
          onContext={(event, commit) => {
            event.preventDefault();
            selectCommit(commit.id);
            setMenu({ x: event.clientX, y: event.clientY, commit });
          }}
          theme={theme}
          colorMode="colorful"
          rowH={ROW_HEIGHT}
          showWorkingTree
          workingTreeSelected={wtSelected}
          onSelectWorkingTree={() => {
            setWtSelected(true);
            setFileIndex(0);
          }}
        />
        <GitResizeHandle
          axis="x"
          className="git-pane-resizer"
          ariaLabel={t("git.resizeDetail")}
          onResize={(dx) => nudge("detailW", -dx)}
        />
        <div className="git-detail" style={{ width: layout.detailW, flex: "0 0 auto" }}>
          {wtSelected ? (
            <div className="git-detail-head">
              <div className="msg">{t("git.uncommittedChanges")}</div>
              <div className="body-msg">
                {t("git.stagedUnstagedCount", {
                  staged: status?.staged.length ?? 0,
                  unstaged: status?.unstaged.length ?? 0,
                })}
              </div>
            </div>
          ) : selectedCommit ? (
            <DetailHead commit={selectedCommit} />
          ) : null}
          <ChangedFiles
            files={detailEntries.map((entry) => entry.file)}
            selectedIndex={Math.min(fileIndex, Math.max(detailEntries.length - 1, 0))}
            onSelect={setFileIndex}
          />
          <GitDiffViewer file={activeEntry?.file ?? null} lines={diffLines} loading={diffLoading} />
        </div>
      </div>
    );
  }

  const isCommit = view === "commit";

  return (
    <div
      className="dialog-backdrop connection-dialog-backdrop git-overlay-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="git-browser"
        data-git-theme={theme}
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("git.title", { repo: repoLabel })}
        style={{ width: layout.width, height: layout.height }}
      >
        <div className="git-titlebar">
          <div className="git-title-id">
            <span className="repo-glyph"><GitIcon name="repo" size={17} /></span>
            {repoLabel}
            {currentBranch ? (
              <span className="git-branch-pill">
                <span className="gl"><GitIcon name="branch" size={12} /></span>
                {currentBranch}
              </span>
            ) : null}
          </div>
          <div className="git-titlebar-spacer" />
          <button type="button" className="git-icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </div>

        {available ? (
          <div className="git-toolbar">
            <div className="git-tb-group">
              <button type="button" className="act" onClick={onFetch} disabled={busy}>
                <span className="gl"><GitIcon name="fetch" size={19} /></span>
                <span className="lbl">{t("git.fetch")}</span>
              </button>
              <button type="button" className="act" onClick={onPull} disabled={busy}>
                <span className="gl"><GitIcon name="pull" size={19} /></span>
                <span className="lbl">{t("git.pull")}</span>
              </button>
              <button type="button" className="act" onClick={onPush} disabled={busy}>
                <span className="gl"><GitIcon name="push" size={19} /></span>
                <span className="lbl">{t("git.push")}</span>
                {ahead > 0 ? <span className="cnt">{ahead}</span> : null}
              </button>
              <button type="button" className="act" onClick={onSync} disabled={busy}>
                <span className="gl"><GitIcon name="sync" size={19} /></span>
                <span className="lbl">{t("git.sync")}</span>
              </button>
            </div>
            <div className="git-tb-sep" />
            <div className="git-tb-group">
              <button type="button" className="act" onClick={onNewBranch} disabled={busy}>
                <span className="gl"><GitIcon name="branch" size={19} /></span>
                <span className="lbl">{t("git.branch")}</span>
              </button>
              <button type="button" className="act" onClick={onMerge} disabled={busy}>
                <span className="gl"><GitIcon name="merge" size={19} /></span>
                <span className="lbl">{t("git.merge")}</span>
              </button>
              <button type="button" className="act" onClick={onStash} disabled={busy}>
                <span className="gl"><GitIcon name="stash" size={19} /></span>
                <span className="lbl">{t("git.stash")}</span>
              </button>
            </div>
            <div className="git-tb-spacer" />
            <div className="git-segmented">
              <button type="button" className={!isCommit ? "active" : ""} onClick={() => setView("history")}>
                <GitIcon name="history" size={15} /> {t("git.history")}
              </button>
              <button type="button" className={isCommit ? "active" : ""} onClick={() => setView("commit")}>
                <GitIcon name="commit" size={15} /> {t("git.commit")}
              </button>
            </div>
            <div className="git-search">
              <GitIcon name="search" size={15} />
              <input
                value={search}
                placeholder={t("git.searchCommits")}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {body}

        <GitResizeHandle
          axis="x"
          className="git-resize-edge-e"
          ariaLabel={t("git.resizeWindow")}
          onResize={(dx) => nudgeWindow(dx, 0)}
        />
        <GitResizeHandle
          axis="y"
          className="git-resize-edge-s"
          ariaLabel={t("git.resizeWindow")}
          onResize={(_dx, dy) => nudgeWindow(0, dy)}
        />
        <GitResizeHandle
          axis="xy"
          className="git-resize-corner"
          ariaLabel={t("git.resizeWindow")}
          onResize={(dx, dy) => nudgeWindow(dx, dy)}
        />
      </div>

      {menu ? (
        <GitCommitMenu x={menu.x} y={menu.y} items={menuItems(menu.commit)} onClose={() => setMenu(null)} />
      ) : null}
      {ctxMenu ? (
        <GitCommitMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />
      ) : null}
      {prompt ? (
        <GitNamePrompt
          title={prompt.title}
          label={prompt.label}
          placeholder={prompt.placeholder}
          confirmLabel={prompt.confirmLabel}
          initialValue={prompt.initialValue}
          onConfirm={(value) => {
            prompt.onSubmit(value);
            setPrompt(null);
          }}
          onCancel={() => setPrompt(null)}
        />
      ) : null}
      {confirm ? (
        <ConfirmSheet
          tone={confirm.tone}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
