export interface TerminalFontAtlasRefreshTarget {
  clearFontAtlas: () => void;
  redraw: () => void;
}

export function refreshTerminalFontAtlases(targets: Iterable<TerminalFontAtlasRefreshTarget>) {
  const refreshTargets = [...targets];
  for (const target of refreshTargets) {
    target.clearFontAtlas();
  }
  for (const target of refreshTargets) {
    target.redraw();
  }
}
