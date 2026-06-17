/**
 * Pure file-type detection for the universal File Viewer. Extension is the
 * primary signal; the backend probe's `magic` signature and `isText` heuristic
 * are the fallback when the extension is unknown. Detection is intentionally
 * dependency-free so it can be unit-tested without a DOM or Tauri runtime.
 */

export type ViewerKind =
  | "text"
  | "markdown"
  | "csv"
  | "json"
  | "image"
  | "log"
  | "hex"
  | "pdf";

export interface FileSignals {
  /** Lowercased file path or name. */
  path: string;
  /** Backend probe magic signature, if any (png/jpeg/gif/webp/bmp/pdf/zip/gzip/sqlite). */
  magic?: string | null;
  /** Backend probe text heuristic. */
  isText?: boolean;
}

const IMAGE_EXTENSIONS = new Set([
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

const IMAGE_MAGICS = new Set(["png", "jpeg", "gif", "webp", "bmp"]);

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdown", "mkd", "mdx"]);

const CSV_EXTENSIONS = new Set(["csv", "tsv"]);

const JSON_EXTENSIONS = new Set(["json", "json5", "geojson", "ipynb", "webmanifest"]);

const LOG_EXTENSIONS = new Set(["log", "ndjson", "jsonl"]);

/** Common text/code extensions that should always open as text even when the
 * backend's text heuristic is unsure (e.g. a file with high-byte UTF-8). */
const TEXT_EXTENSIONS = new Set([
  "txt",
  "text",
  "yaml",
  "yml",
  "toml",
  "ini",
  "conf",
  "cfg",
  "env",
  "properties",
  "xml",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "tsx",
  "py",
  "rb",
  "rs",
  "go",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "php",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "bat",
  "cmd",
  "sql",
  "diff",
  "patch",
  "gitignore",
  "dockerfile",
  "makefile",
]);

export function fileExtension(path: string): string {
  const name = path.replace(/[\\/]+$/, "").split(/[\\/]+/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) {
    // Extension-less well-known filenames (Dockerfile, Makefile) fall back to
    // the whole lowercased name so they can map to a text viewer.
    return name.toLowerCase();
  }
  return name.slice(dot + 1).toLowerCase();
}

export function fileBaseName(path: string): string {
  return path.replace(/[\\/]+$/, "").split(/[\\/]+/).pop() ?? path;
}

/** The viewer kinds a user may switch between for a given file. Text and Hex are
 * always available as universal fallbacks; the detected kind is listed first. */
export function availableViewerKinds(signals: FileSignals): ViewerKind[] {
  const primary = detectViewerKind(signals);
  const kinds: ViewerKind[] = [primary];
  if (primary === "image" || primary === "pdf") {
    // Binary document/image formats only meaningfully offer hex as an alternate.
    kinds.push("hex");
    return kinds;
  }
  for (const candidate of ["text", "log", "hex"] as ViewerKind[]) {
    if (!kinds.includes(candidate)) {
      kinds.push(candidate);
    }
  }
  return kinds;
}

export function detectViewerKind(signals: FileSignals): ViewerKind {
  const ext = fileExtension(signals.path);
  const magic = signals.magic ?? null;

  if (IMAGE_MAGICS.has(magic ?? "") || IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }
  if (magic === "pdf" || ext === "pdf") {
    return "pdf";
  }
  if (LOG_EXTENSIONS.has(ext)) {
    return "log";
  }
  if (MARKDOWN_EXTENSIONS.has(ext)) {
    return "markdown";
  }
  if (CSV_EXTENSIONS.has(ext)) {
    return "csv";
  }
  if (JSON_EXTENSIONS.has(ext)) {
    return "json";
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return "text";
  }
  // Unknown extension: trust the backend heuristic. Binary, non-image content
  // falls back to the hex viewer; everything else opens as text.
  if (signals.isText === false) {
    return "hex";
  }
  return "text";
}

/** Whether the viewer should load file contents as UTF-8 text or as bytes. */
export function viewerLoadsText(kind: ViewerKind): boolean {
  return kind !== "image" && kind !== "hex" && kind !== "pdf";
}

/** Viewer kinds that render through an external, runtime-installed dependency
 * (Phase 2) rather than reading the file directly. */
export function viewerUsesExternalDependency(kind: ViewerKind): boolean {
  return kind === "pdf";
}
