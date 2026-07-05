import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Code2, Columns2, Eye } from "../../../../../lib/reicon";
import { ChromePortals } from "../chrome/FileViewerChromeContext";
import { FootSeg, Segmented } from "../chrome/controls";

type MarkdownView = "preview" | "split" | "source";

/**
 * Renders Markdown to sanitized HTML (the same marked + DOMPurify pairing used by
 * the assistant and manual renderers; raw HTML is sanitized before the DOM). A
 * Preview / Split / Source segmented control in the shell toolbar switches
 * between the rendered view and the raw source.
 */
export function MarkdownViewer({ text }: { text: string }) {
  const { t } = useTranslation();
  const [view, setView] = useState<MarkdownView>("preview");

  const html = useMemo(() => {
    const parsed = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(parsed);
  }, [text]);
  const wordCount = useMemo(() => text.trim().match(/\S+/g)?.length ?? 0, [text]);

  const preview = <div className="fv-md" dangerouslySetInnerHTML={{ __html: html }} />;
  const source = <div className="fv-md-source">{text}</div>;

  return (
    <>
      <ChromePortals
        center={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "preview", label: t("workspace.fileViewer.view.preview"), icon: Eye },
              { value: "split", label: t("workspace.fileViewer.view.split"), icon: Columns2 },
              { value: "source", label: t("workspace.fileViewer.view.source"), icon: Code2 },
            ]}
          />
        }
        footer={<FootSeg>{t("workspace.fileViewer.wordCount", { count: wordCount })}</FootSeg>}
      />
      {view === "preview" ? <div className="fv-scroll">{preview}</div> : null}
      {view === "source" ? <div className="fv-scroll">{source}</div> : null}
      {view === "split" ? (
        <div className="fv-split">
          <div className="fv-scroll">{source}</div>
          <div className="fv-scroll">{preview}</div>
        </div>
      ) : null}
    </>
  );
}
