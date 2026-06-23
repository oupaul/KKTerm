// Lane color palettes and author-avatar derivation for the commit graph.
// Palettes are ported from the redesign mockup (`git-data.jsx`). Lane color is a
// graph-semantic accent independent of the app color scheme, so these stay as
// explicit values rather than theme tokens (the surrounding chrome uses tokens).

export type LaneColorMode = "colorful" | "restrained";
export type GitTheme = "light" | "dark";

const LANE_PALETTES: Record<LaneColorMode, Record<GitTheme, string[]>> = {
  colorful: {
    light: ["#0a84ff", "#30a46c", "#a855e0", "#f0820f", "#e0457b", "#13a3b8", "#c79200"],
    dark: ["#3a9bff", "#3ad07e", "#c07bf0", "#ff9f0a", "#ff5f8f", "#34c7dc", "#e6c01f"],
  },
  restrained: {
    light: ["#0a84ff", "#3a93ff", "#6aa9f0", "#5566d8", "#3f76c4", "#7b8bd6", "#4a9ad0"],
    dark: ["#3a9bff", "#5fa9ff", "#7fbcff", "#7e8cff", "#5f95e6", "#9aa6f0", "#62b4e0"],
  },
};

export function lanePalette(mode: LaneColorMode, theme: GitTheme): string[] {
  return LANE_PALETTES[mode]?.[theme] ?? LANE_PALETTES.colorful[theme];
}

export function laneColor(lane: number, palette: string[]): string {
  const len = palette.length;
  return palette[((lane % len) + len) % len];
}

// Author avatars: a deterministic color + initials derived from the author's
// name/email, since real repos have no fixed author registry like the mockup.
const AVATAR_COLORS = [
  "#0a84ff", "#30a46c", "#a855e0", "#f0820f", "#e0457b",
  "#13a3b8", "#c79200", "#5566d8", "#d2553f", "#2aa198",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function authorColor(name: string, email: string): string {
  const key = (email || name).trim().toLowerCase();
  return AVATAR_COLORS[hashString(key) % AVATAR_COLORS.length];
}

export function authorInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
