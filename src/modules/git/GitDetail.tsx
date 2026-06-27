// Commit inspector head + changed-files list for the History detail panel.
import { useTranslation } from "react-i18next";
import type { GitChangedFile, GitCommit } from "./gitTypes";
import { splitPath } from "./gitPath";
import { Avatar } from "./GitGraph";
import { GitIcon } from "./GitIcon";
import { useWorkspaceStore } from "../../store";

function formatExactDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DetailHead({ commit }: { commit: GitCommit }) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value).then(
      () => showStatusBarNotice(t("git.copied"), { tone: "success" }),
      () => undefined,
    );
  };
  const parents = commit.parents;
  return (
    <div className="git-detail-head">
      <div className="msg">{commit.subject}</div>
      {commit.body ? <div className="body-msg">{commit.body}</div> : null}
      <div className="git-detail-meta">
        <Avatar name={commit.authorName} email={commit.authorEmail} large />
        <div className="who">
          <span className="n">{commit.authorName}</span>
          <span className="e">{commit.authorEmail}</span>
        </div>
        <div className="when">
          {t("git.committed")}
          <br />
          {formatExactDate(commit.isoDate)}
        </div>
      </div>
      <div className="git-sha-row">
        <span className="git-sha-chip">
          <span className="k">{t("git.commitLabel")}</span>
          {commit.shortId}
          <button type="button" className="copy" onClick={() => copy(commit.id)} aria-label={t("git.copySha")}>
            <GitIcon name="copy" size={13} />
          </button>
        </span>
        {parents.length > 0 ? (
          <span className="git-sha-chip">
            <span className="k">{parents.length > 1 ? t("git.mergeLabel") : t("git.parentLabel")}</span>
            {parents.map((p) => p.slice(0, 7)).join(" ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ChangedFiles({
  files,
  selectedIndex,
  onSelect,
  onOpenDiff,
  label,
}: {
  files: GitChangedFile[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onOpenDiff?: (index: number) => void;
  label?: string;
}) {
  const { t } = useTranslation();
  const add = files.reduce((sum, f) => sum + Math.max(f.add, 0), 0);
  const del = files.reduce((sum, f) => sum + Math.max(f.del, 0), 0);
  return (
    <>
      <div className="git-files-head">
        <span>{(label ?? t("git.changedFiles"))} · {files.length}</span>
        <span className="stat">
          <span className="add">+{add}</span>
          <span className="del">−{del}</span>
        </span>
      </div>
      <div className="git-files-list">
        {files.map((file, i) => {
          const { dir, name } = splitPath(file.path);
          return (
            <div
              key={`${file.path}-${i}`}
              className={`git-file-row${selectedIndex === i ? " sel" : ""}`}
              onClick={() => onSelect(i)}
              onDoubleClick={() => onOpenDiff?.(i)}
            >
              <span className={`git-st ${statusClass(file.status)}`}>{file.status}</span>
              <span className="path">
                <span className="name">{name}</span>
                <span className="dir">{dir.replace(/\/$/, "")}</span>
              </span>
              <span className="churn">
                <span className="a">+{Math.max(file.add, 0)}</span>
                <span className="d">−{Math.max(file.del, 0)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Map a git status letter to a stable CSS modifier class. */
export function statusClass(status: string): string {
  const letter = status.charAt(0).toUpperCase();
  if (letter === "A" || letter === "?") {
    return "A";
  }
  if (letter === "D") {
    return "D";
  }
  if (letter === "R" || letter === "C") {
    return "R";
  }
  return "M";
}
