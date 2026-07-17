export const LARGE_TEXT_LINE_HEIGHT = 20;
export const LARGE_TEXT_OVERSCAN = 20;

// Chromium caps practical layout dimensions. Compress very tall documents into
// a stable scrollbar range and map that range proportionally across all lines.
const MAX_SCROLL_HEIGHT = 8_000_000;

export interface LargeTextVirtualWindow {
  start: number;
  end: number;
  top: number;
  totalHeight: number;
}

export function largeTextVirtualWindow({
  scrollTop,
  viewportHeight,
  totalLines,
}: {
  scrollTop: number;
  viewportHeight: number;
  totalLines: number;
}): LargeTextVirtualWindow {
  if (totalLines <= 0) {
    return { start: 0, end: 0, top: 0, totalHeight: 0 };
  }

  const visibleCount =
    Math.ceil(Math.max(1, viewportHeight) / LARGE_TEXT_LINE_HEIGHT) +
    LARGE_TEXT_OVERSCAN * 2;
  const naturalHeight = totalLines * LARGE_TEXT_LINE_HEIGHT;
  const totalHeight = Math.min(naturalHeight, MAX_SCROLL_HEIGHT);
  const maxStart = Math.max(0, totalLines - visibleCount);

  if (naturalHeight <= MAX_SCROLL_HEIGHT) {
    const start = Math.min(
      maxStart,
      Math.max(
        0,
        Math.floor(Math.max(0, scrollTop) / LARGE_TEXT_LINE_HEIGHT) -
          LARGE_TEXT_OVERSCAN,
      ),
    );
    return {
      start,
      end: Math.min(totalLines, start + visibleCount),
      top: start * LARGE_TEXT_LINE_HEIGHT,
      totalHeight,
    };
  }

  const maxScrollTop = Math.max(1, totalHeight - Math.max(1, viewportHeight));
  const ratio = Math.min(1, Math.max(0, scrollTop) / maxScrollTop);
  const start = Math.round(ratio * maxStart);
  const windowHeight = Math.min(totalHeight, visibleCount * LARGE_TEXT_LINE_HEIGHT);
  const top = Math.min(
    Math.max(0, totalHeight - windowHeight),
    Math.max(0, scrollTop - LARGE_TEXT_OVERSCAN * LARGE_TEXT_LINE_HEIGHT),
  );

  return {
    start,
    end: Math.min(totalLines, start + visibleCount),
    top,
    totalHeight,
  };
}

export function splitLargeTextPage(text: string, expectedLineCount: number): string[] {
  return text.split(/\r\n|\n|\r/).slice(0, Math.max(0, expectedLineCount));
}

