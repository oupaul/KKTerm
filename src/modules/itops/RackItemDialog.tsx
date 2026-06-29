// Add / edit a Rack Device (docs/FLEET.md Phase C). A device is either a placed
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
  TextArea,
  TextInput,
} from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type {
  Rack,
  RackItem,
  RackItemKind,
  RackItemMetadata,
  RackItemStatus,
  RackShell,
  ResolvedHost,
} from "../../types";
import { useItOpsStore } from "./state";

const SHELL_OPTIONS: RackShell[] = ["black", "white", "grey"];

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
  "kuaiguai",
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
function splitLines(value: string): string[] | null {
  const rows = value.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);
  return rows.length > 0 ? rows : null;
}
function joinValues(value: string[] | null | undefined): string {
  return (value ?? []).join("\n");
}

const DISKS_PER_U = 24;

function clampStartUForHeight(startU: number, heightU: number, rackHeightU: number) {
  const maxStartU = Math.max(1, rackHeightU - heightU + 1);
  return Math.max(1, Math.min(maxStartU, startU));
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
  const [shell, setShell] = useState<RackShell>(item?.metadata?.shell ?? "black");
  const [expiry, setExpiry] = useState(item?.metadata?.expiry ?? "");
  const [rotation, setRotation] = useState(item?.metadata?.rotation ?? -2);
  const [yaw, setYaw] = useState(item?.metadata?.yaw ?? 0);
  const [notes, setNotes] = useState(item?.metadata?.notes ?? "");
  const [tags, setTags] = useState(joinValues(item?.metadata?.tags));
  const [auditRecords, setAuditRecords] = useState(joinValues(item?.metadata?.auditRecords));
  const [connectionIds, setConnectionIds] = useState(joinValues(item?.metadata?.connectionIds));
  const [networkPorts, setNetworkPorts] = useState(joinValues(item?.metadata?.networkPorts));
  const [snmp, setSnmp] = useState(item?.metadata?.snmp ?? "");
  const [relationship, setRelationship] = useState(item?.metadata?.relationship ?? "");
  const [vendor, setVendor] = useState(item?.metadata?.vendor ?? "");
  const [busy, setBusy] = useState(false);
  const maxDisks = Math.max(1, heightU) * DISKS_PER_U;
  const placedStartU = clampStartUForHeight(startU, heightU, rack.heightU);

  const metadata: RackItemMetadata = {
    accent: accent === "none" ? null : accent,
    status,
    shell: shell === "black" ? null : shell,
    notes: notes.trim() || null,
    tags: splitLines(tags),
    auditRecords: splitLines(auditRecords),
    connectionIds: splitLines(connectionIds),
    networkPorts: splitLines(networkPorts),
    snmp: snmp.trim() || null,
    relationship: relationship.trim() || null,
    vendor: vendor.trim() || null,
    ...(kind === "kuaiguai" ? { expiry: expiry.trim() || null, rotation, yaw } : {}),
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
        if (placedStartU !== item!.startU || heightU !== item!.heightU) {
          await moveRackItem(fleetId, { id: item!.id, rackId: rack.id, startU: placedStartU, heightU });
        }
      } else {
        await placeRackItem(fleetId, {
          rackId: rack.id,
          connectionId: resolvedConnectionId,
          kind,
          label: label.trim(),
          startU: placedStartU,
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

        <div style={{ display: "flex", gap: 12 }}>
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
          <Field label={t("itops.racks.shellLabel")}>
            <Select
              value={shell}
              onChange={(event) => setShell(event.currentTarget.value as RackShell)}
              options={SHELL_OPTIONS.map((value) => ({
                value,
                label: t(`itops.racks.shell.${value}`),
              }))}
            />
          </Field>
        </div>

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
                  onChange={(next) => setDisks(Math.max(0, Math.min(maxDisks, next)))}
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



        <Field label={t("itops.racks.notesLabel")} hint={t("itops.racks.notesHint")}>
          <TextArea rows={3} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("itops.racks.tagsLabel")} hint={t("itops.racks.listHint")}>
            <TextArea rows={2} value={tags} onChange={(event) => setTags(event.currentTarget.value)} />
          </Field>
          <Field label={t("itops.racks.auditLabel")} hint={t("itops.racks.auditHint")}>
            <TextArea rows={2} value={auditRecords} onChange={(event) => setAuditRecords(event.currentTarget.value)} />
          </Field>
        </div>

        <Field label={t("itops.racks.bindingsLabel")} hint={t("itops.racks.bindingsHint")}>
          <TextArea rows={2} value={connectionIds} onChange={(event) => setConnectionIds(event.currentTarget.value)} />
        </Field>

        {kind === "switch" || kind === "router" ? (
          <div style={{ display: "flex", gap: 12 }}>
            <Field label={t("itops.racks.portSpeedsLabel")} hint={t("itops.racks.portSpeedsHint")}>
              <TextArea rows={2} value={networkPorts} onChange={(event) => setNetworkPorts(event.currentTarget.value)} />
            </Field>
            <Field label={t("itops.racks.snmpLabel")} hint={t("itops.racks.snmpHint")}>
              <TextInput value={snmp} onChange={(event) => setSnmp(event.currentTarget.value)} />
            </Field>
          </div>
        ) : null}

        {kind === "server" || kind === "storage" || kind === "connection" ? (
          <div style={{ display: "flex", gap: 12 }}>
            <Field label={t("itops.racks.vendorLabel")} hint={t("itops.racks.vendorHint")}>
              <TextInput value={vendor} onChange={(event) => setVendor(event.currentTarget.value)} />
            </Field>
            <Field label={t("itops.racks.relationshipLabel")} hint={t("itops.racks.relationshipHint")}>
              <TextInput value={relationship} onChange={(event) => setRelationship(event.currentTarget.value)} />
            </Field>
          </div>
        ) : null}

        {kind === "kuaiguai" ? (
          <div style={{ display: "flex", gap: 12 }}>
            <Field label={t("itops.racks.expiryLabel")}>
              <TextInput value={expiry} placeholder="2026-12-31" onChange={(event) => setExpiry(event.currentTarget.value)} />
            </Field>
            <Field label={t("itops.racks.rotationLabel")}>
              <Stepper value={rotation} min={-45} onChange={(next) => setRotation(Math.max(-45, Math.min(45, next)))} ariaDecrease={t("itops.racks.rotationDecrease")} ariaIncrease={t("itops.racks.rotationIncrease")} />
            </Field>
            <Field label={t("itops.racks.yawLabel")}>
              <Stepper value={yaw} min={-45} onChange={(next) => setYaw(Math.max(-45, Math.min(45, next)))} ariaDecrease={t("itops.racks.yawDecrease")} ariaIncrease={t("itops.racks.yawIncrease")} />
            </Field>
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
              onChange={(next) => setStartU(clampStartUForHeight(next, heightU, rack.heightU))}
              ariaDecrease={t("itops.racks.startUDecrease")}
              ariaIncrease={t("itops.racks.startUIncrease")}
            />
          </Field>
          <Field label={t("itops.racks.itemHeightLabel")}>
            <Stepper
              value={heightU}
              min={1}
              onChange={(next) => {
                const clampedHeight = Math.max(1, Math.min(rack.heightU, next));
                setHeightU(clampedHeight);
                setStartU((current) => clampStartUForHeight(current, clampedHeight, rack.heightU));
                setDisks((current) => Math.min(current, clampedHeight * DISKS_PER_U));
              }}
              ariaDecrease={t("itops.racks.itemHeightDecrease")}
              ariaIncrease={t("itops.racks.itemHeightIncrease")}
            />
          </Field>
        </div>
      </Sheet>
    </DialogShell>
  );
}
