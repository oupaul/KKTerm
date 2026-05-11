import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { calculateIpv4Subnet } from "../widgets";

export function SubnetBody() {
  const { t } = useTranslation();
  const [cidr, setCidr] = useState("192.168.10.44/27");
  const result = useMemo(() => calculateIpv4Subnet(cidr), [cidr]);
  return (
    <div className="dw-stack-fields">
      <label className="dw-field">
        <span>{t("dashboard.cidrInput")}</span>
        <input value={cidr} onChange={(e) => setCidr(e.target.value)} spellCheck={false} />
      </label>
      {result.ok ? (
        <div className="dw-kv">
          <span>{t("dashboard.network")}</span><code>{result.networkAddress}</code>
          <span>{t("dashboard.broadcast")}</span><code>{result.broadcastAddress}</code>
          <span>{t("dashboard.firstUsable")}</span><code>{result.firstUsableAddress}</code>
          <span>{t("dashboard.lastUsable")}</span><code>{result.lastUsableAddress}</code>
          <span>{t("dashboard.mask")}</span><code>{result.subnetMask}</code>
          <span>{t("dashboard.usable")}</span><code>{result.usableHosts}</code>
        </div>
      ) : (
        <p>{t("dashboard.subnetInvalid")}</p>
      )}
    </div>
  );
}
