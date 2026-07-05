import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "../../../../../lib/reicon";
import { invokeCommand } from "../../../../../lib/tauri";
import type { DashboardBackground } from "../../../../dashboard/types";
import { FileViewerBackgroundLayer } from "../FileViewerBackgroundLayer";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { Chip, FootSeg, IconButton } from "../chrome/controls";

const SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/**
 * Renders PDF pages one at a time as PNGs produced by the external Poppler
 * dependency (`render_pdf_view`). The dependency gate guarantees the renderer is
 * present before this mounts. Page nav + zoom live in the shell toolbar; the page
 * renders on the shared image stage.
 */
export function PdfViewer({
  active,
  background,
  filePath,
}: {
  active: boolean;
  background: DashboardBackground | null;
  filePath: string;
}) {
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
  const pageLabel =
    pageCount > 0 ? t("workspace.fileViewer.pdfPage", { page, count: pageCount }) : String(page);

  return (
    <div className="fv-imgstage">
      <FileViewerBackgroundLayer active={active} background={background} />
      <ChromePortals
        center={
          <>
            <IconButton
              icon={ChevronLeft}
              title={t("common.back")}
              size={16}
              disabled={atFirst}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            />
            <Chip>{pageLabel}</Chip>
            <IconButton
              icon={ChevronRight}
              title={t("common.forward")}
              size={16}
              disabled={atLast}
              onClick={() => setPage((value) => value + 1)}
            />
            <IconButton
              icon={ZoomOut}
              title={t("workspace.fileViewer.zoomOut")}
              size={16}
              disabled={scaleIndex <= 0}
              onClick={() => setScaleIndex((value) => Math.max(0, value - 1))}
            />
            <Chip>{`${Math.round(scale * 100)}%`}</Chip>
            <IconButton
              icon={ZoomIn}
              title={t("workspace.fileViewer.zoomIn")}
              size={16}
              disabled={scaleIndex >= SCALE_STEPS.length - 1}
              onClick={() => setScaleIndex((value) => Math.min(SCALE_STEPS.length - 1, value + 1))}
            />
          </>
        }
        footer={
          <>
            <FootSeg>{pageLabel}</FootSeg>
            <FootSeg>{`${Math.round(scale * 100)}%`}</FootSeg>
          </>
        }
      />
      {error ? (
        <div className="file-viewer-status file-viewer-status-error">{error}</div>
      ) : loading && !pngBase64 ? (
        <div className="file-viewer-status">{t("workspace.fileViewer.loading")}</div>
      ) : pngBase64 ? (
        <img
          className="fv-img"
          alt={t("workspace.fileViewer.kind.pdf")}
          draggable={false}
          src={`data:image/png;base64,${pngBase64}`}
        />
      ) : null}
    </div>
  );
}
