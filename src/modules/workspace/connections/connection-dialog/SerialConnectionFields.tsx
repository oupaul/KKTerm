import { useTranslation } from "react-i18next";
import type { Connection } from "../../../../types";

export function SerialConnectionFields({ initialConnection }: { initialConnection?: Connection }) {
  const { t } = useTranslation();

  return (
    <>
      <label>
        <span>{t("connections.nameOptional")}</span>
        <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder={t("connections.connectionName")} />
      </label>
      <div className="connection-endpoint-fields">
        <label className="endpoint-host-input">
          <span>{t("connections.line")}*</span>
          <input
            name="serialLine"
            defaultValue={initialConnection?.serialLine ?? initialConnection?.host ?? "COM1"}
            placeholder={t("connections.serialLinePlaceholder")}
            required
          />
        </label>
        <label className="endpoint-port-input">
          <span>{t("connections.speed")}*</span>
          <input
            name="serialSpeed"
            defaultValue={initialConnection?.serialSpeed ?? 9600}
            inputMode="numeric"
            min="1"
            type="number"
            placeholder="9600"
            required
          />
        </label>
      </div>
    </>
  );
}
