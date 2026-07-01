import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { FootSeg } from "../chrome/controls";

const LINE_HEIGHT = 20;
const OVERSCAN = 20;

/**
 * Read-only large-text preview. It deliberately avoids CodeMirror/editor state
 * for oversized text slices and renders only the visible line window, keeping
 * mode switches responsive when a file is large enough to be truncated by the
 * bounded reader.
 */
export function LargeTextViewer({ text }: { text: string }) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });

  const lines = useMemo(() => text.split(/\r\n|\n|\r/), [text]);
  const totalHeight = lines.length * LINE_HEIGHT;
  const start = Math.max(
    0,
    Math.floor(viewport.scrollTop / LINE_HEIGHT) - OVERSCAN,
  );
  const visibleCount =
    Math.ceil((viewport.height || 1) / LINE_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(lines.length, start + visibleCount);
  const visibleLines = lines.slice(start, end);

  function updateViewport() {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    setViewport({ scrollTop: node.scrollTop, height: node.clientHeight });
  }

  return (
    <div className="fv-large-text-pane">
      <ChromePortals
        footer={
          <FootSeg>
            {t("workspace.fileViewer.lineCountOf", {
              count: lines.length,
              total: lines.length,
            })}
          </FootSeg>
        }
      />
      <div
        className="fv-large-text-scroll"
        ref={(node) => {
          scrollerRef.current = node;
          if (node) {
            window.requestAnimationFrame(updateViewport);
          }
        }}
        onScroll={updateViewport}
      >
        <div className="fv-large-text-spacer" style={{ height: totalHeight }}>
          <div
            className="fv-large-text-window"
            style={{ transform: `translateY(${start * LINE_HEIGHT}px)` }}
          >
            {visibleLines.map((line, index) => {
              const lineNumber = start + index + 1;
              return (
                <div className="fv-large-text-line" key={lineNumber}>
                  <span className="fv-large-text-ln">{lineNumber}</span>
                  <span className="fv-large-text-code">{line || "\u00a0"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
