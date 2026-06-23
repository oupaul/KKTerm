// Resolve whether the Git Browser should use its light or dark lane palette by
// measuring the luminance of the surface's resolved background. This follows
// whatever app color scheme is active (Default, Dark, or any custom scheme)
// without hard-coding a scheme name list.
import { useEffect, useState, type RefObject } from "react";
import type { GitTheme } from "./gitPalette";

function isDark(color: string): boolean {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) {
    return false;
  }
  const [r, g, b] = match[1].split(",").map((v) => parseFloat(v.trim()));
  // Rec. 601 luma; below mid-grey reads as a dark surface.
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma < 0.5;
}

export function useGitTheme(ref: RefObject<HTMLElement | null>): GitTheme {
  const [theme, setTheme] = useState<GitTheme>("light");
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) {
        return;
      }
      const bg = getComputedStyle(el).backgroundColor;
      setTheme(isDark(bg) ? "dark" : "light");
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-color-scheme"],
    });
    return () => observer.disconnect();
  }, [ref]);
  return theme;
}
