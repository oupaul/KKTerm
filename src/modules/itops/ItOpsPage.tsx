// IT Ops Module page. Fills the workspace content area (like the Installer and
// Dashboard modules) and is shown/hidden by the App via the `active` flag while
// the shell stays mounted. See docs/ITOPS.md.

import { useTranslation } from "react-i18next";
import { ItOpsModule } from "./ItOpsModule";
import "./itops.css";

export function ItOpsPage({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <section
      className="itops-page"
      aria-label={t("itops.title")}
      data-active={active ? "true" : "false"}
    >
      <ItOpsModule />
    </section>
  );
}
