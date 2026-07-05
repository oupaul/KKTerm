import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import { ChevronDown, ChevronUp } from "../../../../../lib/reicon";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { FootSeg, SearchField } from "../chrome/controls";

/** Maximum data rows rendered at once to keep large CSVs responsive. */
const MAX_RENDERED_ROWS = 2000;

type SortState = { col: number; dir: "asc" | "desc" } | null;

/** Numeric-aware cell comparison: sort numerically when both cells parse. */
function compareCells(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (a !== "" && b !== "" && !Number.isNaN(na) && !Number.isNaN(nb)) {
    return na - nb;
  }
  return a.localeCompare(b);
}

/**
 * Parses delimited text with papaparse and renders it as a sortable table with a
 * sticky header/row-number column and a quick row filter (in the shell toolbar).
 * The first row is treated as a header.
 */
export function CsvViewer({ text, delimiter }: { text: string; delimiter?: string }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortState>(null);

  const { header, rows, truncated } = useMemo(() => {
    const parsed = Papa.parse<string[]>(text.trim(), {
      delimiter: delimiter ?? "",
      skipEmptyLines: true,
    });
    const data = (parsed.data as string[][]) ?? [];
    const [first, ...rest] = data;
    return {
      header: first ?? [],
      rows: rest,
      truncated: rest.length > MAX_RENDERED_ROWS,
    };
  }, [text, delimiter]);

  const visibleRows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    let filtered = needle
      ? rows.filter((row) => row.some((cell) => cell?.toLowerCase().includes(needle)))
      : rows.slice();
    if (sort) {
      filtered = filtered.slice().sort((a, b) => {
        const result = compareCells(a[sort.col] ?? "", b[sort.col] ?? "");
        return sort.dir === "asc" ? result : -result;
      });
    }
    return filtered.slice(0, MAX_RENDERED_ROWS);
  }, [rows, filter, sort]);

  const onSort = (col: number) =>
    setSort((current) =>
      current && current.col === col
        ? { col, dir: current.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );

  return (
    <div className="fv-pane">
      <ChromePortals
        center={
          <SearchField
            value={filter}
            onChange={setFilter}
            placeholder={t("workspace.fileViewer.filterRows")}
            style={{ minWidth: 180 }}
          />
        }
        footer={
          <FootSeg>
            {t("workspace.fileViewer.tableShape", { rows: rows.length, cols: header.length })}
          </FootSeg>
        }
      />
      {truncated ? (
        <div className="file-viewer-notice">
          {t("workspace.fileViewer.tableTruncated", { count: MAX_RENDERED_ROWS })}
        </div>
      ) : null}
      <div className="fv-grid-wrap">
        <table className="fv-table">
          <thead>
            <tr>
              <th className="rownum">#</th>
              {header.map((cell, index) => (
                <th key={index} onClick={() => onSort(index)}>
                  {cell}
                  {sort && sort.col === index ? (
                    <span className="sort">
                      {sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="rownum">{rowIndex + 1}</td>
                {header.map((_, colIndex) => (
                  <td key={colIndex}>{row[colIndex] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
