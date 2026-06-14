// Big Sur-flavoured sidebar place / drive glyphs for the local File Explorer
// navigation sidebar. Single-color glyphs (currentColor) so a per-item tint can
// be applied by setting the wrapping element's color. Ported from the KKTerm
// redesign reference (sidebar-icons.jsx).

import type { ReactNode } from "react";

export const PLACE_TINTS: Record<string, string> = {
  home: "#0a84ff",
  desktop: "#8e8e93",
  documents: "#0a84ff",
  downloads: "#30b0c7",
  pictures: "#af52de",
  folder: "#3a93ff",
  code: "#30c48d",
  internaldrive: "#8e8e93",
  externaldrive: "#ff9f0a",
  server: "#0a84ff",
};

const PLACE_GLYPHS: Record<string, ReactNode> = {
  home: (
    <g fill="currentColor">
      <path d="M12 3.2 3.5 10v.02c-.5.4-.2 1.2.43 1.2H5.2v7.3c0 .82.66 1.48 1.48 1.48h2.9v-4.7c0-.66.53-1.2 1.2-1.2h2.44c.66 0 1.2.54 1.2 1.2V20h2.9c.82 0 1.48-.66 1.48-1.48v-7.3h1.27c.63 0 .93-.8.43-1.2L12 3.2Z" />
    </g>
  ),
  desktop: (
    <g fill="currentColor">
      <rect x="2.6" y="4" width="18.8" height="12.3" rx="2.2" />
      <path d="M9 19.3h6l.5 1.4H8.5l.5-1.4Z" />
    </g>
  ),
  documents: (
    <g fill="currentColor">
      <path d="M6.4 2.8h6.7c.32 0 .62.13.85.36l4.5 4.5c.22.22.35.53.35.85V20c0 1-.8 1.8-1.8 1.8H6.4c-1 0-1.8-.8-1.8-1.8V4.6c0-1 .8-1.8 1.8-1.8Z" />
      <path d="M13 3v3.6c0 .66.54 1.2 1.2 1.2h3.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.1" />
    </g>
  ),
  downloads: (
    <g>
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path d="M12 7v7m0 0 3-3m-3 3-3-3M7.6 16.4h8.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  pictures: (
    <g>
      <rect x="3" y="4.5" width="18" height="15" rx="2.6" fill="currentColor" />
      <circle cx="8.7" cy="9.4" r="1.8" fill="#fff" fillOpacity="0.92" />
      <path d="M4.5 17.5 9.6 12l3.3 3 3.4-4 3.2 4.4" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  ),
  folder: (
    <g fill="currentColor">
      <path d="M3.2 7.4c0-1.1.9-2 2-2h3.7c.5 0 .98.2 1.34.55l1 .98c.18.18.42.27.67.27h7.6c1.1 0 2 .9 2 2v8.5c0 1.1-.9 2-2 2H5.2c-1.1 0-2-.9-2-2V7.4Z" />
    </g>
  ),
  code: (
    <g>
      <path d="M7 2.8h6.5c.32 0 .62.13.85.36l4.3 4.3c.22.22.35.53.35.85V20c0 1-.8 1.8-1.8 1.8H7c-1 0-1.8-.8-1.8-1.8V4.6c0-1 .8-1.8 1.8-1.8Z" fill="currentColor" />
      <path d="M9.6 12.2 11.4 14l-1.8 1.8M14.4 12.2 12.6 14l1.8 1.8" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  internaldrive: (
    <g>
      <rect x="3" y="6.5" width="18" height="11" rx="2.4" fill="currentColor" />
      <circle cx="17" cy="12" r="1.5" fill="#fff" fillOpacity="0.92" />
      <path d="M6.5 12h6" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  externaldrive: (
    <g>
      <rect x="3" y="6.5" width="18" height="11" rx="2.4" fill="currentColor" />
      <circle cx="17" cy="12" r="1.5" fill="#fff" fillOpacity="0.92" />
      <path d="M6.5 10.2h4.5M6.5 13.8h6.5" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  server: (
    <g fill="currentColor">
      <rect x="3" y="4" width="18" height="6.5" rx="1.8" />
      <rect x="3" y="13.5" width="18" height="6.5" rx="1.8" />
      <circle cx="6.8" cy="7.25" r="1.05" fill="#fff" />
      <circle cx="6.8" cy="16.75" r="1.05" fill="#fff" />
    </g>
  ),
};

export function placeTintFor(icon: string) {
  return PLACE_TINTS[icon] ?? "var(--accent)";
}

export function PlaceIcon({ name, size = 17 }: { name: string; size?: number }) {
  const glyph = PLACE_GLYPHS[name] ?? PLACE_GLYPHS.folder;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {glyph}
    </svg>
  );
}
