import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy } from "lucide-react";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { FootSeg, IconButton } from "../chrome/controls";

type Json = unknown;

/** One node of the collapsible JSON tree (ported from the redesign's JsonNode). */
function JsonNode({
  k,
  value,
  path,
  expanded,
  toggle,
  last,
  depth,
}: {
  k: string | null;
  value: Json;
  path: string;
  expanded: Set<string>;
  toggle: (path: string) => void;
  last: boolean;
  depth: number;
}) {
  const pad = { paddingLeft: 14 + depth * 18 };
  const isObject = value !== null && typeof value === "object";

  if (!isObject) {
    let className = "fv-jnull";
    let display = "null";
    if (typeof value === "string") {
      className = "fv-jstr";
      display = JSON.stringify(value);
    } else if (typeof value === "number") {
      className = "fv-jnum";
      display = String(value);
    } else if (typeof value === "boolean") {
      className = "fv-jbool";
      display = String(value);
    }
    return (
      <div className="fv-jrow" style={pad}>
        <span className="fv-jtw leaf">
          <ChevronRight size={12} />
        </span>
        {k != null ? (
          <>
            <span className="fv-jkey">"{k}"</span>
            <span className="fv-jpunc">: </span>
          </>
        ) : null}
        <span className={className}>{display}</span>
        <span className="fv-jpunc">{last ? "" : ","}</span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string, Json][] = isArray
    ? (value as Json[]).map((entry, index) => [String(index), entry])
    : Object.entries(value as Record<string, Json>);
  const open = expanded.has(path);
  const openChar = isArray ? "[" : "{";
  const closeChar = isArray ? "]" : "}";

  return (
    <>
      <div className="fv-jrow" style={pad} onClick={() => toggle(path)}>
        <span className="fv-jtw">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        {k != null ? (
          <>
            <span className="fv-jkey">"{k}"</span>
            <span className="fv-jpunc">: </span>
          </>
        ) : null}
        <span className="fv-jpunc">{openChar}</span>
        {!open ? (
          <>
            <span className="fv-jpunc">
              {" … "}
              {closeChar}
              {last ? "" : ","}
            </span>
            <span className="fv-jcount">{entries.length}</span>
          </>
        ) : null}
      </div>
      {open
        ? entries.map(([childKey, childValue], index) => (
            <JsonNode
              key={childKey}
              k={isArray ? null : childKey}
              value={childValue}
              path={`${path}/${childKey}`}
              expanded={expanded}
              toggle={toggle}
              last={index === entries.length - 1}
              depth={depth + 1}
            />
          ))
        : null}
      {open ? (
        <div className="fv-jrow" style={pad}>
          <span className="fv-jtw leaf" />
          <span className="fv-jpunc">
            {closeChar}
            {last ? "" : ","}
          </span>
        </div>
      ) : null}
    </>
  );
}

/** Collect every container path so "expand all" can open the whole tree. */
function collectPaths(value: Json, path: string, out: string[]) {
  if (value !== null && typeof value === "object") {
    out.push(path);
    const entries = Array.isArray(value)
      ? (value as Json[]).map((entry, index) => [String(index), entry] as const)
      : Object.entries(value as Record<string, Json>);
    for (const [key, child] of entries) {
      collectPaths(child, `${path}/${key}`, out);
    }
  }
  return out;
}

/**
 * Pretty collapsible JSON tree. Invalid JSON falls back to the raw text with a
 * notice (so a malformed file is still viewable). Tree colors come from semantic
 * tokens (`.fv-j*`) so they adapt to every color scheme.
 */
export function JsonViewer({ text }: { text: string }) {
  const { t } = useTranslation();
  const { parsed, valid, formatted } = useMemo(() => {
    try {
      const value = JSON.parse(text) as Json;
      return { parsed: value, valid: true, formatted: JSON.stringify(value, null, 2) };
    } catch {
      return { parsed: null as Json, valid: false, formatted: text };
    }
  }, [text]);

  const allPaths = useMemo(() => (valid ? collectPaths(parsed, "$", []) : []), [parsed, valid]);
  // Default: expand the root and its immediate children.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(allPaths.filter((path) => (path.match(/\//g)?.length ?? 0) <= 1)),
  );
  const toggle = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

  const topLevelKeys =
    parsed !== null && typeof parsed === "object" ? Object.keys(parsed as object).length : 0;

  if (!valid) {
    return (
      <div className="fv-scroll">
        <ChromePortals
          footer={<FootSeg>{t("workspace.fileViewer.invalid")}</FootSeg>}
        />
        <div className="file-viewer-notice file-viewer-notice-warn">
          {t("workspace.fileViewer.invalidJson")}
        </div>
        <div className="fv-md-source">{formatted}</div>
      </div>
    );
  }

  return (
    <div className="fv-scroll">
      <ChromePortals
        center={
          <>
            <IconButton
              icon={ChevronsUpDown}
              title={t("workspace.fileViewer.expandAll")}
              size={16}
              onClick={() => setExpanded(new Set(allPaths))}
            />
            <IconButton
              icon={ChevronsDownUp}
              title={t("workspace.fileViewer.collapseAll")}
              size={16}
              onClick={() => setExpanded(new Set(["$"]))}
            />
          </>
        }
        right={
          <IconButton
            icon={Copy}
            title={t("common.copy")}
            onClick={() => void navigator.clipboard?.writeText(formatted)}
          />
        }
        footer={
          <>
            <FootSeg>{t("workspace.fileViewer.keyCount", { count: topLevelKeys })}</FootSeg>
            <FootSeg>{t("workspace.fileViewer.valid")}</FootSeg>
          </>
        }
      />
      <div className="fv-json">
        <JsonNode
          k={null}
          value={parsed}
          path="$"
          expanded={expanded}
          toggle={toggle}
          last
          depth={0}
        />
      </div>
    </div>
  );
}
