import { useId } from "react";

export type KuaiKuaiStyle = "full" | "laidDown";

/** Days before the expiry date over which the bag's colors drain away. */
export const KUAIKUAI_FADE_DAYS = 30;

// The white note panel's writing area: the ruled lines run x 58–222 with the
// handwriting drawn at this font size, so wrapping estimates glyph advances
// (an SVG <text> cannot wrap by itself).
const NOTE_FONT_SIZE = 10.5;
const NOTE_LINE_WIDTH = 160;
const NOTE_MAX_LINES = 3;
// Ruled lines sit at y 246/263/280; each handwriting baseline rests just above.
const NOTE_BASELINES = [243.5, 260.5, 277.5];
// Tiny per-line rotation/indent jitter so the writing reads as scribbled by hand.
const NOTE_TILTS = [-1.3, 0.9, -0.6];
const NOTE_INDENTS = [0, 2.5, 1];

// CJK ideographs, kana, hangul, and fullwidth forms write ~1em wide; other
// glyphs average a narrower handwriting advance.
const WIDE_CHAR_RANGES =
  "\\u1100-\\u11ff\\u2e80-\\u9fff\\ua000-\\ua4cf\\uac00-\\ud7a3\\uf900-\\ufaff\\ufe30-\\ufe4f\\uff00-\\uff60\\u3000-\\u303f";
const WIDE_CHAR = new RegExp(`[${WIDE_CHAR_RANGES}]`);
// Whitespace runs, single wide chars, and narrow-glyph words wrap as units.
const NOTE_TOKEN = new RegExp(`\\s+|[${WIDE_CHAR_RANGES}]|[^\\s${WIDE_CHAR_RANGES}]+`, "g");

function noteCharWidth(ch: string): number {
  if (WIDE_CHAR.test(ch)) return NOTE_FONT_SIZE;
  if (ch === " ") return NOTE_FONT_SIZE * 0.32;
  return NOTE_FONT_SIZE * 0.56;
}

function noteTextWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += noteCharWidth(ch);
  return width;
}

/** Wrap a device's notes onto the bag's ruled note lines: user line breaks are
 *  kept, long runs wrap at spaces (or per character for CJK / unbroken runs),
 *  and anything past the last ruled line is ellipsized. */
export function kuaiKuaiNoteLines(notes?: string | null): string[] {
  const text = (notes ?? "").trim();
  if (!text) return [];
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    let width = 0;
    const flush = () => {
      if (line.trim()) lines.push(line.trimEnd());
      line = "";
      width = 0;
    };
    for (const token of para.match(NOTE_TOKEN) ?? []) {
      const isSpace = !token.trim();
      const tokenWidth = noteTextWidth(token);
      if (!isSpace && width + tokenWidth > NOTE_LINE_WIDTH) {
        if (tokenWidth <= NOTE_LINE_WIDTH) {
          flush();
        } else {
          // A single run wider than the panel hard-breaks per character.
          for (const ch of token) {
            const w = noteCharWidth(ch);
            if (width + w > NOTE_LINE_WIDTH) flush();
            line += ch;
            width += w;
          }
          continue;
        }
      }
      if (isSpace && !line) continue;
      line += token;
      width += tokenWidth;
    }
    flush();
  }
  if (lines.length > NOTE_MAX_LINES) {
    let last = lines[NOTE_MAX_LINES - 1];
    const budget = NOTE_LINE_WIDTH - noteCharWidth("…");
    while (last && noteTextWidth(last) > budget) last = last.slice(0, -1);
    return [...lines.slice(0, NOTE_MAX_LINES - 1), `${last.trimEnd()}…`];
  }
  return lines;
}

/** Grayscale amount for a bag with the given expiry date: 0 (fresh colors)
 *  until KUAIKUAI_FADE_DAYS days out, then ramping linearly to 1 (fully black
 *  and white) on and after the expiry date. Unset or unparsable dates never
 *  fade. Dates compare calendar-day to calendar-day in local time. */
export function kuaiKuaiGrayscale(expiry?: string | null, now = new Date()): number {
  const match = expiry ? /^\s*(\d{4})-(\d{1,2})-(\d{1,2})/.exec(expiry) : null;
  if (!match) return 0;
  const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (daysLeft <= 0) return 1;
  if (daysLeft >= KUAIKUAI_FADE_DAYS) return 0;
  return (KUAIKUAI_FADE_DAYS - daysLeft) / KUAIKUAI_FADE_DAYS;
}

export function KuaiKuaiBag({
  style = "full",
  expiry,
  notes,
}: {
  style?: KuaiKuaiStyle | null;
  expiry?: string | null;
  notes?: string | null;
}) {
  const id = useId().replace(/:/g, "");
  const bag = `${id}-bag`;
  const sheen = `${id}-sheen`;
  const puff = `${id}-puff`;
  const noteClip = `${id}-note`;
  const transform = style === "laidDown" ? "translate(0 112) rotate(-90) scale(.33 1.05)" : undefined;
  const grayscale = kuaiKuaiGrayscale(expiry);
  const noteLines = kuaiKuaiNoteLines(notes);

  return (
    <svg
      className="kk-bag"
      data-style={style}
      data-expired={grayscale >= 1 || undefined}
      style={grayscale > 0 ? { filter: `grayscale(${Math.round(grayscale * 100)}%)` } : undefined}
      viewBox={style === "laidDown" ? "0 0 360 120" : "0 0 280 340"}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bag} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b6f06a" />
          <stop offset=".52" stopColor="#6cc636" />
          <stop offset="1" stopColor="#4c9a23" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".36" />
          <stop offset=".22" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#2f7d13" stopOpacity=".24" />
        </linearGradient>
        <radialGradient id={puff} cx="42%" cy="38%" r="72%">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".58" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#205f0c" stopOpacity=".34" />
        </radialGradient>
        {noteLines.length ? (
          <clipPath id={noteClip}>
            <rect x="46" y="206" width="188" height="96" rx="12" />
          </clipPath>
        ) : null}
      </defs>
      <g transform={transform}>
        <path
          d="M16 24 21 20 26 25 31 21 36 26 41 22 46 27 51 23 56 28 61 24 66 29 71 25 76 30 81 26 86 31 91 27 96 32 101 28 106 32 111 28 116 33 121 29 126 33 131 29 136 33 141 29 146 33 151 29 156 33 161 29 166 33 171 28 176 32 181 28 186 32 191 27 196 31 201 26 206 30 211 25 216 29 221 24 226 28 231 23 236 27 241 22 246 26 251 21 256 25 261 20 264 24C258 112 258 228 264 316L259 320 254 315 249 319 244 314 239 318 234 313 229 317 224 312 219 316 214 311 209 315 204 310 199 314 194 309 189 313 184 308 179 312 174 308 169 312 164 307 159 311 154 307 149 311 144 307 139 311 134 307 129 311 124 307 119 311 114 307 109 312 104 308 99 312 94 308 89 313 84 309 79 314 74 310 69 315 64 311 59 316 54 312 49 317 44 313 39 318 34 314 29 319 24 315 19 320 16 316C22 228 22 112 16 24Z"
          fill={`url(#${bag})`}
          stroke="#3f8a1c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M22 31Q140 8 258 31C251 116 251 224 258 309Q140 332 22 309C29 224 29 116 22 31Z" fill={`url(#${puff})`} pointerEvents="none" />
        <path
          d="M16 24C22 112 22 228 16 316L264 316C258 228 258 112 264 24Z"
          fill={`url(#${sheen})`}
        />
        <path d="M20 27Q140 40 260 27M20 313Q140 300 260 313" fill="none" stroke="#3f8a1c" strokeWidth="1.3" opacity=".42" />
        <rect x="100" y="46" width="80" height="30" rx="9" fill="#d71920" />
        <text x="140" y="68" textAnchor="middle" fontWeight="800" fontSize="19" letterSpacing=".04em" fill="#fff">KK</text>
        <text x="140" y="89" textAnchor="middle" fontWeight="700" fontSize="7.5" letterSpacing=".22em" fill="#1f5c12">EST · 1968</text>
        <rect x="56" y="98" width="168" height="94" rx="18" fill="#0c1219" stroke="#243344" strokeWidth="1.5" />
        <circle cx="76" cy="116" r="4.4" fill="#ff5f57" />
        <circle cx="92" cy="116" r="4.4" fill="#febc2e" />
        <circle cx="108" cy="116" r="4.4" fill="#28c840" />
        <text x="140" y="158" textAnchor="middle" fontFamily="var(--app-mono-font-family, monospace)" fontWeight="700" fontSize="42" fill="#7ee787">KK</text>
        <text x="140" y="180" textAnchor="middle" fontFamily="var(--app-mono-font-family, monospace)" fontWeight="500" fontSize="10.5" fill="#3f7f4a">&gt;_ behave</text>
        <rect x="44" y="204" width="192" height="100" rx="14" fill="#fff" stroke="#cfe3b0" strokeWidth="1.5" />
        <text x="58" y="227" fontWeight="800" fontSize="14" fill="#d71920">KK</text>
        <g fill="#62bd2f"><circle cx="200" cy="221" r="3.4" /><circle cx="211" cy="221" r="3.4" /><circle cx="222" cy="221" r="3.4" /></g>
        <g stroke="#b9c6da" strokeWidth="1.6" strokeDasharray="2.5 5" strokeLinecap="round">
          <line x1="58" y1="246" x2="222" y2="246" /><line x1="58" y1="263" x2="222" y2="263" /><line x1="58" y1="280" x2="222" y2="280" />
        </g>
        {noteLines.length ? (
          <g
            className="kk-bag-notes"
            clipPath={`url(#${noteClip})`}
            fontFamily='"Segoe Print", "Bradley Hand", "Comic Sans MS", "Kaiti TC", DFKai-SB, KaiTi, cursive'
            fontSize={NOTE_FONT_SIZE}
            fill="#3b5ba5"
            opacity=".92"
          >
            {noteLines.map((line, i) => (
              <text
                key={i}
                x={58 + NOTE_INDENTS[i]}
                y={NOTE_BASELINES[i]}
                transform={`rotate(${NOTE_TILTS[i]} 140 ${NOTE_BASELINES[i]})`}
              >
                {line}
              </text>
            ))}
          </g>
        ) : null}
        {expiry ? <text x="140" y="298" textAnchor="middle" fontWeight="700" fontSize="8.5" fill="#8094ad">EXP {expiry}</text> : <text x="140" y="298" textAnchor="middle" fontWeight="600" fontSize="8.5" fill="#9fb0c8">be good · behave</text>}
      </g>
    </svg>
  );
}
