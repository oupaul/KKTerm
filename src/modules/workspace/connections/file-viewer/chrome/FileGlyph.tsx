import { fileTypeMeta } from "./fileViewerFileType";

/**
 * Finder-style document glyph for the viewer toolbar. Ports the redesign's
 * `FVFileGlyph`: a folded-corner page (or a picture frame for image formats)
 * drawn with the `--doc-fill` / `--doc-stroke` tokens, accented by the
 * file-type tint, with a short uppercase format label on document files.
 */
export function FileGlyph({ path, size = 26 }: { path: string; size?: number }) {
  const { tint, label, shape } = fileTypeMeta(path);

  if (shape === "image") {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <rect
          x="4.5"
          y="4"
          width="19"
          height="20"
          rx="2.6"
          fill="var(--doc-fill)"
          stroke="var(--doc-stroke)"
          strokeWidth="1"
        />
        <circle cx="11" cy="10.5" r="1.7" fill={tint} />
        <path
          d="M7 19.5l4.2-4.4 3 2.7 3.1-3.6 4 5.3"
          fill="none"
          stroke={tint}
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path
        d="M7 3.6h7.9c.4 0 .78.16 1.06.44l4.6 4.6c.28.28.44.66.44 1.06V22.4c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5.6c0-1.1.9-2 2-2Z"
        fill="var(--doc-fill)"
        stroke="var(--doc-stroke)"
        strokeWidth="1"
      />
      <path
        d="M14.6 3.8v4.1c0 .66.54 1.2 1.2 1.2h4.0"
        fill="none"
        stroke="var(--doc-stroke)"
        strokeWidth="1"
      />
      <text
        x="14"
        y="18.6"
        textAnchor="middle"
        fontSize="6.4"
        fontWeight="700"
        fill={tint}
        fontFamily="var(--app-ui-font-family)"
        letterSpacing="0.2"
      >
        {label}
      </text>
    </svg>
  );
}
