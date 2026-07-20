import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  ExternalLink,
  FilePlus,
  FolderOpen,
  Grid2x2,
  Hand,
  Maximize2,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from "../../lib/reicon";
import {
  Actions,
  Btn,
  ConfirmSheet,
  DialogShell,
  Sheet,
  TextInput,
} from "../../app/ui/dialog";
import { ColorPalettePicker } from "../../app/ui/ColorPalettePicker";
import { invokeCommand, type FullScreenshot, type StoredScreenshot } from "../../lib/tauri";
import { formatScreenshotBytes } from "./LibraryView";
import { fitImageDimensions } from "./editorSizing";

type EditorTool = "pan" | "arrow" | "rectangle" | "ellipse" | "text" | "mosaic";
type Point = { x: number; y: number };
type ZoomLevel = "fit" | number;
type TextFont = "app" | "sans-serif" | "serif" | "monospace";
type PendingEditorAction = "close" | -1 | 1;
type EditorSaveMode = "overwrite" | "copy";

const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200] as const;
const FIT_PADDING = 18;
const EDITOR_TOOLS: Array<{
  id: EditorTool;
  icon: typeof ArrowRight;
  key: string;
}> = [
  { id: "pan", icon: Hand, key: "screenshots.editor.pan" },
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

function resolvedTextFont(font: TextFont) {
  return font === "app" ? annotationFontFamily() : font;
}

function initialEditorSize() {
  return {
    width: Math.max(720, Math.round(window.innerWidth * 0.8)),
    height: Math.max(480, Math.round(window.innerHeight * 0.8)),
  };
}

function drawShape(
  context: CanvasRenderingContext2D,
  tool: Exclude<EditorTool, "pan" | "text" | "mosaic">,
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
  onSaved: (saved: StoredScreenshot, mode: EditorSaveMode, navigateDirection?: -1 | 1) => void;
  onError: (error: unknown) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const drawingRef = useRef<{ start: Point; before: ImageData } | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);
  const [tool, setTool] = useState<EditorTool>("arrow");
  const [textValue, setTextValue] = useState("");
  const [textFont, setTextFont] = useState<TextFont>("app");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState(annotationColor);
  const [textBold, setTextBold] = useState(true);
  const [textFormatOpen, setTextFormatOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: screenshot.width, height: screenshot.height });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [editorSize, setEditorSize] = useState(initialEditorSize);
  const [zoom, setZoom] = useState<ZoomLevel>("fit");
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingEditorAction | null>(null);

  useEffect(() => {
    let disposed = false;
    setReady(false);
    setDirty(false);
    setSaving(false);
    setPendingAction(null);
    setZoom("fit");
    setUndoCount(0);
    undoRef.current = [];
    drawingRef.current = null;
    panRef.current = null;
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
          setTextSize(Math.round(Math.max(22, full.width / 44)));
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

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const measure = () => {
      setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

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
    if (tool === "pan") {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: stage.scrollLeft,
        scrollTop: stage.scrollTop,
      };
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
      context.fillStyle = textColor;
      context.font = `${textBold ? 700 : 400} ${textSize}px ${resolvedTextFont(textFont)}`;
      context.textBaseline = "top";
      context.fillText(textValue.trim(), start.x, start.y);
      context.restore();
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = { start, before };
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool === "pan") {
      const pan = panRef.current;
      const stage = stageRef.current;
      if (pan && stage && pan.pointerId === event.pointerId) {
        stage.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
        stage.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
      }
      return;
    }
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
    if (tool === "pan") {
      if (panRef.current?.pointerId === event.pointerId) {
        panRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
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

  async function save(mode: EditorSaveMode, navigateDirection?: -1 | 1) {
    const canvas = canvasRef.current;
    if (!canvas || !ready || (mode === "overwrite" && !dirty) || saving) {
      return;
    }
    setSaving(true);
    try {
      const created = await invokeCommand("save_edited_screenshot", {
        request: {
          id: screenshot.id,
          dataUrl: canvas.toDataURL("image/png"),
          saveAsCopy: mode === "copy",
        },
      });
      undoRef.current = [];
      setUndoCount(0);
      setDirty(false);
      setSaving(false);
      onSaved(created, mode, navigateDirection);
    } catch (error) {
      setSaving(false);
      onError(error);
    }
  }

  function requestClose() {
    if (saving) {
      return;
    }
    if (dirty) {
      setPendingAction("close");
    } else {
      onClose();
    }
  }

  function requestNavigation(direction: -1 | 1) {
    if (saving) {
      return;
    }
    if (dirty) {
      setPendingAction(direction);
    } else {
      onNavigate(direction);
    }
  }

  function continueWithoutSaving() {
    const action = pendingAction;
    setPendingAction(null);
    if (action === "close") {
      onClose();
    } else if (action) {
      onNavigate(action);
    }
  }

  function clampEditorSize(width: number, height: number) {
    return {
      width: Math.min(Math.max(640, Math.round(width)), Math.max(640, window.innerWidth - 24)),
      height: Math.min(Math.max(420, Math.round(height)), Math.max(420, window.innerHeight - 24)),
    };
  }

  function finishResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (resizeRef.current?.pointerId !== event.pointerId) {
      return;
    }
    resizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const zoomScale = zoom === "fit" ? null : zoom / 100;
  const scaledWidth = zoomScale ? Math.max(1, Math.round(canvasSize.width * zoomScale)) : null;
  const scaledHeight = zoomScale ? Math.max(1, Math.round(canvasSize.height * zoomScale)) : null;
  const fitSize = zoom === "fit" && stageSize.width > 0 && stageSize.height > 0
    ? fitImageDimensions(
        canvasSize.width,
        canvasSize.height,
        stageSize.width,
        stageSize.height,
        FIT_PADDING,
      )
    : null;

  return (
    <DialogShell onBackdrop={saving ? undefined : requestClose}>
      <Sheet
        width={editorSize.width}
        height={editorSize.height}
        className="screenshots-editor"
        title={screenshot.fileName}
        ariaLabel={screenshot.fileName}
        closeAriaLabel={t("common.close")}
        onClose={requestClose}
        footer={
          <Actions
            extraLeft={
              <span className="screenshots-editor__footer-meta">
                {canvasSize.width}×{canvasSize.height} · {formatScreenshotBytes(screenshot.fileSizeBytes)}
              </span>
            }
          />
        }
      >
        <div
          className="screenshots-editor__workspace"
          tabIndex={-1}
          onKeyDown={(event) => {
            const editingText = event.target instanceof HTMLInputElement
              || event.target instanceof HTMLTextAreaElement
              || event.target instanceof HTMLSelectElement;
            if (event.key === "Escape" && !saving) {
              event.preventDefault();
              requestClose();
            } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
              event.preventDefault();
              undo();
            } else if (!editingText && event.key === "ArrowLeft" && hasPrevious) {
              event.preventDefault();
              requestNavigation(-1);
            } else if (!editingText && event.key === "ArrowRight" && hasNext) {
              event.preventDefault();
              requestNavigation(1);
            }
          }}
        >
          <div className="screenshots-editor__toolbar" role="toolbar">
            <div className="screenshots-editor__nav-group">
              <button
                type="button"
                title={t("common.back")}
                aria-label={t("common.back")}
                disabled={!hasPrevious || saving}
                onClick={() => requestNavigation(-1)}
              >
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                title={t("common.forward")}
                aria-label={t("common.forward")}
                disabled={!hasNext || saving}
                onClick={() => requestNavigation(1)}
              >
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
            <span className="screenshots-editor__divider" aria-hidden="true" />
            <div className="screenshots-editor__action-group">
              <button
                type="button"
                title={t("common.save")}
                aria-label={t("common.save")}
                disabled={!ready || !dirty || saving}
                onClick={() => void save("overwrite")}
              >
                <Save size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                title={t("screenshots.editor.saveAs")}
                aria-label={t("screenshots.editor.saveAs")}
                disabled={!ready || saving}
                onClick={() => void save("copy")}
              >
                <FilePlus size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                title={t("screenshots.editor.undo")}
                aria-label={t("screenshots.editor.undo")}
                disabled={!undoCount || saving}
                onClick={undo}
              >
                <RotateCcw size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                title={t("screenshots.menu.copy")}
                aria-label={t("screenshots.menu.copy")}
                disabled={saving}
                onClick={onCopy}
              >
                <Copy size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                title={t("screenshots.menu.openExternal")}
                aria-label={t("screenshots.menu.openExternal")}
                disabled={saving}
                onClick={onOpenExternal}
              >
                <ExternalLink size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                title={t("screenshots.menu.reveal")}
                aria-label={t("screenshots.menu.reveal")}
                disabled={saving}
                onClick={onReveal}
              >
                <FolderOpen size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="danger"
                title={t("common.delete")}
                aria-label={t("common.delete")}
                disabled={saving}
                onClick={onDelete}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
            <span className="screenshots-editor__divider" aria-hidden="true" />
            {EDITOR_TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={tool === item.id ? "active" : ""}
                  aria-pressed={tool === item.id}
                  aria-label={t(item.key)}
                  title={t(item.key)}
                  onClick={() => {
                    setTool(item.id);
                    if (item.id === "text") {
                      setTextFormatOpen((open) => !open || tool !== "text");
                    } else {
                      setTextFormatOpen(false);
                    }
                  }}
                >
                  <Icon size={15} aria-hidden="true" />
                </button>
              );
            })}
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
            {tool === "text" && textFormatOpen ? (
              <div
                aria-label={t("screenshots.editor.text")}
                className="screenshots-editor__text-format"
                role="dialog"
              >
                <TextInput
                  autoFocus
                  className="screenshots-editor__text"
                  value={textValue}
                  placeholder={t("screenshots.editor.textPlaceholder")}
                  aria-label={t("screenshots.editor.textPlaceholder")}
                  onChange={(event) => setTextValue(event.currentTarget.value)}
                />
                <label>
                  <span>{t("workspace.fileViewer.font")}</span>
                  <select
                    value={textFont}
                    onChange={(event) => setTextFont(event.currentTarget.value as TextFont)}
                  >
                    <option value="app">{t("screenshots.editor.appFont")}</option>
                    <option value="sans-serif">{t("screenshots.editor.sansSerif")}</option>
                    <option value="serif">{t("screenshots.editor.serif")}</option>
                    <option value="monospace">{t("screenshots.editor.monospace")}</option>
                  </select>
                </label>
                <label>
                  <span>{t("workspace.fileViewer.fontSize")}</span>
                  <input
                    min={8}
                    max={256}
                    type="number"
                    value={textSize}
                    onChange={(event) => {
                      const next = Number.parseInt(event.currentTarget.value, 10);
                      if (Number.isFinite(next)) {
                        setTextSize(Math.min(256, Math.max(8, next)));
                      }
                    }}
                  />
                </label>
                <label className="screenshots-editor__text-color">
                  <span>{t("common.customColor")}</span>
                  <i style={{ background: textColor }} />
                  <ColorPalettePicker value={textColor} onChange={setTextColor} />
                </label>
                <button
                  type="button"
                  className={`screenshots-editor__format-toggle${textBold ? " active" : ""}`}
                  aria-pressed={textBold}
                  onClick={() => setTextBold((bold) => !bold)}
                >
                  {t("screenshots.editor.bold")}
                </button>
              </div>
            ) : null}
          </div>
          <div
            ref={stageRef}
            className={`screenshots-editor__stage${zoom === "fit" ? " is-fit" : ""}`}
          >
            <div
              className={`screenshots-editor__canvas-wrap${zoom === "fit" ? " is-fit" : ""}`}
              style={scaledWidth && scaledHeight
                ? { width: scaledWidth + 36, height: scaledHeight + 36 }
                : undefined}
            >
              <canvas
                ref={canvasRef}
                className={`${zoom === "fit" ? "is-fit" : "is-scaled"}${tool === "pan" ? " is-pan" : ""}`}
                style={scaledWidth && scaledHeight
                  ? { width: scaledWidth, height: scaledHeight }
                  : fitSize
                    ? { width: fitSize.width, height: fitSize.height }
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
                  panRef.current = null;
                }}
              />
            </div>
          </div>
        </div>
        <button
          aria-label={t("screenshots.editor.resizeDialog")}
          className="screenshots-editor__resizer"
          onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
              return;
            }
            event.preventDefault();
            const step = event.shiftKey ? 64 : 24;
            setEditorSize((current) => clampEditorSize(
              current.width + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
              current.height + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
            ));
          }}
          onPointerCancel={finishResize}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            resizeRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              width: editorSize.width,
              height: editorSize.height,
            };
          }}
          onPointerMove={(event) => {
            const start = resizeRef.current;
            if (!start || start.pointerId !== event.pointerId) {
              return;
            }
            setEditorSize(clampEditorSize(
              start.width + event.clientX - start.startX,
              start.height + event.clientY - start.startY,
            ));
          }}
          onPointerUp={finishResize}
          title={t("screenshots.editor.resizeDialog")}
          type="button"
        />
      </Sheet>
      {pendingAction !== null ? (
        <ConfirmSheet
          tone="warn"
          title={t("screenshots.editor.unsavedTitle")}
          message={t("screenshots.editor.unsavedMessage")}
          confirmLabel={t("common.save")}
          confirmIcon="check"
          extraLeft={
            <Btn kind="danger" onClick={continueWithoutSaving}>
              {t("screenshots.editor.dontSave")}
            </Btn>
          }
          onConfirm={() => {
            const navigateDirection = typeof pendingAction === "number" ? pendingAction : undefined;
            setPendingAction(null);
            void save("overwrite", navigateDirection);
          }}
          onCancel={() => setPendingAction(null)}
          zClassName="kk-qc-subdialog"
        />
      ) : null}
    </DialogShell>
  );
}
