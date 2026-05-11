import { useMemo } from "react";
import type { ContentBody } from "../types";

export function ContentWidgetRenderer({ bodyJson }: { bodyJson: string }) {
  const parsed = useMemo<ContentBody | null>(() => {
    try { return JSON.parse(bodyJson) as ContentBody; } catch { return null; }
  }, [bodyJson]);

  if (!parsed) return <div className="dw-content-error">Invalid content widget body.</div>;

  switch (parsed.shape) {
    case "markdown":
      return <div className="dw-content-md">{parsed.data.source}</div>;
    case "kvList":
      return (
        <div className="dw-kv">
          {parsed.data.rows.map((r, i) => (
            <span key={i} className="dw-kv-row">
              <span className="dw-kv-label">{r.label}</span>
              <span className="dw-kv-value">{r.value}</span>
            </span>
          ))}
        </div>
      );
    case "checklist":
      return (
        <ul className="dw-checklist">
          {parsed.data.items.map((item, i) => (
            <li key={i} className={item.done ? "dw-done" : ""}>{item.label}</li>
          ))}
        </ul>
      );
    case "stat":
      return (
        <div className="dw-stat">
          <span className="dw-stat-value">{parsed.data.value}</span>
          {parsed.data.unit  && <span className="dw-stat-unit">{parsed.data.unit}</span>}
          {parsed.data.delta && <span className="dw-stat-delta">{parsed.data.delta}</span>}
          {parsed.data.caption && <span className="dw-stat-caption">{parsed.data.caption}</span>}
        </div>
      );
  }
}
