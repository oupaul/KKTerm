// Add / edit one IT Ops Host: hostname, display label, kind, parent Host
// (device carrying this VM/container), and notes. Connection bindings are
// managed by HostBindingsDialog instead, mirroring the Rack Device split.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { HostKind, SiteHost } from "../../types";
import { eligibleParentHosts, hostDisplayName } from "./hostTree";
import { useItOpsStore } from "./state";

const HOST_KINDS: HostKind[] = ["physical", "vm", "container", "other"];

export function HostDialog({
  siteId,
  host,
  defaultParentId,
  onClose,
  onSaved,
}: {
  siteId: string;
  host?: SiteHost | null;
  defaultParentId?: string | null;
  onClose: () => void;
  onSaved?: (host: SiteHost) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!host;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const hosts = useItOpsStore((state) => state.hostsBySite[siteId] ?? []);
  const createHost = useItOpsStore((state) => state.createHost);
  const updateHost = useItOpsStore((state) => state.updateHost);

  const [hostname, setHostname] = useState(host?.hostname ?? "");
  const [label, setLabel] = useState(host?.label ?? "");
  const [kind, setKind] = useState<HostKind>(
    host?.kind ?? (defaultParentId ? "vm" : "physical"),
  );
  const [parentId, setParentId] = useState<string>(
    host?.parentHostId ?? defaultParentId ?? "",
  );
  const [notes, setNotes] = useState(host?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const parents = eligibleParentHosts(hosts, host?.id ?? "");
  const canSave = hostname.trim().length > 0 && !busy;

  async function save() {
    setBusy(true);
    try {
      let savedHost: SiteHost;
      if (isEdit && host) {
        savedHost = await updateHost(siteId, host.id, {
          hostname,
          label,
          kind,
          parentHostId: parentId || null,
          connectionIds: host.connectionIds,
          notes,
        });
      } else {
        savedHost = await createHost(siteId, {
          hostname,
          label,
          kind,
          parentHostId: parentId || null,
          notes,
        });
      }
      onSaved?.(savedHost);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  const title = isEdit ? t("itops.hosts.dialogTitleEdit") : t("itops.hosts.dialogTitleAdd");

  return (
    <DialogShell onBackdrop={onClose} zClassName="itops-page">
      <Sheet
        width={460}
        title={title}
        ariaLabel={title}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" disabled={!canSave} onClick={() => void save()}>
                {t("itops.actions.save")}
              </Btn>
            }
          />
        }
      >
        <Field label={t("itops.hosts.hostnameLabel")}>
          <TextInput
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="web-01.example.com"
            autoFocus
            mono
          />
        </Field>
        <Field label={t("itops.hosts.labelLabel")}>
          <TextInput value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <Field label={t("itops.hosts.kindLabel")}>
          <Select
            value={kind}
            onChange={(event) => setKind(event.target.value as HostKind)}
            options={HOST_KINDS.map((value) => ({
              value,
              label: t(`itops.hosts.kind.${value}`),
            }))}
          />
        </Field>
        <Field label={t("itops.hosts.parentLabel")}>
          <Select
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            options={[
              { value: "", label: t("itops.hosts.parentNone") },
              ...parents.map((candidate) => ({
                value: candidate.id,
                label: hostDisplayName(candidate),
              })),
            ]}
          />
        </Field>
        <Field label={t("itops.hosts.notesLabel")}>
          <TextArea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </Sheet>
    </DialogShell>
  );
}
