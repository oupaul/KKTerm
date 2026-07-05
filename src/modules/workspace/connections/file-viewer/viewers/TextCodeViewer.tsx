import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, WrapText } from "../../../../../lib/reicon";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, highlightActiveLine, keymap } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  search,
  searchKeymap,
  highlightSelectionMatches,
  openSearchPanel,
} from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { fileExtension } from "../fileViewerModel";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { Chip, FootSeg, IconButton } from "../chrome/controls";

/** Relative-luminance dark test for the resolved `--surface` token so the editor
 * theme matches the active color scheme (dark schemes get oneDark; light schemes
 * keep CodeMirror's light surface). */
function isDarkSurface(host: HTMLElement): boolean {
  const value = getComputedStyle(host).getPropertyValue("--surface").trim();
  const hex = value.startsWith("#") ? value.slice(1) : "";
  let r = 255;
  let g = 255;
  let b = 255;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length >= 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    const match = value.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (match) {
      r = Number(match[1]);
      g = Number(match[2]);
      b = Number(match[3]);
    }
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

/**
 * Text/code viewer and light editor backed by CodeMirror 6 (already bundled):
 * line numbers, in-document search, undo/redo history, soft-wrap toggle, a
 * scheme-aware theme, and — when `editable` — typing with a Ctrl/Cmd+S save
 * shortcut. The editor is created once per mounted document (the parent keys it
 * by file/reload, not by keystroke) and is uncontrolled: edits flow out through
 * `onChange`, never back in, so the caret is never reset while typing. Markdown
 * source gets the markdown language extension; other files use plain highlighting
 * (no per-language packages are bundled, so this stays zero-bloat).
 */
export function TextCodeViewer({
  initialText,
  editable = false,
  language,
  filePath = "",
  softWrap,
  onChange,
  onSave,
  onSoftWrapChange,
}: {
  initialText: string;
  editable?: boolean;
  language?: "markdown";
  filePath?: string;
  softWrap: boolean;
  onChange?: (text: string) => void;
  onSave?: () => void;
  onSoftWrapChange?: (softWrap: boolean) => void;
}) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const wrapCompartment = useRef(new Compartment());
  const [wrap, setWrap] = useState(softWrap);

  // Keep the latest callbacks reachable from CodeMirror extensions without
  // recreating the editor (which would drop edit history and caret position).
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onSoftWrapChangeRef = useRef(onSoftWrapChange);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  onSoftWrapChangeRef.current = onSoftWrapChange;

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      history(),
      search({ top: true }),
      wrapCompartment.current.of(wrap ? EditorView.lineWrapping : []),
      keymap.of([
        {
          key: "Mod-s",
          preventDefault: true,
          run: () => {
            onSaveRef.current?.();
            return true;
          },
        },
        ...searchKeymap,
        ...historyKeymap,
        ...defaultKeymap,
        indentWithTab,
      ]),
      EditorState.readOnly.of(!editable),
      EditorView.editable.of(editable),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString());
        }
      }),
    ];
    if (isDarkSurface(hostRef.current)) {
      extensions.push(oneDark);
    }
    if (language === "markdown") {
      extensions.push(markdown());
    }
    const view = new EditorView({
      state: EditorState.create({ doc: initialText, extensions }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally created once per mount; the parent remounts (via key) on a
    // file change or reload. `initialText`/`editable`/`language` are read at
    // creation only; `wrap` is reconfigured live below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle soft wrap live without rebuilding the editor.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: wrapCompartment.current.reconfigure(wrap ? EditorView.lineWrapping : []),
    });
  }, [wrap]);

  const languageLabel =
    language === "markdown"
      ? "Markdown"
      : (fileExtension(filePath) || "").toUpperCase() || null;

  return (
    <>
      <ChromePortals
        center={
          <>
            {languageLabel ? <Chip>{languageLabel}</Chip> : null}
            <IconButton
              icon={WrapText}
              title={t("workspace.fileViewer.softWrap")}
              size={16}
              on={wrap}
              onClick={() =>
                setWrap((value) => {
                  const next = !value;
                  onSoftWrapChangeRef.current?.(next);
                  return next;
                })
              }
            />
          </>
        }
        right={
          <IconButton
            icon={Search}
            title={t("workspace.fileViewer.find")}
            onClick={() => {
              if (viewRef.current) {
                openSearchPanel(viewRef.current);
              }
            }}
          />
        }
        footer={languageLabel ? <FootSeg>{languageLabel}</FootSeg> : null}
      />
      <div className="file-viewer-codemirror" ref={hostRef} />
    </>
  );
}
