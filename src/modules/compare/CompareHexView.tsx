// Side-by-side hex comparison for binary (or forced-binary) files. Both files
// are read as bounded base64, laid out in aligned 16-byte rows, and every byte
// that differs between the two sides is highlighted. A single shared scroll
// keeps the left and right columns aligned.
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../../lib/tauri";

const HEX_MAX_BYTES = 1 * 1024 * 1024;
const ROW_WIDTH = 16;

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function hex2(value: number): string {
  return value.toString(16).padStart(2, "0");
}

interface LoadedBytes {
  bytes: Uint8Array;
  truncated: boolean;
}

function HexSide({
  bytes,
  other,
  start,
}: {
  bytes: Uint8Array;
  other: Uint8Array;
  start: number;
}) {
  const cells: ReactNode[] = [];
  const ascii: ReactNode[] = [];
  for (let i = 0; i < ROW_WIDTH; i += 1) {
    const index = start + i;
    if (index >= bytes.length) {
      cells.push(
        <span key={i} className="compare-hex-byte pad">
          {"  "}
        </span>,
      );
      ascii.push(
        <span key={i} className="compare-hex-ascii-ch pad">
          {" "}
        </span>,
      );
      continue;
    }
    const byte = bytes[index];
    // A byte differs when the other side is missing it or holds a different value.
    const differs = index >= other.length || other[index] !== byte;
    const printable = byte >= 0x20 && byte < 0x7f;
    cells.push(
      <span key={i} className={`compare-hex-byte${differs ? " diff" : ""}`}>
        {hex2(byte)}
      </span>,
    );
    ascii.push(
      <span
        key={i}
        className={`compare-hex-ascii-ch${differs ? " diff" : ""}${printable ? "" : " np"}`}
      >
        {printable ? String.fromCharCode(byte) : "."}
      </span>,
    );
  }
  return (
    <div className="compare-hex-side">
      <span className="compare-hex-bytes">{cells}</span>
      <span className="compare-hex-ascii">{ascii}</span>
    </div>
  );
}

export function CompareHexView({ leftPath, rightPath }: { leftPath: string; rightPath: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<{ left: LoadedBytes; right: LoadedBytes } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    void (async () => {
      try {
        const [left, right] = await Promise.all([
          invokeCommand("read_file_view_bytes", {
            request: { path: leftPath, offset: 0, length: HEX_MAX_BYTES },
          }),
          invokeCommand("read_file_view_bytes", {
            request: { path: rightPath, offset: 0, length: HEX_MAX_BYTES },
          }),
        ]);
        if (alive) {
          setData({
            left: { bytes: decodeBase64(left.base64), truncated: !left.eof },
            right: { bytes: decodeBase64(right.base64), truncated: !right.eof },
          });
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

  const rowCount = useMemo(() => {
    if (!data) {
      return 0;
    }
    const longest = Math.max(data.left.bytes.length, data.right.bytes.length);
    return Math.ceil(longest / ROW_WIDTH);
  }, [data]);

  if (error) {
    return <div className="compare-status compare-status-error">{error}</div>;
  }
  if (!data) {
    return <div className="compare-status">{t("compare.loading")}</div>;
  }

  const truncated = data.left.truncated || data.right.truncated;

  return (
    <div className="compare-hex">
      {truncated ? <div className="compare-hex-notice">{t("compare.hexTruncated")}</div> : null}
      <div className="compare-hex-head">
        <span className="compare-hex-off-head">{t("compare.hexOffset")}</span>
        <span className="compare-hex-side-head">{t("compare.imageLeft")}</span>
        <span className="compare-hex-side-head">{t("compare.imageRight")}</span>
      </div>
      <div className="compare-hex-body">
        {Array.from({ length: rowCount }, (_, row) => {
          const start = row * ROW_WIDTH;
          return (
            <div className="compare-hex-row" key={start}>
              <span className="compare-hex-off">{start.toString(16).padStart(8, "0")}</span>
              <HexSide bytes={data.left.bytes} other={data.right.bytes} start={start} />
              <HexSide bytes={data.right.bytes} other={data.left.bytes} start={start} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
