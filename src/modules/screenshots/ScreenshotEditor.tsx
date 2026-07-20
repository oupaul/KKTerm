import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Grid2x2,
  Maximize2,
  Square,
  Type,
  ZoomIn,
  ZoomOut,
} from "../../lib/reicon";
import {
  Actions,
  Btn,
  DialogShell,
  Sheet,
  TextInput,
} from "../../app/ui/dialog";
import { invokeCommand, type FullScreenshot, type StoredScreenshot } from "../../lib/tauri";
import { formatScreenshotBytes } from "./LibraryView";

type EditorTool = "arrow" | "rectangle" | "ellipse" | "text" | "mosaic";
type Point = { x: number; y: number };
type ZoomLevel = "fit" | number;

const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200] as const;
const EDITOR_TOOLS: Array<{
  id: EditorTool;
  icon: typeof ArrowRight;
  key: string;
}> = [
  { id: "arrow", icon: ArrowRight, key: "screenshots.editor.arrow" },
  { id: "rectangle", icon: Square, key: "screenshots.editor.rectangle" },
  { id: "ellipse", icon: Circle, key: "screenshots.editor.ellipse" },
  { id: "text", icon: Type, key: "screenshots.editor.text" },
  { id: "mosaic", icon: Grid2x2, key: "screenshots.editor.mosaic" },
];

function canvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
    y: ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
  };
}

function annotationColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--red").trim() || "red";
}

function annotationFontFamily() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--app-ui-font-family")
    .trim() || "sans-serif";
}

function drawShape(
  context: CanvasRenderingContext2D,
  tool: Exclude<EditorTool, "text" | "mosaic">,
  start: Point,
  end: Point,
) {
  const lineWidth = Math.max(3, context.canvas.width / 520);
  context.save();
  context.strokeStyle = annotationColor();
  context.fillStyle = annotationColor();
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (tool === "rectangle") {
    context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else if (tool === "ellipse") {
    context.beginPath();
    context.ellipse(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      Math.abs(end.x - start.x) / 2,
      Math.abs(end.y - start.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  } else {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const head = Math.max(14, lineWidth * 4);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.beginPath();
    context.moveTo(end.x, end.y);
    context.lineTo(
      end.x - head * Math.cos(angle - Math.PI / 6),
      end.y - head * Math.sin(angle - Math.PI / 6),
    );
    context.lineTo(
      end.x - head * Math.cos(angle + Math.PI / 6),
      end.y - head * Math.sin(angle + Math.PI / 6),
    );
    context.closePath();
    context.fill();
  }
  context.restore();
}

function mosaicRegion(context: CanvasRenderingContext2D, start: Point, end: Point) {
  const x = Math.max(0, Math.floor(Math.min(start.x, end.x)));
  const y = Math.max(0, Math.floor(Math.min(start.y, end.y)));
  const width = Math.min(context.canvas.width - x, Math.ceil(Math.abs(end.x - start.x)));
  const height = Math.min(context.canvas.height - y, Math.ceil(Math.abs(end.y - start.y)));
  if (width < 2 || height < 2) {
    return;
  }
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  source.getContext("2d")?.putImageData(context.getImageData(x, y, width, height), 0, 0);
  const pixelSize = Math.max(8, Math.round(Math.max(width, height) / 45));
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(1, Math.ceil(width / pixelSize));
  tiny.height = Math.max(1, Math.ceil(height / pixelSize));
  const tinyContext = tiny.getContext("2d");
  if (!tinyContext) {
    return;
  }
  tinyContext.drawImage(source, 0, 0, tiny.width, tiny.height);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(tiny, 0, 0, tiny.width, tiny.height, x, y, width, height);
  context.restore();
}

export function ScreenshotEditor({
  screenshot,
  hasPrevious,
  hasNext,
  onNavigate,
  onCopy,
  onOpenExternal,
  onReveal,
  onDelete,
  onSaved,
  onError,
  onClose,
}: {
  screenshot: StoredScreenshot;
  hasPrevious: boolean;
  hasNext: boolean;
  onNavigate: (direction: -1 | 1) => void;
  onCopy: () => void;
  onOpenExternal: () => void;
  onReveal: () => void;
  onDelete: () => void;
  onSaved: (created: StoredScreenshot) => void;
  onError: (error: unknown) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const drawingRef = useRef<{ start: Point; before: ImageData } | null>(null);
  const [tool, setTool] = useState<EditorTool>("arrow");
  const [textValue, setTextValue] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: screenshot.width, height: screenshot.height });
  const [zoom, setZoom] = useState<ZoomLevel>("fit");
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let disposed = false;
    setReady(false);
    setDirty(false);
    setSaving(false);
    setZoom("fit");
    setUndoCount(0);
    undoRef.current = [];
    drawingRef.current = null;
    invokeCommand("read_screenshot", { id: screenshot.id })
      .then((full: FullScreenshot) => {
        const image = new Image();
        image.onload = () => {
          if (disposed || !canvasRef.current) {
            return;
          }
          const canvas = canvasRef.current;
          canvas.width = full.width;
          canvas.height = full.height;
          canvas.getContext("2d")?.drawImage(image, 0, 0);
          setCanvasSize({ width: full.width, height: full.height });
          setReady(true);
        };
        image.onerror = () => {
          if (!disposed) {
            onError(new Error(t("screenshots.editor.loadError")));
          }
        };
        image.src = full.dataUrl;
      })
      .catch(onError);
    return () => {
      disposed = true;
    };
  }, [onError, screenshot.id, t]);

  function pushUndo(before: ImageData) {
    undoRef.current = [...undoRef.current.slice(-5), before];
    setUndoCount(undoRef.current.length);
    setDirty(true);
  }

  function undo() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previous = undoRef.current.pop();
    if (!canvas || !context || !previous) {
      return;
    }
    context.putImageData(previous, 0, 0);
    setUndoCount(undoRef.current.length);
    setDirty(undoRef.current.length > 0);
  }

  function stepZoom(direction: -1 | 1) {
    const current = zoom === "fit" ? 100 : zoom;
    const exactIndex = ZOOM_STEPS.findIndex((value) => value === current);
    const index = exactIndex >= 0 ? exactIndex : ZOOM_STEPS.indexOf(100);
    const nextIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, index + direction));
    setZoom(ZOOM_STEPS[nextIndex]);
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context || !ready) {
      return;
    }
    const start = canvasPoint(canvas, event.clientX, event.clientY);
    const before = context.getImageData(0, 0, canvas.width, canvas.height);
    if (tool === "text") {
      if (!textValue.trim()) {
        return;
      }
      pushUndo(before);
      context.save();
      context.fillStyle = annotationColor();
      context.font = `600 ${Math.max(22, canvas.width / 44)}px ${annotationFontFamily()}`;
      context.textBaseline = "top";
      context.fillText(textValue.trim(), start.x, start.y);
      context.restore();
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = { start, before };
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drawing = drawingRef.current;
    const context = event.currentTarget.getContext("2d");
    if (!drawing || !context || tool === "text" || tool === "mosaic") {
      return;
    }
    const end = canvasPoint(event.currentTarget, event.clientX, event.clientY);
    context.putImageData(drawing.before, 0, 0);
    drawShape(context, tool, drawing.start, end);
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drawing = drawingRef.current;
    const context = event.currentTarget.getContext("2d");
    if (!drawing || !context || tool === "text") {
      return;
    }
    const end = canvasPoint(event.currentTarget, event.clientX, event.clientY);
    context.putImageData(drawing.before, 0, 0);
    if (tool === "mosaic") {
      mosaicRegion(context, drawing.start, end);
    } else {
      drawShape(context, tool, drawing.start, end);
    }
    pushUndo(drawing.before);
    drawingRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !ready || !dirty || saving) {
      return;
    }
    setSaving(true);
    try {
      const created = await invokeCommand("save_edited_screenshot", {
        request: { id: screenshot.id, dataUrl: canvas.toDataURL("image/png") },
      });
      onSaved(created);
    } catch (error) {
      setSaving(false);
      onError(error);
    }
  }

  const zoomScale = zoom === "fit" ? null : zoom / 100;
  const scaledWidth = zoomScale ? Math.max(1, Math.round(canvasSize.width * zoomScale)) : null;
  const scaledHeight = zoomScale ? Math.max(1, Math.round(canvasSize.height * zoomScale)) : null;

  return (
    <DialogShell onBackdrop={saving ? undefined : onClose}>
      <Sheet
        width={1180}
        height={820}
        className="screenshots-editor"
        title={screenshot.fileName}
        ariaLabel={screenshot.fileName}
        footer={
          <Actions
            extraLeft={
              <div className="screenshots-editor__footer-actions">
                <Btn sm icon="refresh" disabled={!undoCount || saving} onClick={undo}>
                  {t("screenshots.editor.undo")}
                </Btn>
                <Btn sm icon="copy" disabled={saving} onClick={onCopy}>
                  {t("screenshots.menu.copy")}
                </Btn>
                <Btn sm disabled={saving} onClick={onOpenExternal}>
                  {t("screenshots.menu.openExternal")}
                </Btn>
                <Btn sm disabled={saving} onClick={onReveal}>
                  {t("screenshots.menu.reveal")}
                </Btn>
                <Btn sm kind="danger" icon="trash" disabled={saving} onClick={onDelete}>
                  {t("common.delete")}
                </Btn>
              </div>
            }
            cancel={<Btn disabled={saving} onClick={onClose}>{t("common.close")}</Btn>}
            primary={
              <Btn kind="primary" icon="check" disabled={!ready || !dirty || saving} onClick={() => void save()}>
                {t("common.save")}
              </Btn>
            }
          />
        }
      >
        <div
          className="screenshots-editor__workspace"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !saving) {
              event.preventDefault();
              onClose();
            } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
              event.preventDefault();
              undo();
            } else if (!dirty && event.key === "ArrowLeft" && hasPrevious) {
              event.preventDefault();
              onNavigate(-1);
            } else if (!dirty && event.key === "ArrowRight" && hasNext) {
              event.preventDefault();
              onNavigate(1);
            }
          }}
        >
          <div className="screenshots-editor__toolbar" role="toolbar">
            <div className="screenshots-editor__nav-group">
              <button
                type="button"
                aria-label={t("common.back")}
                disabled={!hasPrevious || dirty || saving}
                onClick={() => onNavigate(-1)}
              >
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t("common.forward")}
                disabled={!hasNext || dirty || saving}
                onClick={() => onNavigate(1)}
              >
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
            <span className="screenshots-editor__meta">
              {canvasSize.width}×{canvasSize.height} · {formatScreenshotBytes(screenshot.fileSizeBytes)}
            </span>
            <span className="screenshots-editor__divider" aria-hidden="true" />
            {EDITOR_TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={tool === item.id ? "active" : ""}
                  aria-pressed={tool === item.id}
                  onClick={() => setTool(item.id)}
                >
                  <Icon size={15} aria-hidden="true" />
                  {t(item.key)}
                </button>
              );
            })}
            <TextInput
              className="screenshots-editor__text"
              value={textValue}
              placeholder={t("screenshots.editor.textPlaceholder")}
              aria-label={t("screenshots.editor.textPlaceholder")}
              onFocus={() => setTool("text")}
              onChange={(event) => setTextValue(event.currentTarget.value)}
            />
            <span className="screenshots-editor__toolbar-spacer" />
            <div className="screenshots-editor__zoom" aria-label={t("workspace.fileViewer.zoomIn")}>
              <button
                type="button"
                title={t("workspace.fileViewer.zoomOut")}
                aria-label={t("workspace.fileViewer.zoomOut")}
                disabled={zoom === ZOOM_STEPS[0]}
                onClick={() => stepZoom(-1)}
              >
                <ZoomOut size={15} aria-hidden="true" />
              </button>
              <span>{zoom === "fit" ? t("workspace.fileViewer.fit") : `${zoom}%`}</span>
              <button
                type="button"
                title={t("workspace.fileViewer.zoomIn")}
                aria-label={t("workspace.fileViewer.zoomIn")}
                disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                onClick={() => stepZoom(1)}
              >
                <ZoomIn size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={zoom === "fit" ? "active" : ""}
                title={t("workspace.fileViewer.fit")}
                aria-label={t("workspace.fileViewer.fit")}
                onClick={() => setZoom("fit")}
              >
                <Maximize2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="screenshots-editor__stage">
            <div
              className={`screenshots-editor__canvas-wrap${zoom === "fit" ? " is-fit" : ""}`}
              style={scaledWidth && scaledHeight
                ? { width: scaledWidth + 36, height: scaledHeight + 36 }
                : undefined}
            >
              <canvas
                ref={canvasRef}
                className={zoom === "fit" ? "is-fit" : "is-scaled"}
                style={scaledWidth && scaledHeight
                  ? { width: scaledWidth, height: scaledHeight }
                  : undefined}
                aria-label={screenshot.fileName}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={() => {
                  const drawing = drawingRef.current;
                  const context = canvasRef.current?.getContext("2d");
                  if (drawing && context) {
                    context.putImageData(drawing.before, 0, 0);
                  }
                  drawingRef.current = null;
                }}
              />
            </div>
          </div>
        </div>
      </Sheet>
    </DialogShell>
  );
}
