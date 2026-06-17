import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import type { WorkspaceTab } from "../../../../types";
import { invokeCommand, type FileViewProbe } from "../../../../lib/tauri";
import {
  availableViewerKinds,
  detectViewerKind,
  fileBaseName,
  viewerLoadsText,
  viewerUsesExternalDependency,
  type ViewerKind,
} from "./fileViewerModel";
import { TextCodeViewer } from "./viewers/TextCodeViewer";
import { MarkdownViewer } from "./viewers/MarkdownViewer";
import { CsvViewer } from "./viewers/CsvViewer";
import { JsonViewer } from "./viewers/JsonViewer";
import { ImageViewer } from "./viewers/ImageViewer";
import { LogViewer } from "./viewers/LogViewer";
import { HexViewer } from "./viewers/HexViewer";
import { PdfDependencyGate } from "./viewers/PdfDependencyGate";

/** Per-kind read caps (bytes). Text-shaped viewers and images differ widely. */
const TEXT_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const HEX_MAX_BYTES = 1 * 1024 * 1024;

function maxBytesForKind(kind: ViewerKind): number {
  if (kind === "image") {
    return IMAGE_MAX_BYTES;
  }
  if (kind === "hex") {
    return HEX_MAX_BYTES;
  }
  return TEXT_MAX_BYTES;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

interface LoadedContent {
  kind: ViewerKind;
  text?: string;
  base64?: string;
  magic?: string | null;
  truncated: boolean;
}

export function FileViewerWorkspace({
  isActive,
  tab,
}: {
  isActive: boolean;
  tab: WorkspaceTab;
}) {
  const { t } = useTranslation();
  const filePath = tab.connection?.localStartupDirectory?.trim() ?? "";
  const [probe, setProbe] = useState<FileViewProbe | null>(null);
  const [override, setOverride] = useState<ViewerKind | null>(null);
  const [content, setContent] = useState<LoadedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(
    async (forcedKind: ViewerKind | null) => {
      if (!filePath) {
        setError(t("workspace.fileViewer.noFile"));
        return;
      }
      setLoading(true);
      setError("");
      try {
        const probed = await invokeCommand("probe_file_view", {
          request: { path: filePath },
        });
        setProbe(probed);
        const kind =
          forcedKind ??
          detectViewerKind({ path: filePath, magic: probed.magic, isText: probed.isText });
        if (viewerUsesExternalDependency(kind)) {
          // The dependency-backed viewer (PDF) loads its own content through the
          // external tool; no direct read here.
          setContent({ kind, magic: probed.magic, truncated: false });
          return;
        }
        const maxBytes = maxBytesForKind(kind);
        if (viewerLoadsText(kind)) {
          const result = await invokeCommand("read_file_view_text", {
            request: { path: filePath, maxBytes },
          });
          setContent({ kind, text: result.text, magic: probed.magic, truncated: result.truncated });
        } else {
          if (kind === "image" && probed.totalSize > IMAGE_MAX_BYTES) {
            setContent(null);
            setError(t("workspace.fileViewer.imageTooLarge"));
            return;
          }
          const result = await invokeCommand("read_file_view_bytes", {
            request: { path: filePath, offset: 0, length: maxBytes },
          });
          setContent({
            kind,
            base64: result.base64,
            magic: probed.magic,
            truncated: !result.eof,
          });
        }
      } catch (loadError) {
        setContent(null);
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        setLoading(false);
      }
    },
    [filePath, t],
  );

  useEffect(() => {
    void load(override);
    // Reload when the file, the chosen viewer override, or an explicit reload
    // changes. `load` is stable per filePath.
  }, [load, override, reloadToken]);

  const kinds = probe
    ? availableViewerKinds({ path: filePath, magic: probe.magic, isText: probe.isText })
    : [];
  const activeKind = content?.kind ?? override ?? (kinds[0] as ViewerKind | undefined);

  return (
    <div className={isActive ? "file-viewer-workspace active" : "file-viewer-workspace"}>
      <div className="file-viewer-toolbar">
        <span className="file-viewer-name" title={filePath}>
          {fileBaseName(filePath) || t("connections.fileView")}
        </span>
        {probe ? <span className="file-viewer-size">{formatBytes(probe.totalSize)}</span> : null}
        <div className="file-viewer-toolbar-spacer" />
        {kinds.length > 1 ? (
          <div className="file-viewer-mode-switch">
            {kinds.map((kind) => (
              <button
                className={`toolbar-button ${kind === activeKind ? "is-active" : ""}`}
                key={kind}
                onClick={() => setOverride(kind)}
                type="button"
              >
                {t(`workspace.fileViewer.kind.${kind}`)}
              </button>
            ))}
          </div>
        ) : null}
        <button
          className="toolbar-button"
          onClick={() => setReloadToken((token) => token + 1)}
          title={t("common.refresh")}
          type="button"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {content?.truncated ? (
        <div className="file-viewer-notice">{t("workspace.fileViewer.truncated")}</div>
      ) : null}

      <div className="file-viewer-body">
        {loading ? (
          <div className="file-viewer-status">{t("workspace.fileViewer.loading")}</div>
        ) : error ? (
          <div className="file-viewer-status file-viewer-status-error">{error}</div>
        ) : content ? (
          <FileViewerContent content={content} filePath={filePath} isActive={isActive} />
        ) : null}
      </div>
    </div>
  );
}

function FileViewerContent({
  content,
  filePath,
  isActive,
}: {
  content: LoadedContent;
  filePath: string;
  isActive: boolean;
}) {
  switch (content.kind) {
    case "markdown":
      return <MarkdownViewer text={content.text ?? ""} />;
    case "csv":
      return (
        <CsvViewer
          delimiter={filePath.toLowerCase().endsWith(".tsv") ? "\t" : undefined}
          text={content.text ?? ""}
        />
      );
    case "json":
      return <JsonViewer text={content.text ?? ""} />;
    case "image":
      return <ImageViewer base64={content.base64 ?? ""} magic={content.magic} path={filePath} />;
    case "pdf":
      return <PdfDependencyGate filePath={filePath} isActive={isActive} />;
    case "log":
      return (
        <LogViewer
          filePath={filePath}
          isActive={isActive}
          maxBytes={TEXT_MAX_BYTES}
          text={content.text ?? ""}
        />
      );
    case "hex":
      return <HexViewer base64={content.base64 ?? ""} />;
    case "text":
    default:
      return <TextCodeViewer text={content.text ?? ""} />;
  }
}
