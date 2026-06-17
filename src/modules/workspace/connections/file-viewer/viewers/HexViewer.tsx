import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { FootSeg } from "../chrome/controls";

/** Bytes per rendered hex row. */
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

/**
 * Classic offset / hex / ASCII fallback view for binary or unknown files. Bytes
 * are already bounded by the backend read, so the whole returned chunk is laid
 * out in fixed-width rows with a column header.
 */
export function HexViewer({ base64 }: { base64: string }) {
  const { t } = useTranslation();
  const { rows, total } = useMemo(() => {
    const bytes = decodeBase64(base64);
    const result: { offset: number; bytes: number[] }[] = [];
    for (let start = 0; start < bytes.length; start += ROW_WIDTH) {
      result.push({ offset: start, bytes: Array.from(bytes.subarray(start, start + ROW_WIDTH)) });
    }
    return { rows: result, total: bytes.length };
  }, [base64]);

  return (
    <div className="fv-scroll">
      <ChromePortals
        footer={<FootSeg>{t("workspace.fileViewer.byteCount", { count: total })}</FootSeg>}
      />
      <div className="fv-hex">
        <div className="fv-hexhead">
          <span>{t("workspace.fileViewer.hexOffset")}</span>
          <span>00 01 02 03 04 05 06 07&nbsp;&nbsp;08 09 0A 0B 0C 0D 0E 0F</span>
          <span>ASCII</span>
        </div>
        {rows.map((row) => (
          <div className="fv-hexrow" key={row.offset}>
            <span className="off">{row.offset.toString(16).padStart(8, "0")}</span>
            <span className="by">
              {row.bytes.map((byte, index) => (
                <Fragment key={index}>
                  {index === 8 ? "  " : ""}
                  <span>{hex2(byte)}</span>
                  {index < row.bytes.length - 1 ? " " : ""}
                </Fragment>
              ))}
            </span>
            <span className="as">
              {row.bytes.map((byte, index) => {
                const printable = byte >= 0x20 && byte < 0x7f;
                return (
                  <span key={index} className={printable ? "" : "np"}>
                    {printable ? String.fromCharCode(byte) : "."}
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
