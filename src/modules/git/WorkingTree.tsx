// Commit workflow: staged / changed file lists with stage toggles and a commit
// box. Mirrors the mockup's working-tree pane, wired to live `git_status`.
import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { GitChangedFile } from "./gitTypes";
import { splitPath } from "./gitPath";
import { statusClass } from "./GitDetail";
import { GitIcon } from "./GitIcon";

export interface WorkingTreeSelection {
  key: string;
  file: GitChangedFile;
  staged: boolean;
  untracked: boolean;
}

export function WorkingTree({
  staged,
  unstaged,
  selectedKey,
  onSelect,
  onStageFile,
  onUnstageFile,
  onStageAll,
  onUnstageAll,
  onDiscardFile,
  onDiscardAll,
  onCommit,
  committing,
  style,
}: {
  staged: GitChangedFile[];
  unstaged: GitChangedFile[];
  selectedKey: string | null;
  onSelect: (selection: WorkingTreeSelection) => void;
  onStageFile: (file: GitChangedFile) => void;
  onUnstageFile: (file: GitChangedFile) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onDiscardFile: (file: GitChangedFile) => void;
  onDiscardAll: () => void;
  onCommit: (message: string, amend: boolean) => Promise<boolean>;
  committing: boolean;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [amend, setAmend] = useState(false);

  const renderRow = (file: GitChangedFile, key: string, isStaged: boolean) => {
    const { dir, name } = splitPath(file.path);
    const untracked = file.status === "?";
    return (
      <div
        key={key}
        className={`git-wt-row${selectedKey === key ? " sel" : ""}`}
        onClick={() => onSelect({ key, file, staged: isStaged, untracked })}
      >
        <span
          className={`git-chk${isStaged ? " on" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            if (isStaged) {
              onUnstageFile(file);
            } else {
              onStageFile(file);
            }
          }}
        >
          {isStaged ? <GitIcon name="check" size={11} /> : null}
        </span>
        <span className={`git-st ${statusClass(file.status)}`}>{file.status}</span>
        <span className="path"><span className="dir2">{dir}</span>{name}</span>
        <span className="churn">
          <span className="a">+{Math.max(file.add, 0)}</span>
          <span className="d">−{Math.max(file.del, 0)}</span>
        </span>
        {!isStaged ? (
          <span className="git-wt-row-actions">
            <button
              type="button"
              title={t("git.discard")}
              onClick={(event) => {
                event.stopPropagation();
                onDiscardFile(file);
              }}
            >
              <GitIcon name="trash" size={13} />
            </button>
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="git-wt-pane" style={style}>
      <div className="git-wt-section-head">
        <span className="t">{t("git.staged")}</span>
        <span className="cnt">{staged.length}</span>
        <button type="button" className="mini" onClick={onUnstageAll} disabled={staged.length === 0}>
          {t("git.unstageAll")}
        </button>
      </div>
      <div className="git-wt-list staged">
        {staged.length > 0
          ? staged.map((file, i) => renderRow(file, `s${i}`, true))
          : <div className="git-wt-empty">{t("git.nothingStaged")}</div>}
      </div>

      <div className="git-wt-section-head">
        <span className="t">{t("git.changes")}</span>
        <span className="cnt">{unstaged.length}</span>
        <button type="button" className="mini" onClick={onDiscardAll} disabled={unstaged.length === 0}>
          {t("git.discardAll")}
        </button>
        <button type="button" className="mini" onClick={onStageAll} disabled={unstaged.length === 0}>
          {t("git.stageAll")}
        </button>
      </div>
      <div className="git-wt-list">
        {unstaged.length > 0
          ? unstaged.map((file, i) => renderRow(file, `u${i}`, false))
          : <div className="git-wt-empty">{t("git.noChanges")}</div>}
      </div>

      <div className="git-wt-commit-box">
        <textarea
          value={message}
          placeholder={t("git.commitMessagePlaceholder")}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="row2">
          <label className="git-amend">
            <span
              className={`git-chk${amend ? " on" : ""}`}
              onClick={() => setAmend((value) => !value)}
            >
              {amend ? <GitIcon name="check" size={11} /> : null}
            </span>
            {t("git.amend")}
          </label>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="git-btn primary"
            disabled={committing || (staged.length === 0 && !amend) || message.trim().length === 0}
            onClick={() => {
              void onCommit(message.trim(), amend).then((committed) => {
                if (committed) {
                  setMessage("");
                  setAmend(false);
                }
              });
            }}
          >
            <GitIcon name="commit" size={15} />
            <span>{t("git.commitFiles", { count: staged.length })}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
