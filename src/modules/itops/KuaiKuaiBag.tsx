import { useId } from "react";

export type KuaiKuaiStyle = "full" | "laidDown";

/** Days before the expiry date over which the bag's colors drain away. */
export const KUAIKUAI_FADE_DAYS = 30;

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
}: {
  style?: KuaiKuaiStyle | null;
  expiry?: string | null;
}) {
  const id = useId().replace(/:/g, "");
  const bag = `${id}-bag`;
  const sheen = `${id}-sheen`;
  const transform = style === "laidDown" ? "translate(0 112) rotate(-90) scale(.33 1.05)" : undefined;
  const grayscale = kuaiKuaiGrayscale(expiry);

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
      </defs>
      <g transform={transform}>
        <path
          d="M16 24 21 20 26 25 31 21 36 26 41 22 46 27 51 23 56 28 61 24 66 29 71 25 76 30 81 26 86 31 91 27 96 32 101 28 106 32 111 28 116 33 121 29 126 33 131 29 136 33 141 29 146 33 151 29 156 33 161 29 166 33 171 28 176 32 181 28 186 32 191 27 196 31 201 26 206 30 211 25 216 29 221 24 226 28 231 23 236 27 241 22 246 26 251 21 256 25 261 20 264 24C258 112 258 228 264 316L259 320 254 315 249 319 244 314 239 318 234 313 229 317 224 312 219 316 214 311 209 315 204 310 199 314 194 309 189 313 184 308 179 312 174 308 169 312 164 307 159 311 154 307 149 311 144 307 139 311 134 307 129 311 124 307 119 311 114 307 109 312 104 308 99 312 94 308 89 313 84 309 79 314 74 310 69 315 64 311 59 316 54 312 49 317 44 313 39 318 34 314 29 319 24 315 19 320 16 316C22 228 22 112 16 24Z"
          fill={`url(#${bag})`}
          stroke="#3f8a1c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
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
        {expiry ? <text x="140" y="298" textAnchor="middle" fontWeight="700" fontSize="8.5" fill="#8094ad">EXP {expiry}</text> : <text x="140" y="298" textAnchor="middle" fontWeight="600" fontSize="8.5" fill="#9fb0c8">be good · behave</text>}
      </g>
    </svg>
  );
}
