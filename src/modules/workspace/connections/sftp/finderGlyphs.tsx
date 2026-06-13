// Finder-style file/folder glyphs, ported from the KKTerm design reference.
// Token-driven (no external assets): folders use --folder-top/--folder-bot and
// documents use --doc-fill/--doc-stroke with a per-type tint. Replaces the bare
// img-based icons so the SFTP browser matches the design language verbatim.
import { useId } from "react";
import type { FileEntry } from "../../../../types";

type TypeMeta = { label: string; tint: string; kind: string; image?: boolean; archive?: boolean };

const TYPE_MAP: Record<string, TypeMeta> = {
  md: { label: "MD", tint: "#5e9bff", kind: "Markdown" },
  txt: { label: "TXT", tint: "#9aa0a6", kind: "Plain Text" },
  json: { label: "JSON", tint: "#e0a23b", kind: "JSON" },
  toml: { label: "TOML", tint: "#e0a23b", kind: "Config" },
  yml: { label: "YML", tint: "#e0a23b", kind: "Config" },
  yaml: { label: "YML", tint: "#e0a23b", kind: "Config" },
  ts: { label: "TS", tint: "#3b82f6", kind: "TypeScript" },
  tsx: { label: "TSX", tint: "#3b82f6", kind: "TypeScript" },
  js: { label: "JS", tint: "#e6c029", kind: "JavaScript" },
  jsx: { label: "JSX", tint: "#e6c029", kind: "JavaScript" },
  rs: { label: "RS", tint: "#d98a4e", kind: "Rust Source" },
  css: { label: "CSS", tint: "#a06bff", kind: "Stylesheet" },
  scss: { label: "SCSS", tint: "#a06bff", kind: "Stylesheet" },
  html: { label: "HTML", tint: "#e8703a", kind: "HTML" },
  htm: { label: "HTML", tint: "#e8703a", kind: "HTML" },
  sh: { label: "SH", tint: "#52b788", kind: "Shell Script" },
  zsh: { label: "ZSH", tint: "#52b788", kind: "Shell Script" },
  bash: { label: "SH", tint: "#52b788", kind: "Shell Script" },
  ps1: { label: "PS1", tint: "#52b788", kind: "Shell Script" },
  conf: { label: "CONF", tint: "#9aa0a6", kind: "Config" },
  ini: { label: "INI", tint: "#9aa0a6", kind: "Config" },
  log: { label: "LOG", tint: "#9aa0a6", kind: "Log" },
  png: { label: "PNG", tint: "#33b0a6", kind: "PNG image", image: true },
  jpg: { label: "JPG", tint: "#33b0a6", kind: "JPEG image", image: true },
  jpeg: { label: "JPG", tint: "#33b0a6", kind: "JPEG image", image: true },
  gif: { label: "GIF", tint: "#33b0a6", kind: "Image", image: true },
  webp: { label: "WEBP", tint: "#33b0a6", kind: "Image", image: true },
  bmp: { label: "BMP", tint: "#33b0a6", kind: "Image", image: true },
  ico: { label: "ICO", tint: "#33b0a6", kind: "Image", image: true },
  svg: { label: "SVG", tint: "#c46bd0", kind: "SVG image", image: true },
  pdf: { label: "PDF", tint: "#ff5a52", kind: "PDF Document" },
  zip: { label: "ZIP", tint: "#b3925a", kind: "Archive", archive: true },
  gz: { label: "GZ", tint: "#b3925a", kind: "Archive", archive: true },
  tar: { label: "TAR", tint: "#b3925a", kind: "Archive", archive: true },
  rar: { label: "RAR", tint: "#b3925a", kind: "Archive", archive: true },
  "7z": { label: "7Z", tint: "#b3925a", kind: "Archive", archive: true },
  dmg: { label: "DMG", tint: "#9aa0a6", kind: "Disk Image", archive: true },
  lock: { label: "LCK", tint: "#9aa0a6", kind: "Lockfile" },
  pem: { label: "KEY", tint: "#e0a23b", kind: "Key" },
  key: { label: "KEY", tint: "#e0a23b", kind: "Key" },
  app: { label: "APP", tint: "#5e9bff", kind: "Application" },
  exe: { label: "EXE", tint: "#5e9bff", kind: "Application" },
};

export function fileMeta(name: string): TypeMeta {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return (
    TYPE_MAP[ext] ?? {
      label: ext ? ext.slice(0, 4).toUpperCase() : "DOC",
      tint: "#9aa0a6",
      kind: ext ? `${ext.toUpperCase()} file` : "Document",
    }
  );
}

function FolderGlyph({ size = 28 }: { size?: number }) {
  const gid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--folder-top)" />
          <stop offset="1" stopColor="var(--folder-bot)" />
        </linearGradient>
      </defs>
      <path
        d="M3 8.6c0-1.33 1.07-2.4 2.4-2.4h4.9c.64 0 1.25.25 1.7.7l1.05 1.05c.45.45 1.06.7 1.7.7h7.85c1.33 0 2.4 1.07 2.4 2.4v8.65c0 1.33-1.07 2.4-2.4 2.4H5.4C4.07 21.5 3 20.43 3 19.1V8.6Z"
        fill={`url(#${gid})`}
      />
    </svg>
  );
}

function DocGlyph({
  size = 28,
  tint = "#9aa0a6",
  image = false,
  archive = false,
}: {
  size?: number;
  tint?: string;
  image?: boolean;
  archive?: boolean;
}) {
  if (image) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <rect x="4.5" y="4" width="19" height="20" rx="2.6" fill="var(--doc-fill)" stroke="var(--doc-stroke)" strokeWidth="1" />
        <circle cx="11" cy="10.5" r="1.7" fill={tint} />
        <path d="M7 19.5l4.2-4.4 3 2.7 3.1-3.6 4 5.3" fill="none" stroke={tint} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }
  if (archive) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <path d="M7 3.6h8.7c.4 0 .78.16 1.06.44l4.2 4.25c.28.28.44.66.44 1.06V22.4c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5.6c0-1.1.9-2 2-2Z" fill="var(--doc-fill)" stroke="var(--doc-stroke)" strokeWidth="1" />
        <path d="M11 4v3M13 7v3M11 10v3M13 13v3" stroke={tint} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M7 3.6h7.9c.4 0 .78.16 1.06.44l4.6 4.6c.28.28.44.66.44 1.06V22.4c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5.6c0-1.1.9-2 2-2Z" fill="var(--doc-fill)" stroke="var(--doc-stroke)" strokeWidth="1" />
      <path d="M14.6 3.8v4.1c0 .66.54 1.2 1.2 1.2h4.0" fill="none" stroke="var(--doc-stroke)" strokeWidth="1" />
      <rect x="8.6" y="13.4" width="10.8" height="2.4" rx="1.2" fill={tint} opacity="0.9" />
    </svg>
  );
}

export function FileGlyph({ entry, size = 22 }: { entry: FileEntry; size?: number }) {
  if (entry.kind === "folder") {
    return <FolderGlyph size={size} />;
  }
  const meta = fileMeta(entry.name);
  return <DocGlyph size={size} tint={meta.tint} image={meta.image} archive={meta.archive} />;
}
