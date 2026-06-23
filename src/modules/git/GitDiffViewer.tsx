// Unified-diff viewer with line gutters and add/del tinting, ported from the
// mockup and fed by `git_diff_*` results.
import { useTranslation } from "react-i18next";
import type { GitChangedFile, GitDiffLine } from "./gitTypes";
import { splitPath } from "./gitPath";
import { GitIcon } from "./GitIcon";

const SIGN: Record<GitDiffLine["t"], string> = { add: "+", del: "-", ctx: " ", hunk: "" };

export function GitDiffViewer({
  file,
  lines,
  loading,
}: {
  file: GitChangedFile | null;
  lines: GitDiffLine[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  if (!file) {
    return (
      <div className="git-diff">
        <div className="git-empty">
          <span className="gl"><GitIcon name="file" size={34} /></span>
          {t("git.selectFileForDiff")}
        </div>
      </div>
    );
  }
  const { dir, name } = splitPath(file.path);
  return (
    <div className="git-diff">
      <div className="git-diff-head">
        <GitIcon name="file" size={15} />
        <span className="nm">{name}</span>
        <span className="dir">{dir}</span>
        <span className="churn">
          <span className="a">+{Math.max(file.add, 0)}</span>
          <span className="d">−{Math.max(file.del, 0)}</span>
        </span>
      </div>
      <div className="git-diff-body">
        {loading ? (
          <div className="git-diff-loading">{t("git.loadingDiff")}</div>
        ) : lines.length === 0 ? (
          <div className="git-diff-loading">{t("git.noDiff")}</div>
        ) : (
          lines.map((line, i) => {
            const num = line.t === "add" ? line.n : line.t === "del" ? line.o : line.t === "ctx" ? line.n : "";
            return (
              <div key={i} className={`git-dl ${line.t}`}>
                <div className="gut">{num ?? ""}</div>
                <div className="code">
                  {SIGN[line.t]}
                  {line.t === "hunk" ? line.c : ` ${line.c}`}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
