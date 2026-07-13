// Import Hosts from a pasted hostname list (one per line; commas also
// separate, # lines are comments). Created Hosts are scanned automatically
// for remote-access endpoints (SSH / WinRM / HTTPS) right after the import.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Sheet, TextArea } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import { parseHostnameList } from "./hostTree";
import { useItOpsStore } from "./state";

export function HostImportDialog({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const importHosts = useItOpsStore((state) => state.importHosts);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const hostnames = parseHostnameList(text);
  const importCount = hostnames.filter(Boolean).length;

  async function submit() {
    setBusy(true);
    try {
      const result = await importHosts(siteId, hostnames);
      showStatusBarNotice(
        t("itops.hosts.importedNotice", {
          count: result.hosts.length,
          skipped: result.skipped,
        }),
        { tone: result.hosts.length > 0 ? "success" : "warning" },
      );
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose} zClassName="itops-page">
      <Sheet
        width={520}
        title={t("itops.hosts.importTitle")}
        ariaLabel={t("itops.hosts.importTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn
                kind="primary"
                disabled={busy || importCount === 0}
                onClick={() => void submit()}
              >
                {t("itops.hosts.importSubmit", { count: importCount })}
              </Btn>
            }
          />
        }
      >
        <p className="hg-dlg-help">{t("itops.hosts.importHint")}</p>
        <TextArea
          rows={10}
          className="mono"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"web-01.example.com\nweb-02.example.com\ndb-01.example.com"}
          autoFocus
        />
      </Sheet>
    </DialogShell>
  );
}
