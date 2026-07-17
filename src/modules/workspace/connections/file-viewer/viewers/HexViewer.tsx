import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { FootSeg } from "../chrome/controls";
import { decodeHexBase64InWorker } from "./hexWorkerClient";

/** Bytes per rendered hex row. */
const ROW_WIDTH = 16;
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 34;
const OVERSCAN_ROWS = 20;

function hex2(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function base64ByteLength(base64: string): number {
  if (!base64) {
    return 0;
  }
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function HexRow({ bytes, row }: { bytes: Uint8Array; row: number }) {
  const start = row * ROW_WIDTH;
  const end = Math.min(bytes.length, start + ROW_WIDTH);
  let hex = "";
  const ascii: ReactNode[] = [];

  for (let index = start; index < end; index += 1) {
    const column = index - start;
    if (column > 0) {
      hex += column === 8 ? "   " : " ";
    }
    const byte = bytes[index];
    hex += hex2(byte);
    const printable = byte >= 0x20 && byte < 0x7f;
    ascii.push(
      <span key={column} className={printable ? "" : "np"}>
        {printable ? String.fromCharCode(byte) : "."}
      </span>,
    );
  }

  return (
    <div className="fv-hexrow" style={{ top: row * ROW_HEIGHT }}>
      <span className="off">{start.toString(16).padStart(8, "0")}</span>
      <span className="by">{hex}</span>
      <span className="as">{ascii}</span>
    </div>
  );
}

/**
 * Classic offset / hex / ASCII fallback view for binary or unknown files.
 * Base64 decoding runs in a worker, and only the visible fixed-height rows are
 * mounted, so the bounded one-megabyte preview cannot monopolize the UI thread.
 */
export function HexViewer({ base64 }: { base64: string }) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [decoded, setDecoded] = useState<{ source: string; bytes: Uint8Array } | null>(null);
  const [decodeFailure, setDecodeFailure] = useState<{ source: string; error: string } | null>(
    null,
  );
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });
  const total = base64ByteLength(base64);
  const rowCount = Math.ceil(total / ROW_WIDTH);
  const bytes = decoded?.source === base64 ? decoded.bytes : null;
  const decodeError = decodeFailure?.source === base64 ? decodeFailure.error : "";

  const updateViewport = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    setViewport({ scrollTop: node.scrollTop, height: node.clientHeight });
  }, []);

  useEffect(() => {
    let alive = true;
    void decodeHexBase64InWorker(base64).then(
      (decodedBytes) => {
        if (alive) {
          setDecoded({ source: base64, bytes: decodedBytes });
        }
      },
      (error: unknown) => {
        if (alive) {
          setDecodeFailure({
            source: base64,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
    return () => {
      alive = false;
    };
  }, [base64]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    const frame = window.requestAnimationFrame(updateViewport);
    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [updateViewport]);

  const virtualRows = useMemo(() => {
    if (!bytes) {
      return [];
    }
    const bodyScrollTop = Math.max(0, viewport.scrollTop - HEADER_HEIGHT);
    const first = Math.max(0, Math.floor(bodyScrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
    const visibleCount =
      Math.ceil((viewport.height || ROW_HEIGHT * 40) / ROW_HEIGHT) + OVERSCAN_ROWS * 2;
    const last = Math.min(rowCount, first + visibleCount);
    return Array.from({ length: Math.max(0, last - first) }, (_, offset) => first + offset);
  }, [bytes, rowCount, viewport]);

  return (
    <div
      className="fv-scroll fv-hex-scroll"
      ref={scrollerRef}
      onScroll={updateViewport}
    >
      <ChromePortals
        footer={<FootSeg>{t("workspace.fileViewer.byteCount", { count: total })}</FootSeg>}
      />
      <div className="fv-hex">
        <div className="fv-hexhead">
          <span>{t("workspace.fileViewer.hexOffset")}</span>
          <span>00 01 02 03 04 05 06 07&nbsp;&nbsp;08 09 0A 0B 0C 0D 0E 0F</span>
          <span>ASCII</span>
        </div>
        {decodeError ? (
          <div className="file-viewer-status file-viewer-status-error">{decodeError}</div>
        ) : (
          <div className="fv-hexrows" style={{ height: rowCount * ROW_HEIGHT }}>
            {bytes
              ? virtualRows.map((row) => <HexRow bytes={bytes} key={row} row={row} />)
              : null}
          </div>
        )}
      </div>
    </div>
  );
}
