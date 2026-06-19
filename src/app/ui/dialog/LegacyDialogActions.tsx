import type { ReactNode } from "react";
import { Actions } from "./Sheet";

export function LegacyDialogActions({
  as: Container = "div",
  cancel,
  className = "",
  extraLeft,
  primary,
}: {
  as?: "div" | "footer";
  cancel?: ReactNode;
  className?: string;
  extraLeft?: ReactNode;
  primary?: ReactNode;
}) {
  return (
    <Container className={`dialog-actions ${className}`.trim()}>
      <Actions cancel={cancel} extraLeft={extraLeft} primary={primary} />
    </Container>
  );
}
