import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, RotateCw, Scan, ZoomIn, ZoomOut } from "lucide-react";
import { fileExtension } from "../fileViewerModel";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { Chip, FootSeg, IconButton } from "../chrome/controls";

const MIME_BY_TOKEN: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  svg: "image/svg+xml",
};

/**
 * Renders an image from base64 bytes via a data URL with zoom / fit / actual-size
 * / rotate controls in the shell toolbar and a checkerboard stage. Web-native
 * formats render directly; an SVG loaded through `<img src>` cannot execute
 * embedded scripts, so this path is safe without extra sanitization.
 */
export function ImageViewer({
  base64,
  path,
  magic,
}: {
  base64: string;
  path: string;
  magic?: string | null;
}) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  const mime = useMemo(() => {
    const token = magic ?? fileExtension(path);
    return MIME_BY_TOKEN[token] ?? "application/octet-stream";
  }, [magic, path]);
  const src = `data:${mime};base64,${base64}`;

  const zoomLabel = fit ? t("workspace.fileViewer.fit") : `${Math.round(zoom * 100)}%`;

  return (
    <div className="fv-imgstage">
      <ChromePortals
        center={
          <>
            <IconButton
              icon={ZoomOut}
              title={t("workspace.fileViewer.zoomOut")}
              size={16}
              onClick={() => {
                setFit(false);
                setZoom((value) => Math.max(0.1, value - 0.25));
              }}
            />
            <Chip
              title={t("workspace.fileViewer.actualSize")}
              onClick={() => {
                setFit(false);
                setZoom(1);
              }}
            >
              {zoomLabel}
            </Chip>
            <IconButton
              icon={ZoomIn}
              title={t("workspace.fileViewer.zoomIn")}
              size={16}
              onClick={() => {
                setFit(false);
                setZoom((value) => Math.min(8, value + 0.25));
              }}
            />
            <IconButton
              icon={Maximize2}
              title={t("workspace.fileViewer.fit")}
              size={16}
              on={fit}
              onClick={() => setFit((value) => !value)}
            />
            <IconButton
              icon={Scan}
              title={t("workspace.fileViewer.actualSize")}
              size={16}
              onClick={() => {
                setFit(false);
                setZoom(1);
              }}
            />
            <IconButton
              icon={RotateCw}
              title={t("workspace.fileViewer.rotate")}
              size={16}
              onClick={() => setRotation((value) => (value + 90) % 360)}
            />
          </>
        }
        footer={
          <>
            {dims ? (
              <FootSeg>
                {t("workspace.fileViewer.dimensions", { width: dims.width, height: dims.height })}
              </FootSeg>
            ) : null}
            <FootSeg>{zoomLabel}</FootSeg>
          </>
        }
      />
      <img
        className={fit ? "fv-img fit" : "fv-img"}
        alt={t("connections.fileView")}
        draggable={false}
        src={src}
        onLoad={(event) =>
          setDims({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })
        }
        style={{ transform: `rotate(${rotation}deg) scale(${fit ? 1 : zoom})` }}
      />
    </div>
  );
}
