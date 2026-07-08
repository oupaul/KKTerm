import DOMPurify from "dompurify";
import { Copy, Terminal } from "../lib/reicon";
import { marked, type Tokens } from "marked";
import { useMemo, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

type AssistantMarkdownContentProps = {
  canSendCode: boolean;
  content: string;
  onCopyCode: (code: string) => void;
  onOpenLink: (url: string) => void;
  onSendCode: (code: string) => void;
};

export function MarkdownContent({
  canSendCode,
  content,
  onCopyCode,
  onOpenLink,
  onSendCode,
}: AssistantMarkdownContentProps) {
  const { t } = useTranslation();
  const tokens = useMemo(() => {
    const lexed = marked.lexer(content);
    return lexed.filter((tok) => tok.type !== "space");
  }, [content]);

  function handleMarkdownClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element | null)?.closest("a");
    if (!link) {
      return;
    }
    const href = link.getAttribute("href");
    const externalUrl = externalAssistantLinkUrl(href);
    event.preventDefault();
    event.stopPropagation();
    if (externalUrl) {
      onOpenLink(externalUrl);
    }
  }

  return (
    <div className="markdown-content" onClick={handleMarkdownClick}>
      {tokens.map((token, index) => {
        if (token.type === "code") {
          const codeToken = token as Tokens.Code;
          const lang = codeToken.lang || "";
          const code = codeToken.text;
          return (
            <div className="markdown-code-block" key={`code-${index}`}>
              <div className="markdown-code-toolbar">
                <span>{lang || t("ai.code")}</span>
                <div className="markdown-code-actions">
                  <button
                    className="assistant-code-send"
                    onClick={() => onCopyCode(code)}
                    type="button"
                  >
                    <Copy size={13} />
                    {t("ai.copy")}
                  </button>
                  <button
                    className="assistant-code-send"
                    disabled={!canSendCode}
                    onClick={() => onSendCode(code)}
                    title={canSendCode ? t("ai.sendToTerminal") : t("ai.extensionReviewTooltip")}
                    type="button"
                  >
                    <Terminal size={13} />
                    {t("ai.send")}
                  </button>
                </div>
              </div>
              <pre>
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        const html = DOMPurify.sanitize(marked.parse(token.raw, { async: false }) as string);
        return <div key={`md-${index}`} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

function externalAssistantLinkUrl(href: string | null) {
  if (!href) {
    return undefined;
  }
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
