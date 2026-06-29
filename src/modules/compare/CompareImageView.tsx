// Three-way image comparison: the left image, the right image, and a computed
// per-pixel difference heatmap (red where the left side is brighter, blue where
// the right side is brighter; near-black where they match). A tolerance slider
// suppresses small differences. Images are read as bounded base64 and rendered
// through data URLs (an <img> cannot execute embedded SVG scripts).
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../../lib/tauri";
import { fileExtension } from "../workspace/connections/file-viewer/fileViewerModel";
import { buildHeatmapInWorker } from "./compareWorkerClient";

const IMAGE_MAX_BYTES = 25 * 1024 * 1024;

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = src;
  });
}

async function loadSource(path: string, magic: string | null): Promise<string> {
  const bytes = await invokeCommand("read_file_view_bytes", {
    request: { path, offset: 0, length: IMAGE_MAX_BYTES },
  });
  const token = magic ?? fileExtension(path);
  const mime = MIME_BY_TOKEN[token] ?? "image/png";
  return `data:${mime};base64,${bytes.base64}`;
}

function drawToImageData(img: HTMLImageElement, width: number, height: number): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, width, height);
}

export function CompareImageView({ leftPath, rightPath }: { leftPath: string; rightPath: string }) {
  const { t } = useTranslation();
  const [sources, setSources] = useState<{ left: string; right: string } | null>(null);
  const [images, setImages] = useState<{ left: HTMLImageElement; right: HTMLImageElement } | null>(null);
  const [error, setError] = useState("");
  const [tolerance, setTolerance] = useState(16);
  const [diffPercent, setDiffPercent] = useState<number | null>(null);
  const heatmapRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    setSources(null);
    setImages(null);
    setError("");
    void (async () => {
      try {
        const [left, right] = await Promise.all([
          loadSource(leftPath, null),
          loadSource(rightPath, null),
        ]);
        if (!alive) {
          return;
        }
        setSources({ left, right });
        const [leftImg, rightImg] = await Promise.all([loadImage(left), loadImage(right)]);
        if (alive) {
          setImages({ left: leftImg, right: rightImg });
        }
      } catch (loadError) {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [leftPath, rightPath]);

  const dims = useMemo(() => {
    if (!images) {
      return null;
    }
    return {
      width: Math.max(images.left.naturalWidth, images.right.naturalWidth),
      height: Math.max(images.left.naturalHeight, images.right.naturalHeight),
    };
  }, [images]);

  // Recompute the heatmap whenever the images or tolerance change. Pixels are
  // compared on the union canvas; areas only one image covers count as full diffs.
  useEffect(() => {
    const canvas = heatmapRef.current;
    if (!canvas || !images || !dims || dims.width === 0 || dims.height === 0) {
      return;
    }
    const { width, height } = dims;
    const leftData = drawToImageData(images.left, width, height);
    const rightData = drawToImageData(images.right, width, height);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx || !leftData || !rightData) {
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const { imageData, percent } = await buildHeatmapInWorker({
          width,
          height,
          tolerance,
          left: leftData.data,
          right: rightData.data,
        });
        if (!alive) {
          return;
        }
        ctx.putImageData(imageData, 0, 0);
        setDiffPercent(percent);
      } catch (heatmapError) {
        if (alive) {
          setError(heatmapError instanceof Error ? heatmapError.message : String(heatmapError));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [images, dims, tolerance]);

  if (error) {
    return <div className="compare-status compare-status-error">{error}</div>;
  }
  if (!sources) {
    return <div className="compare-status">{t("compare.loading")}</div>;
  }

  return (
    <div className="compare-image">
      <div className="compare-image-pair">
        <div className="compare-image-cell">
          <span className="compare-image-cap">{t("compare.imageLeft")}</span>
          <div className="compare-image-frame">
            <img alt={t("compare.imageLeft")} src={sources.left} />
          </div>
        </div>
        <div className="compare-image-cell">
          <span className="compare-image-cap">{t("compare.imageRight")}</span>
          <div className="compare-image-frame">
            <img alt={t("compare.imageRight")} src={sources.right} />
          </div>
        </div>
      </div>
      <div className="compare-image-heat">
        <div className="compare-image-heat-bar">
          <span className="compare-image-cap">{t("compare.heatmap")}</span>
          <label className="compare-image-tol">
            <span>{t("compare.tolerance")}</span>
            <input
              type="range"
              min={0}
              max={128}
              step={1}
              value={tolerance}
              onChange={(event) => setTolerance(Number(event.currentTarget.value))}
            />
            <span className="compare-image-tol-val">{tolerance}</span>
          </label>
          {diffPercent !== null ? (
            <span className="compare-image-diffpct">
              {t("compare.differingPixels", { percent: diffPercent.toFixed(2) })}
            </span>
          ) : null}
        </div>
        <div className="compare-image-frame compare-image-frame-heat">
          <canvas ref={heatmapRef} />
        </div>
      </div>
    </div>
  );
}
