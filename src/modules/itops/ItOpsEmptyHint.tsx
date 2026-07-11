import type { ReactNode } from "react";

export function ItOpsEmptyHint({ children }: { children: ReactNode }) {
  return <p className="it-empty-hint">{children}</p>;
}
