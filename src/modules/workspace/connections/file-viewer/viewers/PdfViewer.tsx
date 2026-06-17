import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { invokeCommand } from "../../../../../lib/tauri";

const SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/**
 * Renders PDF pages one at a time as PNGs produced by the external Poppler
 * dependency (`render_pdf_view`). The dependency gate guarantees the renderer is
 * present before this mounts.
 */
export function PdfViewer({ filePath }: { filePath: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scaleIndex, setScaleIndex] = useState(2);
  const [pngBase64, setPngBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scale = SCALE_STEPS[scaleIndex];

  const render = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await invokeCommand("render_pdf_view", {
        request: { path: filePath, page, scale },
      });
      setPngBase64(result.base64);
      setPageCount(result.pageCount);
    } catch (renderError) {
      setPngBase64(null);
      setError(renderError instanceof Error ? renderError.message : String(renderError));
    } finally {
      setLoading(false);
    }
  }, [filePath, page, scale]);

  useEffect(() => {
    void render();
  }, [render]);

  const atFirst = page <= 1;
  const atLast = pageCount > 0 && page >= pageCount;

  return (
    <div className="file-viewer-pdf">
      <div className="file-viewer-image-toolbar">
        <button
          className="toolbar-button"
          disabled={atFirst}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          type="button"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="file-viewer-pdf-page">
          {pageCount > 0
            ? t("workspace.fileViewer.pdfPage", { page, count: pageCount })
            : page}
        </span>
        <button
          className="toolbar-button"
          disabled={atLast}
          onClick={() => setPage((value) => value + 1)}
          type="button"
        >
          <ChevronRight size={14} />
        </button>
        <div className="file-viewer-toolbar-spacer" />
        <button
          className="toolbar-button"
          disabled={scaleIndex <= 0}
          onClick={() => setScaleIndex((value) => Math.max(0, value - 1))}
          type="button"
        >
          −
        </button>
        <span className="file-viewer-image-zoom">{Math.round(scale * 100)}%</span>
        <button
          className="toolbar-button"
          disabled={scaleIndex >= SCALE_STEPS.length - 1}
          onClick={() => setScaleIndex((value) => Math.min(SCALE_STEPS.length - 1, value + 1))}
          type="button"
        >
          +
        </button>
      </div>
      <div className="file-viewer-image-canvas">
        {error ? (
          <div className="file-viewer-status file-viewer-status-error">{error}</div>
        ) : loading && !pngBase64 ? (
          <div className="file-viewer-status">{t("workspace.fileViewer.loading")}</div>
        ) : pngBase64 ? (
          <img alt={t("workspace.fileViewer.kind.pdf")} draggable={false} src={`data:image/png;base64,${pngBase64}`} />
        ) : null}
      </div>
    </div>
  );
}
