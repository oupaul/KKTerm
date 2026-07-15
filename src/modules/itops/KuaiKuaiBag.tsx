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
    if (!para.trim()) {
      lines.push("");
      continue;
    }
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
  face = "front",
}: {
  style?: KuaiKuaiStyle | null;
  expiry?: string | null;
  notes?: string | null;
  face?: "front" | "rear";
}) {
  const id = useId().replace(/:/g, "");
  const bag = `${id}-bag`;
  const sheen = `${id}-sheen`;
  const puff = `${id}-puff`;
  const rearBag = `${id}-rear-bag`;
  const rearSheen = `${id}-rear-sheen`;
  const rearPuff = `${id}-rear-puff`;
  const noteClip = `${id}-note`;
  const transform = style === "laidDown" ? "translate(0 112) rotate(-90) scale(.33 1.05)" : undefined;
  const grayscale = kuaiKuaiGrayscale(expiry);
  const noteLines = kuaiKuaiNoteLines(notes);

  return (
    <svg
      className="kk-bag"
      data-style={style}
      data-face={face}
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
        <linearGradient id={rearBag} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dceca9" />
          <stop offset=".48" stopColor="#edf4c7" />
          <stop offset="1" stopColor="#c4db83" />
        </linearGradient>
        <linearGradient id={rearSheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".2" />
          <stop offset=".46" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#738d38" stopOpacity=".18" />
        </linearGradient>
        <radialGradient id={rearPuff} cx="45%" cy="36%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity=".26" />
          <stop offset=".64" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#718b37" stopOpacity=".18" />
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
          fill={`url(#${face === "rear" ? rearBag : bag})`}
          stroke={face === "rear" ? "#819d43" : "#3f8a1c"}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M22 31Q140 8 258 31C251 116 251 224 258 309Q140 332 22 309C29 224 29 116 22 31Z" fill={`url(#${face === "rear" ? rearPuff : puff})`} pointerEvents="none" />
        <path
          d="M16 24C22 112 22 228 16 316L264 316C258 228 258 112 264 24Z"
          fill={`url(#${face === "rear" ? rearSheen : sheen})`}
        />
        <path d="M20 27Q140 40 260 27M20 313Q140 300 260 313" fill="none" stroke={face === "rear" ? "#718e38" : "#3f8a1c"} strokeWidth="1.3" opacity=".42" />
        {face === "rear" ? (
          <g className="kk-bag-rear">
            <path d="M140 37C137 99 142 242 139 303" fill="none" stroke="#849d49" strokeWidth="1.4" opacity=".48" />
            <path d="M143 38C147 113 141 223 145 302" fill="none" stroke="#fff" strokeWidth="1" opacity=".34" />

            <g className="kk-rear-mini-pack" transform="rotate(-4 78 91)">
              <path d="M38 49l5-4 5 3 6-3 6 3 7-3 6 3 7-3 7 3 7-3 6 4-3 76-5 3-6-3-6 3-7-3-7 3-7-3-7 3-6-3-6 3-5-3Z" fill="#73b936" stroke="#438423" strokeWidth="1.2" />
              <rect x="45" y="57" width="51" height="12" rx="3" fill="#df2b28" />
              <text x="70.5" y="65.7" textAnchor="middle" fontWeight="900" fontSize="7" fill="#fff">KK</text>
              <rect x="44" y="73" width="54" height="27" rx="4" fill="#f8f6dc" stroke="#4c8b2b" />
              <circle cx="59" cy="83" r="7" fill="#ffd4a1" stroke="#1e2430" strokeWidth="1" />
              <path d="M52 81q7-10 14 0l-2-8-5-3-6 3Z" fill="#142c62" />
              <circle cx="57" cy="83" r=".8" fill="#111" /><circle cx="62" cy="83" r=".8" fill="#111" />
              <path d="M57 87q3 2 6 0" fill="none" stroke="#c22a2a" strokeWidth="1" strokeLinecap="round" />
              <text x="73" y="84" fontWeight="800" fontSize="5.8" fill="#30902c">GOOD</text>
              <text x="73" y="92" fontWeight="900" fontSize="7" fill="#202622">BEHAVE!</text>
              <rect x="48" y="105" width="44" height="3" rx="1.5" fill="#d32b26" />
              <rect x="48" y="112" width="36" height="2" rx="1" fill="#33452a" opacity=".75" />
            </g>

            <g className="kk-rear-hand" fill="#f8f3d9" stroke="#20251f" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
              <path d="M104 66l12 12 7-10 6 4-5 10 9 1-1 7-12-1-2 15-7-1 1-15-10-7Z" />
              <path d="M105 66l10-5 4 5-3 12" />
            </g>
            <path d="M103 58q19-10 31 2" fill="none" stroke="#d82f2d" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M129 54l6 6-8 3" fill="none" stroke="#d82f2d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <g fill="#26331d">
              <rect x="40" y="137" width="86" height="2.5" rx="1.25" />
              <rect x="40" y="144" width="77" height="2" rx="1" opacity=".78" />
              <rect x="40" y="150" width="91" height="2" rx="1" opacity=".62" />
              <rect x="40" y="156" width="69" height="2" rx="1" opacity=".62" />
            </g>

            <g className="kk-rear-kk-mark">
              <text
                x="195"
                y="137"
                textAnchor="middle"
                fontFamily="var(--app-mono-font-family, monospace)"
                fontWeight="900"
                fontSize="50"
                letterSpacing="-4"
                fill="#2856a4"
              >KK</text>
            </g>

            <g className="kk-rear-song">
              <text x="78" y="181" textAnchor="middle" fontWeight="900" fontSize="12" fill="#d23b32">乖乖歌</text>
              <path d="M113 171q5-8 8 0m-4-7v13" fill="none" stroke="#cf8133" strokeWidth="2" strokeLinecap="round" />
              <g fill="#6f412c" fontFamily="var(--app-mono-font-family, monospace)" fontSize="5.5">
                <text x="39" y="193">1 2 3 1 · 1 2 3 1</text>
                <text x="39" y="202">3 4 5 — · 3 4 5 —</text>
                <text x="39" y="211">5 6 5 4 3 1 · 5 6</text>
                <text x="39" y="220">乖 乖 做 好 事</text>
                <text x="39" y="229">2 5 1 — · 2 5 1 —</text>
                <text x="39" y="238">1 3 5 3 · 2 4 6 4</text>
                <text x="39" y="247">平 安 又 順 利</text>
              </g>
              <g fill="#d08a38">
                <circle cx="43" cy="258" r="2.2" /><path d="M45 258v-10h5" fill="none" stroke="#d08a38" strokeWidth="1.8" />
                <circle cx="62" cy="264" r="2.2" /><path d="M64 264v-12h6" fill="none" stroke="#d08a38" strokeWidth="1.8" />
                <circle cx="116" cy="258" r="2.2" /><path d="M118 258v-10h5" fill="none" stroke="#d08a38" strokeWidth="1.8" />
              </g>
            </g>

            <g className="kk-rear-nutrition">
              <g fill="#263321">
                <rect x="149" y="188" width="83" height="2.5" rx="1.25" />
                <rect x="149" y="194" width="73" height="1.8" rx=".9" opacity=".75" />
                <rect x="149" y="199" width="80" height="1.8" rx=".9" opacity=".6" />
              </g>
              <rect x="149" y="207" width="84" height="54" fill="#edf3ca" fillOpacity=".58" stroke="#35432b" strokeWidth="1.2" />
              <path d="M170 207v54M205 207v54" stroke="#4c5b3f" strokeWidth=".7" />
              {Array.from({ length: 7 }, (_, index) => (
                <line key={index} x1="149" y1={214 + index * 6.7} x2="233" y2={214 + index * 6.7} stroke="#4c5b3f" strokeWidth=".65" />
              ))}
              <g fill="#36432e">
                {Array.from({ length: 12 }, (_, index) => (
                  <rect key={index} x={153 + (index % 3) * 24} y={210 + Math.floor(index / 3) * 13.4} width={index % 2 ? "13" : "9"} height="1.5" rx=".75" />
                ))}
              </g>
            </g>
            <g className="kk-rear-barcode" fill="#20251f">
              {Array.from({ length: 25 }, (_, index) => (
                <rect key={index} x={157 + index * 2.65} y="267" width={index % 5 === 0 ? "2" : index % 3 === 0 ? "1.35" : ".75"} height={index % 4 === 0 ? "24" : "21"} />
              ))}
            </g>
            <text x="190" y="297" textAnchor="middle" fontFamily="var(--app-mono-font-family, monospace)" fontSize="5.5" fill="#293125">4 710000 196804</text>
            <g transform="translate(43 284)" fill="none" stroke="#4b772d" strokeWidth="1.6">
              <path d="M0 10l7-8 7 8-4 1" /><path d="M18 2l9 1 3 10-4-1" /><path d="M31 13l-8 5-8-5 4-2" />
            </g>
            <rect x="222" y="291" width="20" height="8" rx="2" fill="#2b9a9a" opacity=".8" />
          </g>
        ) : (
          <>
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
          </>
        )}
      </g>
    </svg>
  );
}
