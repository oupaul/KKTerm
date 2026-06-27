// Git Browser sidebar: local branches (with ahead/behind), remotes and their
// branches, tags, worktrees, and stashes. Rows are selected on single click and
// activated (checkout / switch worktree) on double click — the parent confirms
// before acting. Branch and worktree rows expose a right-click context menu;
// stash rows expose apply/pop/drop affordances.
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type { GitOverview, GitWorktree } from "./gitTypes";
import { laneColor } from "./gitPalette";
import { GitIcon } from "./GitIcon";
import { splitPath } from "./gitPath";

/** A user-actionable sidebar row. */
export type SidebarRef =
  | { kind: "branch"; name: string }
  | { kind: "remote"; remote: string; branch: string; ref: string }
  | { kind: "tag"; name: string }
  | { kind: "worktree"; worktree: GitWorktree };

/** Stable selection/identity key for a sidebar row. */
export function sidebarKey(ref: SidebarRef): string {
  switch (ref.kind) {
    case "branch":
      return `b:${ref.name}`;
    case "remote":
      return `r:${ref.ref}`;
    case "tag":
      return `t:${ref.name}`;
    case "worktree":
      return `w:${ref.worktree.path}`;
  }
}

export function GitSidebar({
  overview,
  palette,
  width,
  selectedKey,
  onSelect,
  onActivate,
  onContext,
  onAddWorktree,
  onStashApply,
  onStashPop,
  onStashDrop,
}: {
  overview: GitOverview | null;
  palette: string[];
  width: number;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onActivate: (ref: SidebarRef) => void;
  onContext: (event: MouseEvent, ref: SidebarRef) => void;
  onAddWorktree: () => void;
  onStashApply: (index: number) => void;
  onStashPop: (index: number) => void;
  onStashDrop: (index: number) => void;
}) {
  const { t } = useTranslation();
  if (!overview) {
    return <div className="git-sidebar" style={{ width, flex: "0 0 auto", minWidth: 0 }} />;
  }

  // Wire single-click select, double-click activate, and right-click context.
  const rowHandlers = (ref: SidebarRef) => ({
    onClick: () => onSelect(sidebarKey(ref)),
    onDoubleClick: () => onActivate(ref),
    onContextMenu: (event: MouseEvent) => onContext(event, ref),
  });
  const cls = (ref: SidebarRef, extra = "") =>
    `git-sb-item${extra ? ` ${extra}` : ""}${selectedKey === sidebarKey(ref) ? " sel" : ""}`;

  return (
    <div className="git-sidebar" style={{ width, flex: "0 0 auto", minWidth: 0 }}>
      <div className="git-sb-group"><span className="t">{t("git.local")}</span></div>
      {overview.localBranches.map((branch) => {
        const ref: SidebarRef = { kind: "branch", name: branch.name };
        const isDefault = overview.defaultBranch === branch.name;
        return (
          <div key={branch.name} className={cls(ref, branch.current ? "active" : "")} {...rowHandlers(ref)}>
            <span className="gl" style={{ color: laneColor(branch.lane, palette) }}>
              <GitIcon name="branch" size={15} />
            </span>
            <span className="nm">{branch.name}</span>
            {isDefault ? <span className="git-sb-tag">{t("git.defaultBranch")}</span> : null}
            {branch.ahead > 0 ? <span className="ab"><span className="up">↑{branch.ahead}</span></span> : null}
            {branch.behind > 0 ? <span className="ab"><span className="down">↓{branch.behind}</span></span> : null}
          </div>
        );
      })}

      {overview.remotes.length > 0 ? (
        <div className="git-sb-group"><span className="t">{t("git.remotes")}</span></div>
      ) : null}
      {overview.remotes.map((remote) => (
        <div key={remote.name}>
          <div className="git-sb-item git-sb-remote-head">
            <span className="gl" style={{ color: "var(--git-text-2)" }}><GitIcon name="remote" size={15} /></span>
            <span className="nm">{remote.name}</span>
            <span className="gl" style={{ color: "var(--git-text-3)" }}><GitIcon name="chevronD" size={14} /></span>
          </div>
          {remote.branches.map((branchName) => {
            const ref: SidebarRef = {
              kind: "remote",
              remote: remote.name,
              branch: branchName,
              ref: `${remote.name}/${branchName}`,
            };
            return (
              <div key={branchName} className={cls(ref, "git-sb-sub")} {...rowHandlers(ref)}>
                <span className="gl" style={{ color: "var(--git-text-3)" }}><GitIcon name="branch" size={14} /></span>
                <span className="nm" style={{ color: "var(--git-text-2)" }}>{branchName}</span>
              </div>
            );
          })}
        </div>
      ))}

      {overview.tags.length > 0 ? (
        <div className="git-sb-group"><span className="t">{t("git.tags")}</span></div>
      ) : null}
      {overview.tags.map((tag) => {
        const ref: SidebarRef = { kind: "tag", name: tag };
        return (
          <div key={tag} className={cls(ref)} {...rowHandlers(ref)}>
            <span className="gl" style={{ color: "var(--git-amber)" }}><GitIcon name="tag" size={15} /></span>
            <span className="nm">{tag}</span>
          </div>
        );
      })}

      <div className="git-sb-group">
        <span className="t">{t("git.worktrees")}</span>
        <button type="button" className="git-sb-add" onClick={onAddWorktree} title={t("git.addWorktree")}>
          <GitIcon name="plus" size={14} />
        </button>
      </div>
      {overview.worktrees.map((worktree) => {
        const ref: SidebarRef = { kind: "worktree", worktree };
        const { name } = splitPath(worktree.path.replace(/\\/g, "/"));
        return (
          <div
            key={worktree.path}
            className={cls(ref, worktree.isCurrent ? "active" : "")}
            title={worktree.path}
            {...rowHandlers(ref)}
          >
            <span className="gl" style={{ color: "var(--git-text-2)" }}><GitIcon name="worktree" size={15} /></span>
            <span className="nm">{name || worktree.path}</span>
            {worktree.branch ? <span className="git-sb-tag">{worktree.branch}</span> : null}
          </div>
        );
      })}

      {overview.stashes.length > 0 ? (
        <div className="git-sb-group"><span className="t">{t("git.stashes")}</span></div>
      ) : null}
      {overview.stashes.map((stash) => (
        <div key={stash.index} className="git-sb-item git-sb-stash">
          <span className="gl" style={{ color: "var(--git-text-2)" }}><GitIcon name="stash" size={15} /></span>
          <span className="nm" title={stash.message}>{stash.message || stash.name}</span>
          <span className="git-stash-actions">
            <button type="button" onClick={() => onStashApply(stash.index)} title={t("git.stashApply")}>
              <GitIcon name="check" size={13} />
            </button>
            <button type="button" onClick={() => onStashPop(stash.index)} title={t("git.stashPop")}>
              <GitIcon name="pull" size={13} />
            </button>
            <button type="button" onClick={() => onStashDrop(stash.index)} title={t("git.stashDrop")}>
              <GitIcon name="more" size={13} />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
