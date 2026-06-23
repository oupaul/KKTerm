// Git Browser sidebar: local branches (with ahead/behind), remotes and their
// branches, tags, and stashes. Branch/tag rows check out on click; stash rows
// expose apply/pop/drop affordances.
import { useTranslation } from "react-i18next";
import type { GitOverview } from "./gitTypes";
import { laneColor } from "./gitPalette";
import { GitIcon } from "./GitIcon";

export function GitSidebar({
  overview,
  palette,
  onCheckout,
  onStashApply,
  onStashPop,
  onStashDrop,
}: {
  overview: GitOverview | null;
  palette: string[];
  onCheckout: (reference: string) => void;
  onStashApply: (index: number) => void;
  onStashPop: (index: number) => void;
  onStashDrop: (index: number) => void;
}) {
  const { t } = useTranslation();
  if (!overview) {
    return <div className="git-sidebar" />;
  }
  return (
    <div className="git-sidebar">
      <div className="git-sb-group"><span className="t">{t("git.local")}</span></div>
      {overview.localBranches.map((branch) => (
        <button
          key={branch.name}
          type="button"
          className={`git-sb-item${branch.current ? " active" : ""}`}
          onClick={() => onCheckout(branch.name)}
        >
          <span className="gl" style={{ color: laneColor(branch.lane, palette) }}>
            <GitIcon name="branch" size={15} />
          </span>
          <span className="nm">{branch.name}</span>
          {branch.ahead > 0 ? <span className="ab"><span className="up">↑{branch.ahead}</span></span> : null}
          {branch.behind > 0 ? <span className="ab"><span className="down">↓{branch.behind}</span></span> : null}
        </button>
      ))}

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
          {remote.branches.map((branchName) => (
            <button
              key={branchName}
              type="button"
              className="git-sb-item git-sb-sub"
              onClick={() => onCheckout(`${remote.name}/${branchName}`)}
            >
              <span className="gl" style={{ color: "var(--git-text-3)" }}><GitIcon name="branch" size={14} /></span>
              <span className="nm" style={{ color: "var(--git-text-2)" }}>{branchName}</span>
            </button>
          ))}
        </div>
      ))}

      {overview.tags.length > 0 ? (
        <div className="git-sb-group"><span className="t">{t("git.tags")}</span></div>
      ) : null}
      {overview.tags.map((tag) => (
        <button key={tag} type="button" className="git-sb-item" onClick={() => onCheckout(tag)}>
          <span className="gl" style={{ color: "var(--git-amber)" }}><GitIcon name="tag" size={15} /></span>
          <span className="nm">{tag}</span>
        </button>
      ))}

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
