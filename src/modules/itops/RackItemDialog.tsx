// Add / edit a Rack Device (docs/SITE.md Phase C). A device is either a placed
// Site Connection (openable later) or a passive kind (switch, PDU, patch panel,
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
  RackAuditAction,
  RackAuditRecord,
  RackIpamAddress,
  RackItem,
  RackItemKind,
  RackItemMetadata,
  RackItemStatus,
  RackNetworkPort,
  RackPortSpeed,
  RackRelationshipKind,
  RackShell,
  ResolvedHost,
} from "../../types";
import { normalizeRackItemMetadata } from "./rackInventory";
import { RackDevice } from "./RackDevice";
import { useItOpsStore } from "./state";

const SHELL_OPTIONS: RackShell[] = ["black", "white", "grey"];
const AUDIT_ACTIONS: RackAuditAction[] = ["installed", "removed", "maintenance", "cabling", "note"];
const PORT_SPEEDS: RackPortSpeed[] = ["gigabit", "10g", "25g", "40g", "100g", "custom"];
const RELATIONSHIP_KINDS: RackRelationshipKind[] = [
  "hostVm",
  "storageAp",
  "vsan",
  "san",
  "nas",
  "hyperConverged",
  "custom",
];

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

function newAuditRecord(index: number): RackAuditRecord {
  return { id: `audit-${Date.now()}-${index}`, action: "note", label: "", occurredAt: null };
}

function newNetworkPort(index: number): RackNetworkPort {
  return { name: `${index + 1}`, speed: "gigabit", state: "unknown" };
}

function newIpamAddress(): RackIpamAddress {
  return { address: "", family: "ipv4", role: "management", vlan: null, mac: null };
}

function clampStartUForHeight(startU: number, heightU: number, rackHeightU: number) {
  const maxStartU = Math.max(1, rackHeightU - heightU + 1);
  return Math.max(1, Math.min(maxStartU, startU));
}

const DISKS_PER_U = 24;

export function RackItemDialog({
  siteId,
  rack,
  item,
  defaultStartU,
  members,
  onClose,
}: {
  siteId: string;
  rack: Rack;
  item?: RackItem | null;
  defaultStartU?: number;
  members: ResolvedHost[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!item;
  const initialMetadata = normalizeRackItemMetadata(item?.metadata ?? {});
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const placeRackItem = useItOpsStore((state) => state.placeRackItem);
  const updateRackItem = useItOpsStore((state) => state.updateRackItem);
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);
  const removeRackItem = useItOpsStore((state) => state.removeRackItem);
  const refreshRackItemSnmp = useItOpsStore((state) => state.refreshRackItemSnmp);

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
  const [kuaiguaiSize, setKuaiguaiSize] = useState<"small" | "regular" | "large">(
    initialMetadata.kuaiguaiSize ?? "regular",
  );
  const [notes, setNotes] = useState(item?.metadata?.notes ?? "");
  const [tags, setTags] = useState(joinValues(item?.metadata?.tags));
  const [auditRecordRows, setAuditRecordRows] = useState<RackAuditRecord[]>(
    initialMetadata.auditRecords ?? [],
  );
  const [boundConnectionIds, setBoundConnectionIds] = useState<string[]>(
    initialMetadata.connectionIds ?? [],
  );
  const [networkPortRows, setNetworkPortRows] = useState<RackNetworkPort[]>(
    initialMetadata.networkPorts ?? [],
  );
  const [snmpTarget, setSnmpTarget] = useState(initialMetadata.snmp?.target ?? "");
  const [snmpOid, setSnmpOid] = useState(initialMetadata.snmp?.oid ?? "");
  const [relationshipKind, setRelationshipKind] = useState<RackRelationshipKind>(
    initialMetadata.relationship?.kind ?? "custom",
  );
  const [relationshipLabel, setRelationshipLabel] = useState(initialMetadata.relationship?.label ?? "");
  const [ipamAddresses, setIpamAddresses] = useState<RackIpamAddress[]>(
    initialMetadata.ipam?.addresses ?? [],
  );
  const [vendor, setVendor] = useState(item?.metadata?.vendor ?? "");
  const [busy, setBusy] = useState(false);
  const maxDisks = Math.max(1, heightU) * DISKS_PER_U;
  const placedStartU = clampStartUForHeight(startU, heightU, rack.heightU);
  const previewLabel = label.trim() || t(`itops.racks.kind.${kind}`);

  const metadata: RackItemMetadata = {
    accent: accent === "none" ? null : accent,
    status,
    shell: shell === "black" ? null : shell,
    notes: notes.trim() || null,
    tags: splitLines(tags),
    auditRecords: auditRecordRows
      .map((record, index) => ({
        ...record,
        id: record.id || `audit-${index}`,
        label: record.label.trim(),
        occurredAt: record.occurredAt?.trim() || null,
      }))
      .filter((record) => record.label),
    connectionIds: boundConnectionIds.length > 0 ? boundConnectionIds : null,
    networkPorts: networkPortRows
      .map((port) => ({
        ...port,
        name: port.name.trim(),
        oid: port.oid?.trim() || null,
        note: port.note?.trim() || null,
      }))
      .filter((port) => port.name),
    snmp: snmpTarget.trim()
      ? { target: snmpTarget.trim(), oid: snmpOid.trim() || null }
      : null,
    relationship: relationshipLabel.trim()
      ? { kind: relationshipKind, label: relationshipLabel.trim() }
      : null,
    ipam: {
      addresses: ipamAddresses
        .map((address) => ({
          ...address,
          address: address.address.trim(),
          vlan: address.vlan?.trim() || null,
          mac: address.mac?.trim() || null,
        }))
        .filter((address) => address.address),
    },
    vendor: vendor.trim() || null,
    ...(kind === "kuaiguai" ? { expiry: expiry.trim() || null, rotation, yaw, kuaiguaiSize } : {}),
    ...(showsPorts(kind) ? { ports } : {}),
    ...(showsDisks(kind) ? { disks } : {}),
    ...(kind === "ups" ? { battery } : {}),
    ...(kind === "pdu" ? { load } : {}),
  };

  const needsConnection = kind === "connection";
  const hasConnection = !needsConnection || connectionId.length > 0;
  const canSave = hasConnection && !busy && heightU >= 1 && startU >= 1;

  function updateAuditRecord(index: number, patch: Partial<RackAuditRecord>) {
    setAuditRecordRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addAuditRecord() {
    setAuditRecordRows((rows) => [...rows, newAuditRecord(rows.length)]);
  }

  function updateNetworkPort(index: number, patch: Partial<RackNetworkPort>) {
    setNetworkPortRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addNetworkPort() {
    setNetworkPortRows((rows) => [...rows, newNetworkPort(rows.length)]);
  }

  function updateIpamAddress(index: number, patch: Partial<RackIpamAddress>) {
    setIpamAddresses((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function toggleBoundConnection(id: string, checked: boolean) {
    setBoundConnectionIds((ids) => {
      if (checked) return ids.includes(id) ? ids : [...ids, id];
      return ids.filter((value) => value !== id);
    });
  }

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    const resolvedConnectionId = needsConnection ? connectionId : null;
    try {
      if (isEdit) {
        await updateRackItem(siteId, {
          id: item!.id,
          kind,
          connectionId: resolvedConnectionId,
          label: label.trim(),
          metadata,
        });
        if (placedStartU !== item!.startU || heightU !== item!.heightU) {
          await moveRackItem(siteId, { id: item!.id, rackId: rack.id, startU: placedStartU, heightU });
        }
      } else {
        await placeRackItem(siteId, {
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

  async function handleRefreshSnmp() {
    if (!item) return;
    setBusy(true);
    try {
      await refreshRackItemSnmp(siteId, item.id);
      showStatusBarNotice(t("itops.racks.snmpRefreshComplete"), { tone: "success" });
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
      await removeRackItem(siteId, item.id);
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
        width={560}
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
        <div className="rack-item-preview">
          <RackDevice
            kind={kind}
            label={previewLabel}
            subLabel={vendor.trim() || null}
            status={status}
            ports={showsPorts(kind) ? ports : null}
            disks={showsDisks(kind) ? disks : null}
            battery={kind === "ups" ? battery : null}
            load={kind === "pdu" ? load : null}
            expiry={kind === "kuaiguai" ? expiry : null}
            rotation={kind === "kuaiguai" ? rotation : null}
            yaw={kind === "kuaiguai" ? yaw : null}
            kuaiguaiSize={kind === "kuaiguai" ? kuaiguaiSize : null}
            heightU={heightU}
            accent={accent === "none" ? null : accent}
            shell={shell}
            seed={item?.id ?? `${kind}-${label}`}
          />
        </div>

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

        <div className="rack-form-grid two">
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
          <div className="rack-form-grid four">
            {showsPorts(kind) ? (
              <Field label={t("itops.racks.portsLabel")}>
                <Stepper value={ports} min={0} onChange={(next) => setPorts(Math.max(0, Math.min(48, next)))} ariaDecrease={t("itops.racks.portsDecrease")} ariaIncrease={t("itops.racks.portsIncrease")} />
              </Field>
            ) : null}
            {showsDisks(kind) ? (
              <Field label={t("itops.racks.disksLabel")}>
                <Stepper value={disks} min={0} onChange={(next) => setDisks(Math.max(0, Math.min(maxDisks, next)))} ariaDecrease={t("itops.racks.disksDecrease")} ariaIncrease={t("itops.racks.disksIncrease")} />
              </Field>
            ) : null}
            {kind === "ups" ? (
              <Field label={t("itops.racks.batteryLabel")}>
                <Stepper value={battery} min={0} onChange={(next) => setBattery(Math.max(0, Math.min(100, next)))} ariaDecrease={t("itops.racks.batteryDecrease")} ariaIncrease={t("itops.racks.batteryIncrease")} />
              </Field>
            ) : null}
            {kind === "pdu" ? (
              <Field label={t("itops.racks.loadLabel")}>
                <Stepper value={load} min={0} onChange={(next) => setLoad(Math.max(0, Math.min(100, next)))} ariaDecrease={t("itops.racks.loadDecrease")} ariaIncrease={t("itops.racks.loadIncrease")} />
              </Field>
            ) : null}
          </div>
        ) : null}

        <Field label={t("itops.racks.notesLabel")} hint={t("itops.racks.notesHint")}>
          <TextArea rows={3} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
        </Field>

        <Field label={t("itops.racks.tagsLabel")} hint={t("itops.racks.listHint")}>
          <TextArea rows={2} value={tags} onChange={(event) => setTags(event.currentTarget.value)} />
        </Field>

        <Field label={t("itops.racks.auditLabel")} hint={t("itops.racks.auditHint")}>
          <div className="rack-audit-list">
            {auditRecordRows.map((record, index) => (
              <div className="rack-audit-row" key={record.id || index}>
                <Select
                  value={record.action}
                  onChange={(event) => updateAuditRecord(index, { action: event.currentTarget.value as RackAuditAction })}
                  options={AUDIT_ACTIONS.map((action) => ({
                    value: action,
                    label: t(`itops.racks.auditAction.${action}`),
                  }))}
                />
                <TextInput
                  value={record.label}
                  placeholder={t("itops.racks.auditLabelPlaceholder")}
                  onChange={(event) => updateAuditRecord(index, { label: event.currentTarget.value })}
                />
                <TextInput
                  value={record.occurredAt ?? ""}
                  placeholder="2026-06-29"
                  onChange={(event) => updateAuditRecord(index, { occurredAt: event.currentTarget.value })}
                />
              </div>
            ))}
            <Btn kind="ghost" onClick={addAuditRecord}>
              {t("itops.racks.addAuditRecord")}
            </Btn>
          </div>
        </Field>

        <Field label={t("itops.racks.bindingsLabel")} hint={t("itops.racks.bindingsHint")}>
          <div className="connection-binding-list">
            {members.map((member) => (
              <label className="connection-binding-row" key={member.connectionId}>
                <input
                  type="checkbox"
                  checked={boundConnectionIds.includes(member.connectionId)}
                  onChange={(event) => toggleBoundConnection(member.connectionId, event.currentTarget.checked)}
                />
                <span>{member.name}</span>
                <small>{member.host}</small>
              </label>
            ))}
          </div>
        </Field>

        {kind === "switch" || kind === "router" ? (
          <>
            <Field label={t("itops.racks.portSpeedsLabel")} hint={t("itops.racks.portSpeedsHint")}>
              <div className="rack-port-list">
                {networkPortRows.map((port, index) => (
                  <div className="rack-port-row" key={`${port.name}-${index}`}>
                    <TextInput value={port.name} onChange={(event) => updateNetworkPort(index, { name: event.currentTarget.value })} />
                    <Select value={port.speed} onChange={(event) => updateNetworkPort(index, { speed: event.currentTarget.value as RackPortSpeed })} options={PORT_SPEEDS.map((speed) => ({ value: speed, label: speed.toUpperCase() }))} />
                    <Select value={port.state ?? "unknown"} onChange={(event) => updateNetworkPort(index, { state: event.currentTarget.value as RackNetworkPort["state"] })} options={["unknown", "up", "down"].map((state) => ({ value: state, label: t(`itops.racks.portState.${state}`) }))} />
                  </div>
                ))}
                <Btn kind="ghost" onClick={addNetworkPort}>
                  {t("itops.racks.addNetworkPort")}
                </Btn>
              </div>
            </Field>
            <div className="rack-form-grid two">
              <Field label={t("itops.racks.snmpLabel")} hint={t("itops.racks.snmpHint")}>
                <TextInput value={snmpTarget} onChange={(event) => setSnmpTarget(event.currentTarget.value)} />
              </Field>
              <Field label={t("itops.racks.snmpOidLabel")}>
                <TextInput value={snmpOid} onChange={(event) => setSnmpOid(event.currentTarget.value)} />
              </Field>
            </div>
            {isEdit && snmpTarget.trim() ? (
              <Btn kind="ghost" onClick={() => void handleRefreshSnmp()} disabled={busy}>
                {t("itops.racks.refreshSnmp")}
              </Btn>
            ) : null}
          </>
        ) : null}

        {kind === "server" || kind === "storage" || kind === "connection" ? (
          <div className="rack-form-grid two">
            <Field label={t("itops.racks.vendorLabel")} hint={t("itops.racks.vendorHint")}>
              <TextInput value={vendor} onChange={(event) => setVendor(event.currentTarget.value)} />
            </Field>
            <Field label={t("itops.racks.relationshipLabel")} hint={t("itops.racks.relationshipHint")}>
              <div className="rack-relationship-edit">
                <Select
                  value={relationshipKind}
                  onChange={(event) => setRelationshipKind(event.currentTarget.value as RackRelationshipKind)}
                  options={RELATIONSHIP_KINDS.map((value) => ({
                    value,
                    label: t(`itops.racks.relationshipKind.${value}`),
                  }))}
                />
                <TextInput value={relationshipLabel} onChange={(event) => setRelationshipLabel(event.currentTarget.value)} />
              </div>
            </Field>
          </div>
        ) : null}

        <Field label={t("itops.racks.ipamLabel")} hint={t("itops.racks.ipamHint")}>
          <div className="rack-ipam-list">
            {ipamAddresses.map((address, index) => (
              <div className="rack-ipam-row" key={index}>
                <TextInput value={address.address} onChange={(event) => updateIpamAddress(index, { address: event.currentTarget.value })} />
                <Select value={address.family} onChange={(event) => updateIpamAddress(index, { family: event.currentTarget.value as "ipv4" | "ipv6" })} options={[{ value: "ipv4", label: "IPv4" }, { value: "ipv6", label: "IPv6" }]} />
                <TextInput value={address.vlan ?? ""} placeholder={t("itops.racks.vlanPlaceholder")} onChange={(event) => updateIpamAddress(index, { vlan: event.currentTarget.value })} />
                <TextInput value={address.mac ?? ""} placeholder={t("itops.racks.macPlaceholder")} onChange={(event) => updateIpamAddress(index, { mac: event.currentTarget.value })} />
              </div>
            ))}
            <Btn kind="ghost" onClick={() => setIpamAddresses((rows) => [...rows, newIpamAddress()])}>
              {t("itops.racks.addIpamAddress")}
            </Btn>
          </div>
        </Field>

        {kind === "kuaiguai" ? (
          <div className="rack-form-grid four">
            <Field label={t("itops.racks.expiryLabel")}>
              <TextInput value={expiry} placeholder="2026-12-31" onChange={(event) => setExpiry(event.currentTarget.value)} />
            </Field>
            <Field label={t("itops.racks.kuaiguaiSizeLabel")}>
              <Select
                value={kuaiguaiSize}
                onChange={(event) => setKuaiguaiSize(event.currentTarget.value as "small" | "regular" | "large")}
                options={["small", "regular", "large"].map((value) => ({
                  value,
                  label: t(`itops.racks.kuaiguaiSize.${value}`),
                }))}
              />
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
          <Swatches value={accent} onChange={setAccent} allowNone noneLabel={t("itops.racks.accentNone")} />
        </Field>

        <div className="rack-form-grid two">
          <Field label={t("itops.racks.startULabel")}>
            <Stepper value={startU} min={1} onChange={(next) => setStartU(clampStartUForHeight(next, heightU, rack.heightU))} ariaDecrease={t("itops.racks.startUDecrease")} ariaIncrease={t("itops.racks.startUIncrease")} />
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
