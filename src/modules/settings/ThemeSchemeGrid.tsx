import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ColorScheme } from "../../types";

/**
 * Theme color-scheme grid for Settings ▸ Appearance.
 *
 * Each tile renders a generated mini-app preview (activity rail, connection
 * sidebar, tabs, terminal) from the scheme's tokens — no images. The tokens
 * mirror `src/styles/colorSchemes.css`. The terminal stays dark regardless of
 * scheme, matching the real app where a terminal keeps its own palette.
 */

type SchemeTokens = {
  bg: string;
  chrome: string;
  surface: string;
  surfmuted: string;
  /** Optional terminal background override (defaults to the dark terminal). */
  term?: string;
  text: string;
  textfaint: string;
  border: string;
  accent: string;
  accentsoft: string;
  green: string;
  nav: string;
  navtext: string;
  navaccent: string;
};

/** Schemes that resolve their palette from the OS render an AUTO split tile. */
type SchemeEntry = SchemeTokens | { auto: true };

/** Default dark terminal background when a scheme doesn't override it. */
const TERM_DEFAULT = "#111820";

const SCHEME_TOKENS: Record<ColorScheme, SchemeEntry> = {
  default: {
    bg: "#ececed", chrome: "#f6f6f7", surface: "#ffffff", surfmuted: "#f4f4f6",
    text: "#1d1d1f", textfaint: "#97979d", border: "#d6d6db",
    accent: "#0a84ff", accentsoft: "#e6f0ff", green: "#34c759",
    nav: "#202936", navtext: "#d8e1ef", navaccent: "#60a5fa",
  },
  dark: {
    bg: "#1c1c1e", chrome: "#2c2c2e", surface: "#28282a", surfmuted: "#232325",
    text: "#f5f5f7", textfaint: "#6d6d72", border: "#4a4a4e",
    accent: "#0a84ff", accentsoft: "#18334f", green: "#32d74b",
    nav: "#202936", navtext: "#d8e1ef", navaccent: "#60a5fa",
  },
  light: {
    bg: "#ffffff", chrome: "#ffffff", surface: "#ffffff", surfmuted: "#f5f7fa",
    text: "#0a1628", textfaint: "#6b7796", border: "#cdd5e3",
    accent: "#1d4ed8", accentsoft: "#dbeafe", green: "#0d6b3d",
    nav: "#202936", navtext: "#d8e1ef", navaccent: "#60a5fa",
  },
  "match-os": { auto: true },
  mac: {
    bg: "#ececec", chrome: "#f5f5f7", surface: "#ffffff", surfmuted: "#f5f5f7",
    text: "#1d1d1f", textfaint: "#aeaeb2", border: "#d2d2d7",
    accent: "#0071e3", accentsoft: "#e8f0fe", green: "#34c759",
    nav: "#e4e4e8", navtext: "#1d1d1f", navaccent: "#0071e3",
  },
  orange: {
    bg: "#fff0d6", chrome: "#ff8a00", surface: "#ffffff", surfmuted: "#fff7e8",
    text: "#102047", textfaint: "#77809a", border: "#ffd28a",
    accent: "#ff6f00", accentsoft: "#ffe2b5", green: "#2db833",
    nav: "#ff7900", navtext: "#ffffff", navaccent: "#113d86",
  },
  purple: {
    bg: "#1e1836", chrome: "#252042", surface: "#2d2650", surfmuted: "#252042",
    text: "#e8e4f4", textfaint: "#6e65a3", border: "#3d3566",
    accent: "#a78bfa", accentsoft: "#2e2852", green: "#4ade80",
    nav: "#1b1536", navtext: "#ece6ff", navaccent: "#c4b5fd",
  },
  pink: {
    bg: "#fff0f5", chrome: "#fff5f8", surface: "#ffffff", surfmuted: "#fff0f3",
    text: "#2d1b3a", textfaint: "#9b85a8", border: "#e8d0e0",
    accent: "#c026d3", accentsoft: "#fae8ff", green: "#15803d",
    nav: "#5a2148", navtext: "#ffe3f1", navaccent: "#f9a8d4",
  },
  "green-kuai-kuai": {
    bg: "#ffffff", chrome: "#f6fff0", surface: "#ffffff", surfmuted: "#f6fff0",
    text: "#082d68", textfaint: "#6f86aa", border: "#8bcf4c",
    accent: "#082d68", accentsoft: "#dde8fa", green: "#62bd2f",
    nav: "#a7ec5a", navtext: "#082d68", navaccent: "#082d68",
  },
  "blue-see": {
    bg: "#0c1929", chrome: "#111f33", surface: "#182840", surfmuted: "#111f33",
    text: "#d8e6f4", textfaint: "#4a6c8e", border: "#1e3252",
    accent: "#4da6ff", accentsoft: "#152e4a", green: "#3fb87b",
    nav: "#0a1525", navtext: "#c8dcf0", navaccent: "#7dc2ff",
  },
  "blue-green-white": {
    bg: "#ffffff", chrome: "#f4fbff", surface: "#ffffff", surfmuted: "#eaf7fc",
    term: "#07151c",
    text: "#111827", textfaint: "#7b8794", border: "#b9e3ee",
    accent: "#1fa0cb", accentsoft: "#d9f3fb", green: "#73c82d",
    nav: "#1fa0cb", navtext: "#ffffff", navaccent: "#73c82d",
  },
  confetti: {
    bg: "#fef9f0", chrome: "#fffcf7", surface: "#ffffff", surfmuted: "#fff8ec",
    text: "#2d1f3a", textfaint: "#aa8ec0", border: "#e8dae8",
    accent: "#e040b0", accentsoft: "#ffe8f8", green: "#2eaa6a",
    nav: "#3a2550", navtext: "#f0e0f8", navaccent: "#f098d0",
  },
  "bubble-tea": {
    bg: "#faf3e6", chrome: "#fefbf6", surface: "#ffffff", surfmuted: "#f8f0e2",
    text: "#3b2216", textfaint: "#b89a7a", border: "#e8d5b8",
    accent: "#c47a38", accentsoft: "#fdf0e2", green: "#6b8e4e",
    nav: "#3b2216", navtext: "#f5e6d0", navaccent: "#e0b080",
  },
  semiconductor: {
    bg: "#f4f4f4", chrome: "#ffffff", surface: "#ffffff", surfmuted: "#f1f1f1",
    term: "#080808",
    text: "#111111", textfaint: "#666666", border: "#d5d5d5",
    accent: "#e60012", accentsoft: "#ffe1e4", green: "#147a3f",
    nav: "#111111", navtext: "#ffffff", navaccent: "#ff1f2f",
  },
};

/** Light/dark references that compose the AUTO (Match OS) split tile. */
const LIGHT_REF = SCHEME_TOKENS.default as SchemeTokens;
const DARK_REF = SCHEME_TOKENS.dark as SchemeTokens;

function schemeVars(s: SchemeTokens): CSSProperties {
  return {
    "--m-bg": s.bg,
    "--m-chrome": s.chrome,
    "--m-surface": s.surface,
    "--m-surfmuted": s.surfmuted,
    "--m-term": s.term ?? TERM_DEFAULT,
    "--m-text": s.text,
    "--m-textfaint": s.textfaint,
    "--m-border": s.border,
    "--m-hair": `color-mix(in srgb, ${s.border} 60%, transparent)`,
    "--m-accent": s.accent,
    "--m-accentsoft": s.accentsoft,
    "--m-folder": s.green,
    "--m-green": s.green,
    "--m-nav": s.nav,
    "--m-navtext": s.navtext,
    "--m-navaccent": s.navaccent,
  } as CSSProperties;
}

/** The generated app interior: rail + sidebar + tabs + terminal. */
function MiniInterior() {
  return (
    <>
      <div className="mini-tb"><i /><i /><i /></div>
      <div className="mini-body">
        <div className="mini-rail">
          <b /><b className="on" /><b /><b /><b />
        </div>
        <div className="mini-side">
          <div className="shead" />
          <div className="srows">
            <div className="srow"><i /><b style={{ flexBasis: "70%" }} /></div>
            <div className="srow sel"><i /><b style={{ flexBasis: "82%" }} /></div>
            <div className="srow"><i /><b style={{ flexBasis: "60%" }} /></div>
            <div className="srow dim"><i /><b style={{ flexBasis: "74%" }} /></div>
            <div className="srow dim"><i /><b style={{ flexBasis: "52%" }} /></div>
          </div>
        </div>
        <div className="mini-main">
          <div className="mini-tabs">
            <div className="mtab act"><b /></div>
            <div className="mtab"><b /></div>
            <div className="mtab-add" />
          </div>
          <div className="mini-term">
            <div className="tline">
              <span className="tseg" style={{ flexBasis: "26%", background: "var(--t-green)" }} />
              <span className="tseg" style={{ flexBasis: "20%", background: "var(--t-blue)" }} />
            </div>
            <div className="tline"><span className="tseg" style={{ flexBasis: "64%", background: "var(--t-fg)" }} /></div>
            <div className="tline"><span className="tseg" style={{ flexBasis: "46%", background: "var(--t-dim)" }} /></div>
            <div className="tline"><span className="tseg" style={{ flexBasis: "38%", background: "var(--t-yellow)" }} /></div>
            <div className="tline">
              <span className="tseg" style={{ flexBasis: "14%", background: "var(--t-green)" }} />
              <span className="tcursor" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MiniApp({ scheme, autoLabel }: { scheme: SchemeEntry; autoLabel: string }) {
  if ("auto" in scheme) {
    return (
      <div className="mini auto" style={schemeVars(LIGHT_REF)}>
        <div className="mini-layer bottom" style={schemeVars(LIGHT_REF)}><MiniInterior /></div>
        <div className="mini-layer top" style={schemeVars(DARK_REF)}><MiniInterior /></div>
        <span className="mini-auto-badge">{autoLabel}</span>
      </div>
    );
  }
  return (
    <div className="mini" style={schemeVars(scheme)}>
      <MiniInterior />
    </div>
  );
}

function ThemeCard({
  value,
  name,
  autoLabel,
  selected,
  onSelect,
}: {
  value: ColorScheme;
  name: string;
  autoLabel: string;
  selected: boolean;
  onSelect: (value: ColorScheme) => void;
}) {
  return (
    <button
      type="button"
      className={"theme-card" + (selected ? " selected" : "")}
      onClick={() => onSelect(value)}
      aria-pressed={selected}
    >
      <div className="mini-frame">
        <MiniApp scheme={SCHEME_TOKENS[value]} autoLabel={autoLabel} />
        <div className="theme-check"><Check size={12} strokeWidth={3.4} /></div>
      </div>
      <div className="theme-meta">
        <span className="theme-radio" />
        <span className="theme-name">{name}</span>
      </div>
    </button>
  );
}

const SCHEME_ORDER: { value: ColorScheme; labelKey: string }[] = [
  { value: "default", labelKey: "settings.schemeDefault" },
  { value: "dark", labelKey: "settings.schemeDark" },
  { value: "light", labelKey: "settings.schemeLight" },
  { value: "match-os", labelKey: "settings.schemeMatchOs" },
  { value: "mac", labelKey: "settings.schemeMac" },
  { value: "orange", labelKey: "settings.schemeOrange" },
  { value: "purple", labelKey: "settings.schemePurple" },
  { value: "pink", labelKey: "settings.schemePink" },
  { value: "green-kuai-kuai", labelKey: "settings.schemeGreenKuaiKuai" },
  { value: "blue-see", labelKey: "settings.schemeBlueSee" },
  { value: "blue-green-white", labelKey: "settings.schemeBlueGreenWhite" },
  { value: "confetti", labelKey: "settings.schemeConfetti" },
  { value: "bubble-tea", labelKey: "settings.schemeBubbleTea" },
  { value: "semiconductor", labelKey: "settings.schemeSemiconductor" },
];

export function ThemeSchemeGrid({
  selected,
  onSelect,
}: {
  selected: ColorScheme;
  onSelect: (value: ColorScheme) => void;
}) {
  const { t } = useTranslation();
  const autoLabel = t("settings.schemeMatchOsBadge");
  return (
    <div className="theme-grid" role="radiogroup" aria-label={t("settings.colorScheme")}>
      {SCHEME_ORDER.map((scheme) => (
        <ThemeCard
          key={scheme.value}
          value={scheme.value}
          name={t(scheme.labelKey)}
          autoLabel={autoLabel}
          selected={selected === scheme.value}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
