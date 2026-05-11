import { useTranslation } from "react-i18next";

export function ReportBody() {
  const { t } = useTranslation();
  return (
    <ol className="dw-checklist">
      <li>{t("dashboard.reportStep1")}</li>
      <li>{t("dashboard.reportStep2")}</li>
      <li>{t("dashboard.reportStep3")}</li>
      <li>{t("dashboard.reportStep4")}</li>
    </ol>
  );
}
