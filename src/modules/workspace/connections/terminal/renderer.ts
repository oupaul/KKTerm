import { FitAddon } from "@xterm/addon-fit";
import {
  SearchAddon,
  type ISearchOptions,
  type ISearchResultChangeEvent,
} from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import {
  Terminal as XtermTerminal,
  type IDisposable,
  type ITerminalOptions,
} from "@xterm/xterm";
import { writeToClipboard } from "../../../../lib/clipboard";
import { logUiDebug, openExternalUrl } from "../../../../lib/tauri";
import type { TerminalSettings } from "../../../../types";
import { refreshTerminalFontAtlases, type TerminalFontAtlasRefreshTarget } from "./fontAtlasRefresh";

export type TerminalRendererBackend = "xterm";

export type TerminalRendererCapability =
  | "alternateScreen"
  | "bracketedPaste"
  | "copySelection"
  | "hyperlinks"
  | "mouseTracking"
  | "osc52Clipboard"
  | "resize"
  | "search"
  | "scrollback";

export interface TerminalDimensions {
  cols: number;
  pixelHeight: number;
  pixelWidth: number;
  rows: number;
}

export interface TerminalRenderer {
  readonly backend: TerminalRendererBackend;
  readonly capabilities: readonly TerminalRendererCapability[];
  readonly dimensions: TerminalDimensions;
  blur: () => void;
  clearSearch: () => void;
  dispose: () => void;
  fit: () => TerminalDimensions;
  findNext: (term: string) => boolean;
  findPrevious: (term: string) => boolean;
  focus: () => void;
  attachCustomKeyEventHandler: (handler: (event: KeyboardEvent) => boolean) => void;
  getSelection: () => string;
  onCwdChange: (handler: (cwd: string) => void) => IDisposable;
  onData: (handler: (data: string) => void) => IDisposable;
  onSearchResultsChange: (handler: (result: ISearchResultChangeEvent) => void) => IDisposable;
  onSelectionChange: (handler: () => void) => IDisposable;
  open: (element: HTMLElement) => void;
  setWheelScrollbackOverride: (enabled: boolean, handler?: (lines: number) => void) => void;
  setBackgroundOpacity: (opacity: number) => void;
  paste: (data: string) => void;
  write: (data: string) => void;
  writeln: (data: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  getFontSize: () => number;
  getBufferText: () => string;
  onFocus: (handler: () => void) => IDisposable;
}

const XTERM_CAPABILITIES = [
  "alternateScreen",
  "bracketedPaste",
  "copySelection",
  "hyperlinks",
  "mouseTracking",
  "osc52Clipboard",
  "resize",
  "search",
  "scrollback",
] satisfies TerminalRendererCapability[];

const MAX_OSC52_CLIPBOARD_BYTES = 1_000_000;
const MAX_OSC52_BASE64_LENGTH = Math.ceil(MAX_OSC52_CLIPBOARD_BYTES / 3) * 4;
const liveTerminalRenderers = new Set<XtermTerminalRenderer>();
const pendingFontAtlasRefreshReasons = new Set<string>();
let fontAtlasRefreshScheduled = false;
let nextTerminalRendererId = 1;

const SEARCH_OPTIONS: ISearchOptions = {
  decorations: {
    matchBackground: "#24384f",
    matchBorder: "#5aa0ff",
    matchOverviewRuler: "#5aa0ff",
    activeMatchBackground: "#f7c948",
    activeMatchBorder: "#f7c948",
    activeMatchColorOverviewRuler: "#f7c948",
  },
};

export function createTerminalRenderer(settings: TerminalSettings, backgroundOpacity = 95): TerminalRenderer {
  return new XtermTerminalRenderer(settings, backgroundOpacity);
}

export function scheduleTerminalFontAtlasRefresh(reason = "unspecified") {
  pendingFontAtlasRefreshReasons.add(reason);
  if (fontAtlasRefreshScheduled) {
    return;
  }

  fontAtlasRefreshScheduled = true;
  queueMicrotask(() => {
    fontAtlasRefreshScheduled = false;
    const reasons = [...pendingFontAtlasRefreshReasons];
    pendingFontAtlasRefreshReasons.clear();
    const renderers = [...liveTerminalRenderers];
    logUiDebug("terminal.font_atlas_refresh", {
      reasons,
      rendererCount: renderers.length,
      renderers: renderers.map((renderer) => renderer.fontAtlasDiagnostic()),
    });
    refreshTerminalFontAtlases(renderers);
  });
}

export function logTerminalFontAtlasState(reason: string) {
  const renderers = [...liveTerminalRenderers];
  logUiDebug("terminal.font_atlas_state", {
    reason,
    rendererCount: renderers.length,
    renderers: renderers.map((renderer) => renderer.fontAtlasDiagnostic()),
  });
}

class XtermTerminalRenderer implements TerminalRenderer, TerminalFontAtlasRefreshTarget {
  readonly backend = "xterm";
  readonly capabilities = XTERM_CAPABILITIES;
  private readonly rendererId = nextTerminalRendererId++;
  private readonly fitAddon = new FitAddon();
  private hostElement: HTMLElement | null = null;
  private readonly searchAddon = new SearchAddon({ highlightLimit: 500 });
  private readonly osc52Disposable: IDisposable | null = null;
  private readonly cwdListeners = new Set<(cwd: string) => void>();
  private readonly osc7Disposable: IDisposable | null = null;
  private readonly terminal: XtermTerminal;
  private backgroundOpacity: number;
  private webglAddon: WebglAddon | null = null;
  private webglContextLossDisposable: IDisposable | null = null;
  private wheelScrollbackHandler: ((lines: number) => void) | null = null;
  private wheelScrollbackOverride = false;

  constructor(settings: TerminalSettings, backgroundOpacity: number) {
    this.backgroundOpacity = backgroundOpacity;
    this.terminal = new XtermTerminal(terminalOptionsFor(settings, backgroundOpacity));
    this.terminal.attachCustomWheelEventHandler((event) => this.handleWheelEvent(event));
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.searchAddon);
    this.terminal.loadAddon(new WebLinksAddon(handleTerminalLink));
    this.osc7Disposable = this.terminal.parser.registerOscHandler(7, (data) =>
      this.handleOsc7CwdSequence(data),
    );
    if (settings.allowOsc52Clipboard) {
      this.osc52Disposable = this.terminal.parser.registerOscHandler(52, (data) =>
        handleOsc52ClipboardSequence(data),
      );
    }
  }

  get dimensions() {
    const pixels =
      screenPixelDimensionsFor(this.terminal.element ?? null) ??
      contentPixelDimensionsFor(this.terminal.element ?? this.hostElement);
    return {
      cols: this.terminal.cols,
      pixelHeight: pixels.pixelHeight,
      pixelWidth: pixels.pixelWidth,
      rows: this.terminal.rows,
    };
  }

  dispose() {
    liveTerminalRenderers.delete(this);
    this.hostElement = null;
    this.osc52Disposable?.dispose();
    this.osc7Disposable?.dispose();
    this.disposeWebglAddon();
    this.terminal.dispose();
  }

  clearSearch() {
    this.searchAddon.clearDecorations();
    this.terminal.clearSelection();
  }

  fit() {
    this.fitAddon.fit();
    this.trimRowsToVisibleScreen();
    return this.dimensions;
  }

  findNext(term: string) {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) {
      this.clearSearch();
      return false;
    }

    return this.searchAddon.findNext(normalizedTerm, {
      ...SEARCH_OPTIONS,
      incremental: true,
    });
  }

  findPrevious(term: string) {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) {
      this.clearSearch();
      return false;
    }

    return this.searchAddon.findPrevious(normalizedTerm, SEARCH_OPTIONS);
  }

  focus() {
    this.terminal.focus();
  }

  blur() {
    this.terminal.blur();
  }

  attachCustomKeyEventHandler(handler: (event: KeyboardEvent) => boolean) {
    this.terminal.attachCustomKeyEventHandler(handler);
  }

  getSelection() {
    return this.terminal.getSelection();
  }

  onData(handler: (data: string) => void) {
    return this.terminal.onData(handler);
  }

  onCwdChange(handler: (cwd: string) => void) {
    this.cwdListeners.add(handler);
    return {
      dispose: () => {
        this.cwdListeners.delete(handler);
      },
    };
  }

  onSearchResultsChange(handler: (result: ISearchResultChangeEvent) => void) {
    return this.searchAddon.onDidChangeResults(handler);
  }

  onSelectionChange(handler: () => void) {
    return this.terminal.onSelectionChange(handler);
  }

  setWheelScrollbackOverride(enabled: boolean, handler?: (lines: number) => void) {
    this.wheelScrollbackOverride = enabled;
    this.wheelScrollbackHandler = enabled ? handler ?? null : null;
  }

  setBackgroundOpacity(opacity: number) {
    this.backgroundOpacity = opacity;
    this.terminal.options.theme = {
      ...this.terminal.options.theme,
      background: terminalBackgroundColor(opacity),
    };
    this.applyHostBackground(opacity);
  }

  open(element: HTMLElement) {
    this.hostElement = element;
    this.applyHostBackground(this.backgroundOpacity);
    this.terminal.open(element);
    this.tryEnableWebglRenderer();
    liveTerminalRenderers.add(this);
    this.refreshAtlasWhenFontsReady();
  }

  private refreshAtlasWhenFontsReady() {
    // Custom fonts (e.g. Nerd Fonts dropped into the app fonts folder) register
    // asynchronously through the FontFace API. If a terminal opens before its
    // configured font finishes loading, the glyph atlas caches fallback boxes.
    // Rebuild the atlas once fonts settle so powerline/Nerd glyphs render
    // without a reload.
    if (typeof document === "undefined" || !document.fonts?.ready) {
      return;
    }
    void document.fonts.ready.then(() => {
      if (liveTerminalRenderers.has(this)) {
        scheduleTerminalFontAtlasRefresh("document-fonts-ready");
      }
    });
  }

  private applyHostBackground(opacity: number) {
    if (!this.hostElement) {
      return;
    }
    this.hostElement.style.setProperty("--terminal-surface-background", terminalBackgroundColor(opacity));
  }

  private tryEnableWebglRenderer() {
    if (this.webglAddon) {
      return;
    }

    let addon: WebglAddon;
    try {
      addon = new WebglAddon();
    } catch {
      // WebGL2 unavailable (driver, headless RDP, blocklist) — stay on DOM.
      return;
    }

    try {
      this.terminal.loadAddon(addon);
    } catch {
      addon.dispose();
      return;
    }

    this.webglContextLossDisposable = addon.onContextLoss(() => {
      // GPU context evicted (sleep/wake, GPU reset). Drop the addon and let
      // xterm fall back to its DOM renderer for subsequent frames.
      this.disposeWebglAddon();
    });
    this.webglAddon = addon;
  }

  private disposeWebglAddon() {
    this.webglContextLossDisposable?.dispose();
    this.webglContextLossDisposable = null;
    this.webglAddon?.dispose();
    this.webglAddon = null;
  }

  private trimRowsToVisibleScreen() {
    const element = this.terminal.element;
    const screen = element?.querySelector<HTMLElement>(".xterm-screen");
    if (!element || !screen || !element.isConnected) {
      return;
    }

    const style = window.getComputedStyle(element);
    const paddingBottom = numericStyleValue(style.paddingBottom);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const elementRect = element.getBoundingClientRect();
      const screenRect = screen.getBoundingClientRect();
      const maxScreenBottom = elementRect.bottom - paddingBottom + 0.5;
      if (screenRect.bottom <= maxScreenBottom || this.terminal.rows <= 1) {
        return;
      }
      this.terminal.resize(this.terminal.cols, this.terminal.rows - 1);
    }
  }

  write(data: string) {
    this.terminal.write(data);
  }

  paste(data: string) {
    this.terminal.paste(data);
  }

  writeln(data: string) {
    this.terminal.writeln(data);
  }

  setFontSize(size: number) {
    const clamped = Math.min(Math.max(Math.round(size), 6), 64);
    this.terminal.options.fontSize = clamped;
    try {
      this.fitAddon.fit();
      this.trimRowsToVisibleScreen();
    } catch {
      // Fit may throw if the host is detached; safe to ignore.
    }
  }

  setFontFamily(family: string) {
    if (this.terminal.options.fontFamily === family) {
      return;
    }
    this.terminal.options.fontFamily = family;
    scheduleTerminalFontAtlasRefresh("font-family-change");
  }

  clearFontAtlas() {
    try {
      this.terminal.clearTextureAtlas();
    } catch {
      // The renderer may have fallen back from WebGL or been disposed.
    }
  }

  redraw() {
    try {
      if (this.terminal.rows > 0) {
        this.terminal.refresh(0, this.terminal.rows - 1);
      }
    } catch {
      // A hidden or detached host will redraw when it becomes active.
    }
  }

  fontAtlasDiagnostic() {
    return {
      rendererId: this.rendererId,
      fontFamily: this.terminal.options.fontFamily,
      fontSize: this.terminal.options.fontSize,
      cols: this.terminal.cols,
      rows: this.terminal.rows,
      clientWidth: this.hostElement?.clientWidth ?? 0,
      clientHeight: this.hostElement?.clientHeight ?? 0,
      connected: this.hostElement?.isConnected ?? false,
      visible: Boolean(this.hostElement?.clientWidth && this.hostElement?.clientHeight),
      webgl: this.webglAddon !== null,
    };
  }

  getFontSize() {
    return this.terminal.options.fontSize ?? 14;
  }

  getBufferText() {
    const lines: string[] = [];
    const buffers = [this.terminal.buffer.normal, this.terminal.buffer.alternate];
    const seen = new Set<typeof buffers[number]>();
    for (const buffer of buffers) {
      if (!buffer || seen.has(buffer)) {
        continue;
      }
      seen.add(buffer);
      const total = buffer.length;
      for (let row = 0; row < total; row += 1) {
        const line = buffer.getLine(row);
        if (!line) {
          continue;
        }
        lines.push(line.translateToString(true));
      }
    }
    while (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    return lines.join("\n");
  }

  onFocus(handler: () => void) {
    return this.terminal.textarea
      ? listenToFocus(this.terminal.textarea, handler)
      : { dispose: () => undefined };
  }

  private handleWheelEvent(event: WheelEvent) {
    if (!this.wheelScrollbackOverride) {
      return true;
    }

    const lines = wheelScrollLinesForEvent(event, this.terminal.rows, terminalCellHeight(this.terminal.element ?? null));
    if (lines !== 0) {
      if (this.wheelScrollbackHandler) {
        this.wheelScrollbackHandler(lines);
      } else {
        this.terminal.scrollLines(lines);
      }
    }
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  private handleOsc7CwdSequence(data: string) {
    const cwd = decodeOsc7Cwd(data);
    if (cwd) {
      for (const listener of this.cwdListeners) {
        listener(cwd);
      }
    }
    return true;
  }
}

function listenToFocus(textarea: HTMLTextAreaElement, handler: () => void): IDisposable {
  textarea.addEventListener("focus", handler);
  return {
    dispose: () => textarea.removeEventListener("focus", handler),
  };
}

function contentPixelDimensionsFor(element: HTMLElement | null) {
  const style = element ? window.getComputedStyle(element) : null;
  const horizontalPadding =
    numericStyleValue(style?.paddingLeft) + numericStyleValue(style?.paddingRight);
  const verticalPadding =
    numericStyleValue(style?.paddingTop) + numericStyleValue(style?.paddingBottom);

  return {
    pixelHeight: Math.max(0, Math.round((element?.clientHeight ?? 0) - verticalPadding)),
    pixelWidth: Math.max(0, Math.round((element?.clientWidth ?? 0) - horizontalPadding)),
  };
}

function screenPixelDimensionsFor(element: HTMLElement | null) {
  const screen = element?.querySelector<HTMLElement>(".xterm-screen");
  if (!screen) {
    return null;
  }
  const rect = screen.getBoundingClientRect();
  const pixelHeight = Math.round(rect.height);
  const pixelWidth = Math.round(rect.width);
  if (pixelHeight <= 0 || pixelWidth <= 0) {
    return null;
  }
  return { pixelHeight, pixelWidth };
}

function numericStyleValue(value: string | undefined) {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function terminalCellHeight(element: HTMLElement | null) {
  const row = element?.querySelector<HTMLElement>(".xterm-rows > div");
  const height = row?.getBoundingClientRect().height;
  return height && Number.isFinite(height) && height > 0 ? height : 16;
}

export function wheelScrollLinesForEvent(event: WheelEvent, rows: number, cellHeight: number) {
  if (event.deltaY === 0) {
    return 0;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return Math.trunc(Math.sign(event.deltaY) * Math.max(1, rows - 1));
  }

  const rawLines =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? event.deltaY
      : event.deltaY / Math.max(1, cellHeight);
  const magnitude = Math.min(Math.max(1, Math.ceil(Math.abs(rawLines))), Math.max(1, rows - 1));
  return Math.sign(event.deltaY) * magnitude;
}


function terminalBackgroundColor(opacity: number) {
  const alpha = Math.min(Math.max(Math.round(opacity), 0), 100) / 100;
  return `rgba(12, 18, 25, ${alpha})`;
}

function terminalOptionsFor(settings: TerminalSettings, backgroundOpacity: number): ITerminalOptions {
  return {
    altClickMovesCursor: false,
    // @xterm/addon-search renders match decorations through xterm's proposed
    // decoration API. Without this, the first decorated scrollback search can
    // throw from the renderer path and leave the Tauri WebView unusable.
    allowProposedApi: true,
    allowTransparency: true,
    convertEol: false,
    customGlyphs: true,
    cursorBlink: true,
    cursorInactiveStyle: "outline",
    cursorStyle: settings.cursorStyle,
    drawBoldTextInBrightColors: true,
    fastScrollSensitivity: 5,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    ignoreBracketedPasteMode: false,
    lineHeight: settings.lineHeight,
    macOptionClickForcesSelection: true,
    macOptionIsMeta: true,
    minimumContrastRatio: 1,
    rightClickSelectsWord: false,
    scrollOnEraseInDisplay: true,
    scrollOnUserInput: true,
    scrollback: clampScrollback(settings.scrollbackLines),
    smoothScrollDuration: 0,
    theme: {
      background: terminalBackgroundColor(backgroundOpacity),
      foreground: "#d9e2ef",
      cursor: "#d9e2ef",
      selectionBackground: "#305f95",
      selectionInactiveBackground: "#1e3a5f",
      scrollbarSliderBackground: "rgba(149, 167, 187, 0.48)",
      scrollbarSliderHoverBackground: "rgba(185, 202, 224, 0.72)",
      scrollbarSliderActiveBackground: "rgba(217, 226, 239, 0.86)",
    },
  };
}

async function handleOsc52ClipboardSequence(data: string) {
  const text = decodeOsc52ClipboardText(data);
  if (text === null) {
    return true;
  }

  try {
    await writeToClipboard(text);
  } catch (error) {
    console.warn("OSC 52 clipboard write failed.", error);
  }
  return true;
}

export function decodeOsc7Cwd(data: string) {
  const trimmed = data.trim();
  if (!trimmed.startsWith("file://")) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    const pathname = decodeURIComponent(url.pathname);
    if (!pathname) {
      return null;
    }
    if (/^\/[A-Za-z]:\//.test(pathname)) {
      return pathname.slice(1);
    }
    return pathname;
  } catch {
    return null;
  }
}

function handleTerminalLink(event: MouseEvent, uri: string) {
  if (!event.ctrlKey) {
    return;
  }
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  void openExternalUrl(url.href).catch((error) => {
    console.warn("Terminal external link open failed.", error);
  });
}

export function decodeOsc52ClipboardText(data: string) {
  const separatorIndex = data.indexOf(";");
  if (separatorIndex < 0) {
    return null;
  }

  const target = data.slice(0, separatorIndex);
  const encoded = data.slice(separatorIndex + 1);
  if (!target || target.includes("?") || encoded === "?") {
    return null;
  }
  if (encoded.length > MAX_OSC52_BASE64_LENGTH) {
    return null;
  }

  try {
    const binary = atob(encoded);
    if (binary.length > MAX_OSC52_CLIPBOARD_BYTES) {
      return null;
    }
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function clampScrollback(lines: number) {
  if (!Number.isFinite(lines)) {
    return 5000;
  }

  return Math.min(Math.max(Math.round(lines), 100), 100_000);
}
