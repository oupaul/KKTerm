// File Compare overlay. Resolves two local readable paths (see compareTypes),
// probes both, picks a unified mode (text / image / hex), and renders the
// matching comparison body. Mounted as an app-window overlay portalled to
// document.body, mirroring the Git Browser. Reuses the `git-adv-*` frame classes
// so it inherits the same color variables and chrome.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { invokeCommand, type FileViewProbe } from "../../lib/tauri";
import { gitDiffNoIndex } from "../git/gitCommands";
import { detectViewerKind } from "../workspace/connections/file-viewer/fileViewerModel";
import type { GitDiffLine } from "../git/gitTypes";
import type { CompareView } from "./compareTypes";
import { DiffSideBySide } from "./DiffSideBySide";
import { CompareImageView } from "./CompareImageView";
import { CompareHexView } from "./CompareHexView";

type CompareMode = "text" | "image" | "hex";

function isImage(probe: FileViewProbe, path: string): boolean {
  return detectViewerKind({ path, magic: probe.magic, isText: probe.isText }) === "image";
}

function autoMode(left: FileViewProbe, right: FileViewProbe, view: CompareView): CompareMode {
  if (isImage(left, view.left.localPath) && isImage(right, view.right.localPath)) {
    return "image";
  }
  if (left.isText && right.isText) {
    return "text";
  }
  return "hex";
}

export function CompareViewer({ view, onClose }: { view: CompareView; onClose: () => void }) {
  const { t } = useTranslation();
  const [probes, setProbes] = useState<{ left: FileViewProbe; right: FileViewProbe } | null>(null);
  const [probeError, setProbeError] = useState("");
  const [override, setOverride] = useState<CompareMode | null>(null);

  // Text-mode diff lines, loaded lazily once text mode is active.
  const [diffLines, setDiffLines] = useState<GitDiffLine[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState("");

  useEffect(() => {
    let alive = true;
    setProbes(null);
    setProbeError("");
    setOverride(null);
    void (async () => {
      try {
        const [left, right] = await Promise.all([
          invokeCommand("probe_file_view", { request: { path: view.left.localPath } }),
          invokeCommand("probe_file_view", { request: { path: view.right.localPath } }),
        ]);
        if (alive) {
          setProbes({ left, right });
        }
      } catch (error) {
        if (alive) {
          setProbeError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [view.left.localPath, view.right.localPath]);

  const computedAuto = probes ? autoMode(probes.left, probes.right, view) : "text";
  const mode = override ?? computedAuto;

  // Which modes the switch offers: text and hex are always available (any file
  // can be diffed line-by-line or byte-by-byte); image only when both sides look
  // like images, since rendering a non-image as an image is meaningless.
  const availableModes = useMemo<CompareMode[]>(() => {
    const modes: CompareMode[] = ["text", "hex"];
    if (probes && isImage(probes.left, view.left.localPath) && isImage(probes.right, view.right.localPath)) {
      modes.unshift("image");
    }
    return modes;
  }, [probes, view.left.localPath, view.right.localPath]);

  useEffect(() => {
    if (mode !== "text") {
      return;
    }
    let alive = true;
    setDiffLoading(true);
    setDiffError("");
    void (async () => {
      try {
        const lines = await gitDiffNoIndex(view.left.localPath, view.right.localPath, {
          fullContext: true,
        });
        if (alive) {
          setDiffLines(lines);
        }
      } catch (error) {
        if (alive) {
          setDiffError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (alive) {
          setDiffLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, view.left.localPath, view.right.localPath]);

  return (
    <div
      className="git-adv-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="git-adv" role="dialog" aria-modal="true" aria-label={t("compare.title")}>
        <div className="git-adv-head compare-head">
          <div className="compare-head-file" title={view.left.origin}>
            <span className="compare-head-name">{view.left.label}</span>
            <span className="compare-head-origin">{view.left.origin}</span>
          </div>
          <span className="compare-head-vs">{t("compare.versus")}</span>
          <div className="compare-head-file" title={view.right.origin}>
            <span className="compare-head-name">{view.right.label}</span>
            <span className="compare-head-origin">{view.right.origin}</span>
          </div>
          <div className="compare-head-spacer" />
          <div className="git-adv-mode" role="group" aria-label={t("compare.modeLabel")}>
            {availableModes.map((value) => (
              <button
                key={value}
                type="button"
                className={mode === value ? "active" : ""}
                onClick={() => setOverride(value)}
              >
                {t(`compare.mode.${value}`)}
              </button>
            ))}
          </div>
          <button type="button" className="git-icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </div>

        {probeError ? (
          <div className="compare-status compare-status-error">{probeError}</div>
        ) : !probes ? (
          <div className="compare-status">{t("compare.loading")}</div>
        ) : mode === "image" ? (
          <CompareImageView leftPath={view.left.localPath} rightPath={view.right.localPath} />
        ) : mode === "hex" ? (
          <CompareHexView leftPath={view.left.localPath} rightPath={view.right.localPath} />
        ) : diffError ? (
          <div className="compare-status compare-status-error">{diffError}</div>
        ) : (
          <DiffSideBySide
            lines={diffLines}
            loading={diffLoading}
            leftLabel={view.left.label}
            rightLabel={view.right.label}
            resetKey={`${view.left.localPath}|${view.right.localPath}`}
          />
        )}
      </div>
    </div>
  );
}
