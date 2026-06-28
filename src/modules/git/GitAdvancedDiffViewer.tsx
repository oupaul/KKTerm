import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { GitChangedFile, GitDiffLine } from "./gitTypes";
import { splitPath } from "./gitPath";
import { GitIcon } from "./GitIcon";
import { DiffSideBySide } from "../compare/DiffSideBySide";

export function GitAdvancedDiffViewer({
  file,
  lines,
  loading,
  onClose,
}: {
  file: GitChangedFile;
  lines: GitDiffLine[];
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { dir, name } = splitPath(file.path);

  return (
    <div className="git-adv-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <div className="git-adv" role="dialog" aria-modal="true" aria-label={t("git.advancedDiffTitle", { file: name })}>
        <div className="git-adv-head">
          <div className="git-adv-title">
            <GitIcon name="file" size={16} />
            <span className="name">{name}</span>
            <span className="dir">{dir}</span>
          </div>
          <button type="button" className="git-icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </div>
        <DiffSideBySide
          lines={lines}
          loading={loading}
          leftLabel={t("git.diffOriginal")}
          rightLabel={t("git.diffModified")}
          resetKey={file.path}
        />
      </div>
    </div>
  );
}
