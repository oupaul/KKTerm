import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { transformQuickTool } from "../widgets";
import type { QuickToolId } from "../widgets";

export function QuickToolsBody() {
  const { t } = useTranslation();
  const [tool, setTool] = useState<QuickToolId>("urlEncode");
  const [input, setInput] = useState("");
  const output = useMemo(() => transformQuickTool(tool, input), [tool, input]);
  return (
    <div className="dw-stack-fields">
      <label className="dw-field">
        <span>{t("dashboard.tool")}</span>
        <select value={tool} onChange={(e) => setTool(e.target.value as QuickToolId)}>
          <option value="urlEncode">URL encode</option>
          <option value="urlDecode">URL decode</option>
          <option value="base64Encode">Base64 encode</option>
          <option value="base64Decode">Base64 decode</option>
          <option value="unixToIso">Unix → ISO</option>
        </select>
      </label>
      <label className="dw-field">
        <span>{t("dashboard.input")}</span>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} spellCheck={false} />
      </label>
      <label className="dw-field">
        <span>{t("dashboard.output")}</span>
        <textarea value={output.output} readOnly rows={2} />
      </label>
    </div>
  );
}
