import { fileExtension } from "../fileViewerModel";

/**
 * File-type identity tints for the toolbar glyph + kind pill swatch. These are
 * the one intentional exception to the "read tokens, never hard-code hex" rule:
 * they encode a file format's brand identity (JS yellow, Rust orange, …), not a
 * theme color, so they stay constant across color schemes. Mirrors the redesign's
 * `FV_TYPE` map. Everything else in the viewer reads `colorSchemes.css` tokens.
 */
const FILE_TYPE_TINTS: Record<string, string> = {
  rs: "#d98a4e",
  ts: "#3b82f6",
  tsx: "#3b82f6",
  js: "#e6c029",
  mjs: "#e6c029",
  cjs: "#e6c029",
  jsx: "#e6c029",
  py: "#4f9bd0",
  md: "#5e9bff",
  markdown: "#5e9bff",
  txt: "#9aa0a6",
  json: "#e0a23b",
  yaml: "#e0a23b",
  yml: "#e0a23b",
  toml: "#e0a23b",
  csv: "#30c48d",
  tsv: "#30c48d",
  log: "#8e8e93",
  sql: "#af52de",
  png: "#33b0a6",
  jpg: "#33b0a6",
  jpeg: "#33b0a6",
  gif: "#33b0a6",
  webp: "#33b0a6",
  bmp: "#33b0a6",
  svg: "#c46bd0",
  pdf: "#ff5a52",
  zip: "#b3925a",
  gz: "#b3925a",
  bin: "#6e6e73",
};

const DEFAULT_TINT = "#9aa0a6";

const IMAGE_GLYPH_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "avif",
  "svg",
]);

export interface FileTypeMeta {
  ext: string;
  /** File-format identity color for the glyph + pill swatch. */
  tint: string;
  /** Up-to-4-char uppercase badge drawn inside the document glyph. */
  label: string;
  /** Which glyph silhouette to draw. */
  shape: "doc" | "image";
}

/** Resolve the glyph/pill identity for a file path from its extension. */
export function fileTypeMeta(path: string): FileTypeMeta {
  const ext = fileExtension(path);
  return {
    ext,
    tint: FILE_TYPE_TINTS[ext] ?? DEFAULT_TINT,
    label: (ext || "DOC").slice(0, 4).toUpperCase(),
    shape: IMAGE_GLYPH_EXTENSIONS.has(ext) ? "image" : "doc",
  };
}
