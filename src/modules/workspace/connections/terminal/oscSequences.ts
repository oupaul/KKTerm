// Pure OSC-sequence and hyperlink-rule helpers for the terminal renderer.
// Kept free of xterm imports so the Node test suite can exercise them.

/** OSC 9 / OSC 777 desktop-style notification raised by the running program. */
export interface TerminalNotification {
  title: string | null;
  body: string;
}

/** OSC 133 shell-integration sequences: `A` prompt start, `B` command start,
 * `C` command output start, `D[;exitCode]` command finished. */
export function parseOsc133Sequence(data: string): { kind: "A" | "B" | "C" | "D"; exitCode?: number } | null {
  const [kind, ...params] = data.split(";");
  if (kind !== "A" && kind !== "B" && kind !== "C" && kind !== "D") {
    return null;
  }
  if (kind === "D" && params.length > 0 && params[0] !== "") {
    const exitCode = Number.parseInt(params[0], 10);
    return Number.isFinite(exitCode) ? { kind, exitCode } : { kind };
  }
  return { kind };
}

/** OSC 777 `notify;title;body` (urxvt extension used by systemd, ninja, etc.). */
export function decodeOsc777Notification(data: string): TerminalNotification | null {
  const firstSeparator = data.indexOf(";");
  if (firstSeparator < 0 || data.slice(0, firstSeparator) !== "notify") {
    return null;
  }
  const rest = data.slice(firstSeparator + 1);
  const titleSeparator = rest.indexOf(";");
  if (titleSeparator < 0) {
    const title = rest.trim();
    return title ? { title: null, body: title } : null;
  }
  const title = rest.slice(0, titleSeparator).trim();
  const body = rest.slice(titleSeparator + 1).trim();
  if (!title && !body) {
    return null;
  }
  return { title: title || null, body: body || title };
}

/** Substitute `$0`…`$9` capture references into a hyperlink rule URL template. */
export function buildHyperlinkRuleUrl(urlTemplate: string, match: RegExpMatchArray): string | null {
  const url = urlTemplate.replace(/\$(\d)/g, (_, digit: string) => {
    const group = match[Number(digit)];
    return group === undefined ? "" : encodeURIComponent(group);
  });
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }
  return url;
}
