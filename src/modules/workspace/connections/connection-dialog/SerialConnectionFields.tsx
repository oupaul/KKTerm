import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import { isMacPlatform, isWindowsPlatform } from "../../../../lib/platform";
import { invokeCommand } from "../../../../lib/tauri";
import type { Connection } from "../../../../types";

function platformDefaultLine(): string {
  if (isWindowsPlatform()) return "COM1";
  if (isMacPlatform()) return "/dev/cu.";
  return "/dev/ttyUSB0";
}

export function SerialConnectionFields({ initialConnection }: { initialConnection?: Connection }) {
  const { t } = useTranslation();
  const datalistId = useId();
  const [ports, setPorts] = useState<string[]>([]);
  const initialLine = initialConnection?.serialLine ?? initialConnection?.host ?? platformDefaultLine();
  const [line, setLine] = useState(initialLine);

  useEffect(() => {
    let cancelled = false;
    invokeCommand("list_serial_ports")
      .then((detected) => {
        if (cancelled) return;
        setPorts(detected);
        // Pre-fill the first detected port only when the user hasn't already
        // provided a line (new connection still showing the platform default).
        if (detected[0] && initialLine === platformDefaultLine()) {
          setLine((current) => (current === platformDefaultLine() ? detected[0] : current));
        }
      })
      .catch(() => {
        if (!cancelled) setPorts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [initialLine]);

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
            {...technicalInputProps}
            list={ports.length > 0 ? datalistId : undefined}
            value={line}
            onChange={(event) => setLine(event.currentTarget.value)}
            placeholder={t("connections.serialLinePlaceholder")}
            required
          />
          {ports.length > 0 && (
            <datalist id={datalistId}>
              {ports.map((port) => (
                <option key={port} value={port} />
              ))}
            </datalist>
          )}
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
