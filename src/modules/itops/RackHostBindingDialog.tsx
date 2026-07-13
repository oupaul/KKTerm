// Select the one IT Ops Host represented by a Rack Device. The physical Host
// owns any guest Hosts through parentHostId, so this remains a single binding.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Sheet } from "../../app/ui/dialog";
import { HostDialog } from "./HostDialog";
import { hostDisplayName } from "./hostTree";
import { ItIcon } from "./icons";
import { useItOpsStore } from "./state";

export function RackHostBindingDialog({
  siteId,
  hostId,
  onApply,
  onClose,
}: {
  siteId: string;
  hostId: string;
  onApply: (hostId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const hosts = useItOpsStore((state) => state.hostsBySite[siteId] ?? []);
  const [selectedHostId, setSelectedHostId] = useState(hostId);
  const [addingHost, setAddingHost] = useState(false);
  const missingSelectedHost =
    selectedHostId && !hosts.some((host) => host.id === selectedHostId)
      ? selectedHostId
      : null;

  return (
    <>
      <DialogShell onBackdrop={onClose} zClassName="itops-page">
        <Sheet
          width={560}
          className="rack-host-binding-dialog"
          title={t("itops.racks.hostBindingsTitle")}
          ariaLabel={t("itops.racks.hostBindingsTitle")}
          footer={
            <Actions
              extraLeft={
                <Btn kind="ghost" onClick={() => setAddingHost(true)}>
                  {t("itops.hosts.addAction")}
                </Btn>
              }
              cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
              primary={
                <Btn
                  kind="primary"
                  onClick={() => {
                    onApply(selectedHostId);
                    onClose();
                  }}
                >
                  {t("itops.actions.save")}
                </Btn>
              }
            />
          }
        >
          <p className="hg-dlg-help">{t("itops.racks.hostBindingsHint")}</p>
          <div className="hg-dlg-list rack-host-binding-list" role="radiogroup">
            <button
              type="button"
              className={`hg-dlg-row${selectedHostId === "" ? " checked" : ""}`}
              role="radio"
              aria-checked={selectedHostId === ""}
              onClick={() => setSelectedHostId("")}
            >
              <span className="rack-host-radio">
                {selectedHostId === "" ? <ItIcon name="check" size={12} /> : null}
              </span>
              <span className="hg-dlg-row-txt">
                <span className="nm">{t("itops.racks.hostNone")}</span>
              </span>
            </button>
            {missingSelectedHost ? (
              <button
                type="button"
                className="hg-dlg-row checked"
                role="radio"
                aria-checked={true}
                onClick={() => setSelectedHostId(missingSelectedHost)}
              >
                <span className="rack-host-radio">
                  <ItIcon name="check" size={12} />
                </span>
                <span className="hg-dlg-row-txt">
                  <span className="nm">{missingSelectedHost}</span>
                </span>
                <span className="hg-dlg-type">{t("itops.racks.ghostBadge")}</span>
              </button>
            ) : null}
            {hosts.map((host) => (
              <button
                type="button"
                key={host.id}
                className={`hg-dlg-row${selectedHostId === host.id ? " checked" : ""}`}
                role="radio"
                aria-checked={selectedHostId === host.id}
                onClick={() => setSelectedHostId(host.id)}
              >
                <span className="rack-host-radio">
                  {selectedHostId === host.id ? <ItIcon name="check" size={12} /> : null}
                </span>
                <span className="hg-dlg-row-txt">
                  <span className="nm">{hostDisplayName(host)}</span>
                  <span className="host">{host.hostname}</span>
                </span>
                <span className="hg-dlg-type">{t(`itops.hosts.kind.${host.kind}`)}</span>
              </button>
            ))}
          </div>
        </Sheet>
      </DialogShell>

      {addingHost ? (
        <HostDialog
          siteId={siteId}
          onClose={() => setAddingHost(false)}
          onSaved={(host) => setSelectedHostId(host.id)}
        />
      ) : null}
    </>
  );
}
