import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine } from "lucide-react";
import Convert from "ansi-to-html";
import DOMPurify from "dompurify";
import { invokeCommand } from "../../../../../lib/tauri";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { FootSeg, IconButton, SearchField } from "../chrome/controls";
import {
  LOG_PARSER_TYPES,
  parseLogLines,
  type LogLevel,
  type LogParserId,
} from "../logParser";

/** Maximum lines rendered at once to keep very large logs responsive. */
const MAX_RENDERED_LINES = 5000;
/** Tail poll interval while "follow" is enabled and the tab is active. */
const FOLLOW_INTERVAL_MS = 2000;

const FILTERABLE_LEVELS: LogLevel[] = ["error", "warn", "info", "debug", "trace"];
const ESCAPE = "\u001b[";

/**
 * Dedicated log mode: parses lines, tags severity for coloring, supports a text
 * filter, per-level toggles, ANSI-color rendering, and an optional follow/tail
 * mode that polls the file end (only while enabled and the tab is active — an
 * explicit, user-chosen monitor, not background polling). The filter + follow
 * controls live in the shell toolbar; severity pills sit in a dedicated log bar.
 */
export function LogViewer({
  text,
  filePath,
  isActive,
  maxBytes,
  encoding,
}: {
  text: string;
  filePath: string;
  isActive: boolean;
  maxBytes: number;
  /** `encoding_rs` label for follow/tail reads; omit (or `undefined`) to auto-detect. */
  encoding?: string;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [follow, setFollow] = useState(false);
  const [liveText, setLiveText] = useState<string | null>(null);
  const [hiddenLevels, setHiddenLevels] = useState<Set<LogLevel>>(new Set());
  const [parser, setParser] = useState<LogParserId>("auto");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const ansiConvert = useMemo(() => new Convert({ newline: false, escapeXML: true }), []);

  // Follow/tail: poll the trailing bytes of the file while enabled and active.
  useEffect(() => {
    if (!follow || !isActive) {
      return;
    }
    let disposed = false;
    const poll = async () => {
      try {
        const result = await invokeCommand("read_file_view_text", {
          request: { path: filePath, maxBytes, fromEnd: true, encoding },
        });
        if (!disposed) {
          setLiveText(result.text);
        }
      } catch {
        // Transient read failures (file rotated/locked) are ignored; the next
        // tick retries.
      }
    };
    void poll();
    const handle = window.setInterval(() => void poll(), FOLLOW_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(handle);
    };
  }, [follow, isActive, filePath, maxBytes, encoding]);

  const source = follow && liveText !== null ? liveText : text;

  const lines = useMemo(() => {
    const hasAnsi = source.includes(ESCAPE);
    return parseLogLines(source, parser).map((line) => ({
      ...line,
      html: hasAnsi ? DOMPurify.sanitize(ansiConvert.toHtml(line.message)) : null,
    }));
  }, [source, parser, ansiConvert]);

  const levelCounts = useMemo(() => {
    const counts: Partial<Record<LogLevel, number>> = {};
    for (const line of lines) {
      counts[line.level] = (counts[line.level] ?? 0) + 1;
    }
    return counts;
  }, [lines]);

  const matched = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return lines.filter((line) => {
      if (hiddenLevels.has(line.level)) {
        return false;
      }
      return needle ? line.raw.toLowerCase().includes(needle) : true;
    });
  }, [lines, filter, hiddenLevels]);

  const visibleLines = useMemo(() => matched.slice(0, MAX_RENDERED_LINES), [matched]);

  // Keep the newest lines in view while following.
  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines, follow]);

  function toggleLevel(level: LogLevel) {
    setHiddenLevels((current) => {
      const next = new Set(current);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }

  return (
    <div className="fv-pane">
      <ChromePortals
        center={
          <SearchField
            value={filter}
            onChange={setFilter}
            placeholder={t("workspace.fileViewer.filterLines")}
            style={{ minWidth: 190 }}
          />
        }
        right={
          <IconButton
            icon={ArrowDownToLine}
            title={
              follow ? t("workspace.fileViewer.followOn") : t("workspace.fileViewer.follow")
            }
            on={follow}
            onClick={() => setFollow((value) => !value)}
          />
        }
        footer={
          <>
            <FootSeg>
              {t("workspace.fileViewer.lineCountOf", { count: matched.length, total: lines.length })}
            </FootSeg>
            {follow ? (
              <FootSeg>
                <span style={{ color: "var(--accent)" }}>{t("workspace.fileViewer.following")}</span>
              </FootSeg>
            ) : null}
          </>
        }
      />
      <div className="fv-logbar">
        <label className="fv-log-parser">
          <span>{t("workspace.fileViewer.parser")}</span>
          <select value={parser} onChange={(event) => setParser(event.currentTarget.value as LogParserId)}>
            {LOG_PARSER_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {t(`workspace.fileViewer.parserType.${option.id}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="fv-levels">
          {FILTERABLE_LEVELS.map((level) => {
            const on = !hiddenLevels.has(level);
            return (
              <button
                key={level}
                type="button"
                className={`fv-lvl ${level} ${on ? "on" : "off"}`}
                onClick={() => toggleLevel(level)}
              >
                <span className="dot" />
                {t(`workspace.fileViewer.level.${level}`)}
                <span className="n">{levelCounts[level] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="fv-logwrap" ref={scrollRef}>
        {visibleLines.map((line) => (
          <div className={`fv-logrow ${line.level}`} key={line.index}>
            <span className="ln">{line.index + 1}</span>
            <span className={`lv ${line.level}`}>
              {line.level === "none" ? "" : line.level}
            </span>
            {line.html !== null ? (
              <span className="msg" dangerouslySetInnerHTML={{ __html: line.html }} />
            ) : (
              <span className="msg">{line.message}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
