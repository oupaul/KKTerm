import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { calculateTextHashes } from "../widgets";

export function HashBody() {
  const { t } = useTranslation();
  const [text, setText] = useState("KKTerm");
  const [hashes, setHashes] = useState({ characters: "0", bytes: "0", sha1: "", sha256: "" });
  useEffect(() => { calculateTextHashes(text).then(setHashes); }, [text]);
  return (
    <div className="dw-stack-fields">
      <label className="dw-field">
        <span>{t("dashboard.hashInput")}</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} spellCheck={false} />
      </label>
      <div className="dw-kv">
        <span>{t("dashboard.characters")}</span><span>{hashes.characters}</span>
        <span>{t("dashboard.bytes")}</span><span>{hashes.bytes}</span>
        <span>SHA-1</span><code>{hashes.sha1}</code>
        <span>SHA-256</span><code>{hashes.sha256}</code>
      </div>
    </div>
  );
}
