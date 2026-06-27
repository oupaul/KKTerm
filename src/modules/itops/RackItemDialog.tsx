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
  Swatches,
  TextInput,
} from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type {
  Rack,
  RackItem,
  RackItemKind,
  RackItemMetadata,
  RackItemStatus,
  ResolvedHost,
} from "../../types";
import { useItOpsStore } from "./state";

const PASSIVE_KINDS: RackItemKind[] = [
  "server",
  "storage",
  "switch",
  "router",
  "firewall",
  "pdu",
  "ups",
  "kvm",
  "patchPanel",
  "equipment",
  "general",
  "blank",
  "label",
];
const ALL_KINDS: RackItemKind[] = ["connection", ...PASSIVE_KINDS];
const STATUS_OPTIONS: RackItemStatus[] = ["online", "warning", "offline"];

// Which faceplate spec inputs a kind exposes.
function showsPorts(kind: RackItemKind): boolean {
  return kind === "switch" || kind === "router" || kind === "patchPanel";
}
function showsDisks(kind: RackItemKind): boolean {
  return kind === "server" || kind === "storage" || kind === "connection";
}

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
  const [accent, setAccent] = useState(item?.metadata?.accent ?? "none");
  const [status, setStatus] = useState<RackItemStatus>(item?.metadata?.status ?? "online");
  const [ports, setPorts] = useState(item?.metadata?.ports ?? 24);
  const [disks, setDisks] = useState(item?.metadata?.disks ?? 4);
  const [battery, setBattery] = useState(item?.metadata?.battery ?? 90);
  const [load, setLoad] = useState(item?.metadata?.load ?? 60);
  const [busy, setBusy] = useState(false);

  const metadata: RackItemMetadata = {
    accent: accent === "none" ? null : accent,
    status,
    ...(showsPorts(kind) ? { ports } : {}),
    ...(showsDisks(kind) ? { disks } : {}),
    ...(kind === "ups" ? { battery } : {}),
    ...(kind === "pdu" ? { load } : {}),
  };

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
          metadata,
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
          metadata,
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

        <Field label={t("itops.racks.statusLabel")}>
          <Select
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value as RackItemStatus)}
            options={STATUS_OPTIONS.map((value) => ({
              value,
              label: t(`itops.racks.status.${value}`),
            }))}
          />
        </Field>

        {showsPorts(kind) || showsDisks(kind) || kind === "ups" || kind === "pdu" ? (
          <div style={{ display: "flex", gap: 12 }}>
            {showsPorts(kind) ? (
              <Field label={t("itops.racks.portsLabel")}>
                <Stepper
                  value={ports}
                  min={0}
                  onChange={(next) => setPorts(Math.max(0, Math.min(48, next)))}
                  ariaDecrease={t("itops.racks.portsDecrease")}
                  ariaIncrease={t("itops.racks.portsIncrease")}
                />
              </Field>
            ) : null}
            {showsDisks(kind) ? (
              <Field label={t("itops.racks.disksLabel")}>
                <Stepper
                  value={disks}
                  min={0}
                  onChange={(next) => setDisks(Math.max(0, Math.min(14, next)))}
                  ariaDecrease={t("itops.racks.disksDecrease")}
                  ariaIncrease={t("itops.racks.disksIncrease")}
                />
              </Field>
            ) : null}
            {kind === "ups" ? (
              <Field label={t("itops.racks.batteryLabel")}>
                <Stepper
                  value={battery}
                  min={0}
                  onChange={(next) => setBattery(Math.max(0, Math.min(100, next)))}
                  ariaDecrease={t("itops.racks.batteryDecrease")}
                  ariaIncrease={t("itops.racks.batteryIncrease")}
                />
              </Field>
            ) : null}
            {kind === "pdu" ? (
              <Field label={t("itops.racks.loadLabel")}>
                <Stepper
                  value={load}
                  min={0}
                  onChange={(next) => setLoad(Math.max(0, Math.min(100, next)))}
                  ariaDecrease={t("itops.racks.loadDecrease")}
                  ariaIncrease={t("itops.racks.loadIncrease")}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        <Field label={t("itops.racks.accentLabel")}>
          <Swatches
            value={accent}
            onChange={setAccent}
            allowNone
            noneLabel={t("itops.racks.accentNone")}
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
