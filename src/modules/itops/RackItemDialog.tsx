// Add / edit a Rack Item (docs/FLEET.md Phase C). A device is either a placed
// Fleet Connection (openable later) or a passive kind (switch, PDU, patch panel,
// blank, label). Position is chosen here for the dialogs-first baseline; drag
// placement lands in a later slice. Built from the shared dialog primitives.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Select,
  Sheet,
  Stepper,
  TextInput,
} from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { Rack, RackItem, RackItemKind, ResolvedHost } from "../../types";
import { useItOpsStore } from "./state";

const PASSIVE_KINDS: RackItemKind[] = ["server", "switch", "pdu", "patchPanel", "blank", "label"];
const ALL_KINDS: RackItemKind[] = ["connection", ...PASSIVE_KINDS];

export function RackItemDialog({
  fleetId,
  rack,
  item,
  defaultStartU,
  members,
  onClose,
}: {
  fleetId: string;
  rack: Rack;
  item?: RackItem | null;
  defaultStartU?: number;
  members: ResolvedHost[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!item;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const placeRackItem = useItOpsStore((state) => state.placeRackItem);
  const updateRackItem = useItOpsStore((state) => state.updateRackItem);
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);
  const removeRackItem = useItOpsStore((state) => state.removeRackItem);

  const [kind, setKind] = useState<RackItemKind>(item?.kind ?? "connection");
  const [connectionId, setConnectionId] = useState<string>(
    item?.connectionId ?? members[0]?.connectionId ?? "",
  );
  const [label, setLabel] = useState(item?.label ?? "");
  const [startU, setStartU] = useState(item?.startU ?? defaultStartU ?? 1);
  const [heightU, setHeightU] = useState(item?.heightU ?? 1);
  const [busy, setBusy] = useState(false);

  const needsConnection = kind === "connection";
  const hasConnection = !needsConnection || connectionId.length > 0;
  const canSave = hasConnection && !busy && heightU >= 1 && startU >= 1;

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    const resolvedConnectionId = needsConnection ? connectionId : null;
    try {
      if (isEdit) {
        await updateRackItem(fleetId, {
          id: item!.id,
          kind,
          connectionId: resolvedConnectionId,
          label: label.trim(),
        });
        if (startU !== item!.startU || heightU !== item!.heightU) {
          await moveRackItem(fleetId, { id: item!.id, rackId: rack.id, startU, heightU });
        }
      } else {
        await placeRackItem(fleetId, {
          rackId: rack.id,
          connectionId: resolvedConnectionId,
          kind,
          label: label.trim(),
          startU,
          heightU,
        });
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!item) return;
    setBusy(true);
    try {
      await removeRackItem(fleetId, item.id);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose}>
      <Sheet
        width={440}
        title={isEdit ? t("itops.racks.editItemTitle") : t("itops.racks.addItemTitle")}
        ariaLabel={isEdit ? t("itops.racks.editItemTitle") : t("itops.racks.addItemTitle")}
        footer={
          <Actions
            extraLeft={
              isEdit ? (
                <Btn kind="danger" onClick={() => void handleRemove()} disabled={busy}>
                  {t("itops.actions.delete")}
                </Btn>
              ) : undefined
            }
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" onClick={() => void handleSave()} disabled={!canSave}>
                {isEdit ? t("itops.actions.save") : t("itops.racks.placeAction")}
              </Btn>
            }
          />
        }
      >
        <Field label={t("itops.racks.kindLabel")}>
          <Select
            value={kind}
            onChange={(event) => setKind(event.currentTarget.value as RackItemKind)}
            options={ALL_KINDS.map((value) => ({ value, label: t(`itops.racks.kind.${value}`) }))}
          />
        </Field>

        {needsConnection ? (
          <Field label={t("itops.racks.connectionLabel")} req>
            {members.length === 0 ? (
              <div className="hg-dlg-empty">{t("itops.racks.noMembers")}</div>
            ) : (
              <Select
                value={connectionId}
                onChange={(event) => setConnectionId(event.currentTarget.value)}
                options={members.map((member) => ({
                  value: member.connectionId,
                  label: `${member.name} (${member.host})`,
                }))}
              />
            )}
          </Field>
        ) : null}

        <Field label={t("itops.racks.labelLabel")} hint={t("itops.racks.labelHint")}>
          <TextInput
            value={label}
            placeholder={t("itops.racks.labelPlaceholder")}
            onChange={(event) => setLabel(event.currentTarget.value)}
          />
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("itops.racks.startULabel")}>
            <Stepper
              value={startU}
              min={1}
              onChange={(next) => setStartU(Math.max(1, Math.min(rack.heightU, next)))}
              ariaDecrease={t("itops.racks.startUDecrease")}
              ariaIncrease={t("itops.racks.startUIncrease")}
            />
          </Field>
          <Field label={t("itops.racks.itemHeightLabel")}>
            <Stepper
              value={heightU}
              min={1}
              onChange={(next) => setHeightU(Math.max(1, Math.min(rack.heightU, next)))}
              ariaDecrease={t("itops.racks.itemHeightDecrease")}
              ariaIncrease={t("itops.racks.itemHeightIncrease")}
            />
          </Field>
        </div>
      </Sheet>
    </DialogShell>
  );
}
