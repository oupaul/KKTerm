// Apple/Finder dialog glyphs (SF-Symbols-ish, 1.7 stroke, rounded).
// Ported from the KKTerm design-language reference kit. Self-contained inline
// SVGs so dialog surfaces share one consistent glyph family.
import type { CSSProperties, ReactNode } from "react";

type GlyphProps = { size?: number; style?: CSSProperties };

function stroke(paths: ReactNode, fill = false) {
  return function Glyph({ size = 16, style }: GlyphProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={fill ? "currentColor" : "none"}
        stroke={fill ? "none" : "currentColor"}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  };
}

export const DIALOG_ICONS = {
  close: stroke(<path d="M6 6l12 12M18 6L6 18" />),
  chevdown: stroke(<path d="M6 9l6 6 6-6" />),
  chevright: stroke(<path d="M9 6l6 6-6 6" />),
  updown: stroke(<path d="M8 10l4-4 4 4M8 14l4 4 4-4" />),
  plus: stroke(<path d="M12 5v14M5 12h14" />),
  minus: stroke(<path d="M5 12h14" />),
  check: stroke(<path d="M5 12.5l4.5 4.5L19 7" />),
  arrowup: stroke(<path d="M12 19V5M6 11l6-6 6 6" />),
  arrowdown: stroke(<path d="M12 5v14M6 13l6 6 6-6" />),
  trash: stroke(<path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />),
  pencil: stroke(
    <>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>,
  ),
  grip: stroke(
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>,
    true,
  ),
  key: stroke(
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2l8.2-8.2M15 5l3 3M18 8l2-2" />
    </>,
  ),
  library: stroke(
    <>
      <path d="M5 4h3v16H5zM10 4h3v16h-3z" />
      <path d="M16.5 5l3.5 1-3 14-3.4-1z" />
    </>,
  ),
  wand: stroke(<path d="M5 19l9-9M14 6l1.5-3 1.5 3 3 1.5-3 1.5L15.5 12 14 9 11 7.5z" />),
  search: stroke(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>,
  ),
  terminal: stroke(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7 9l3 3-3 3M12.5 15h4" />
    </>,
  ),
  server: stroke(
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>,
  ),
  monitor: stroke(
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>,
  ),
  network: stroke(
    <>
      <rect x="9" y="3" width="6" height="6" rx="1.2" />
      <rect x="2" y="15" width="6" height="6" rx="1.2" />
      <rect x="16" y="15" width="6" height="6" rx="1.2" />
      <path d="M12 9v3M5 15v-1.5h14V15" />
    </>,
  ),
  globe: stroke(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>,
  ),
  gear: stroke(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  ),
  palette: stroke(
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2 0-1.3-1-1.6-1-2.6 0-.8.7-1.4 1.5-1.4H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16.5" cy="11" r="1" />
    </>,
  ),
  stack: stroke(<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />),
  dashboard: stroke(
    <>
      <rect x="3" y="3" width="8" height="10" rx="1.5" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" />
      <rect x="13" y="11" width="8" height="10" rx="1.5" />
      <rect x="3" y="15" width="8" height="6" rx="1.5" />
    </>,
  ),
  package: stroke(<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />),
  keyround: stroke(
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2l8.2-8.2M15 5l3 3" />
    </>,
  ),
  bot: stroke(
    <>
      <rect x="3" y="8" width="18" height="12" rx="2.5" />
      <path d="M12 8V4M9 4h6" />
      <circle cx="9" cy="14" r="1" />
      <circle cx="15" cy="14" r="1" />
    </>,
  ),
  coffee: stroke(<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 10h2a2 2 0 0 1 0 5h-2M7 4v2M11 4v2" />),
  info: stroke(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>,
  ),
  alert: stroke(<path d="M12 3l9 16H3l9-16zM12 10v4M12 17.5h.01" />),
  folder: stroke(<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />),
  send: stroke(<path d="M5 12h13M13 6l6 6-6 6" />),
  shield: stroke(<path d="M12 3 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6z" />),
  bolt: stroke(<path d="M13 2 4 14h7l-1 8 9-12h-7z" />),
  hash: stroke(<path d="M5 9h14M5 15h14M10 4l-1 16M16 4l-1 16" />),
  clock: stroke(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
  ),
  cloud: stroke(<path d="M18 10a6 6 0 0 0-11.6-2A4 4 0 0 0 7 16h11a4 4 0 0 0 0-6z" />),
  eye: stroke(
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </>,
  ),
  star: stroke(<path d="M12 3l2.6 5.7 6.2.6-4.7 4.1 1.4 6L12 16.9 6.5 19.4l1.4-6L3.2 9.3l6.2-.6z" />),
  upload: stroke(<path d="M12 19V6M6 11l6-6 6 6M5 20h14" />),
  download: stroke(<path d="M12 5v13M6 13l6 6 6-6M5 20h14" />),
  copy: stroke(
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>,
  ),
  refresh: stroke(<path d="M20 11a8 8 0 10-2.3 5.7M20 20v-4h-4" />),
  up: stroke(<path d="M12 19V5M6 11l6-6 6 6" />),
  newfolder: stroke(<path d="M3 7.5A2 2 0 015 5.5h3.6a2 2 0 011.4.6l1 1a2 2 0 001.4.6H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7.5zM12 11v5M9.5 13.5h5" />),
  home: stroke(<path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" />),
  back: stroke(<path d="M15 6l-6 6 6 6" />),
  forward: stroke(<path d="M9 6l6 6-6 6" />),
  list: stroke(<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />),
  gallery: stroke(<path d="M4 5h6v6H4zM14 5h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />),
  drive: stroke(<path d="M5 5h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM8 9.5h.01" />),
  sidebar: stroke(<path d="M4 5.5h16a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 17V7A1.5 1.5 0 014 5.5zM9.5 5.5v13M5.5 9h1.5M5.5 12h1.5" />),
} as const;

export type DialogIconName = keyof typeof DIALOG_ICONS;

export function DIcon({ name, size = 16, style }: { name: DialogIconName; size?: number; style?: CSSProperties }) {
  const Glyph = DIALOG_ICONS[name];
  return Glyph ? <Glyph size={size} style={style} /> : null;
}
