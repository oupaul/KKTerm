// Add / edit Rack Device type, appearance, placement, and metadata. Durable
// Connection associations are managed by RackItemBindingsDialog instead.

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
  RackNetworkPort,
  RackPortSpeed,
  RackShell,
  ResolvedHost,
} from "../../types";
import { hostDisplayName } from "./hostTree";
import type { KuaiKuaiStyle } from "./KuaiKuaiBag";
import { normalizeRackItemMetadata } from "./rackInventory";
import { RackDevice } from "./RackDevice";
import { useItOpsStore } from "./state";

const SHELL_OPTIONS: RackShell[] = ["black", "white", "grey"];
const PORT_SPEEDS: RackPortSpeed[] = ["gigabit", "10g", "25g", "40g", "100g", "custom"];

export const RACK_ITEM_KINDS: RackItemKind[] = [
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

function newNetworkPort(index: number): RackNetworkPort {
  return { name: `${index + 1}`, speed: "gigabit", state: "unknown" };
}

function clampStartUForHeight(startU: number, heightU: number, rackHeightU: number) {
  const maxStartU = Math.max(1, rackHeightU - heightU + 1);
  return Math.max(1, Math.min(maxStartU, startU));
}

const DISKS_PER_U = 24;

/** A configured-but-unplaced Rack Device: everything `placeRackItem` needs
 *  except the rack position, which the armed placement click supplies. */
export interface RackItemDraft {
  kind: RackItemKind;
  connectionId: string | null;
  label: string;
  heightU: number;
  metadata: RackItemMetadata;
}

export function RackItemDialog({
  siteId,
  rack,
  item,
  defaultKind,
  defaultStartU,
  members,
  onClose,
  onConfigured,
}: {
  siteId: string;
  rack: Rack;
  item?: RackItem | null;
  defaultKind?: RackItemKind;
  defaultStartU?: number;
  members: ResolvedHost[];
  onClose: () => void;
  /** Picker placement flow: instead of placing on save, hand the configured
   *  draft back so the caller can arm a cursor-tracked placement click. */
  onConfigured?: (draft: RackItemDraft) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!item;
  const initialMetadata = normalizeRackItemMetadata(item?.metadata ?? {});
  const initialKind = item?.kind ?? defaultKind ?? "server";
  const initialKuaiguaiStyle: KuaiKuaiStyle =
    initialMetadata.kuaiguaiStyle ?? (item?.kind === "kuaiguai" && item.heightU === 1 ? "laidDown" : "full");
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const placeRackItem = useItOpsStore((state) => state.placeRackItem);
  const updateRackItem = useItOpsStore((state) => state.updateRackItem);
  const moveRackItem = useItOpsStore((state) => state.moveRackItem);
  const removeRackItem = useItOpsStore((state) => state.removeRackItem);
  const refreshRackItemSnmp = useItOpsStore((state) => state.refreshRackItemSnmp);

  const [kind, setKind] = useState<RackItemKind>(initialKind);
  const [connectionId, setConnectionId] = useState<string>(
    item?.connectionId ?? members[0]?.connectionId ?? "",
  );
  const [label, setLabel] = useState(item?.label ?? "");
  const [startU, setStartU] = useState(item?.startU ?? defaultStartU ?? 1);
  const [heightU, setHeightU] = useState(
    initialKind === "kuaiguai" ? (initialKuaiguaiStyle === "laidDown" ? 1 : 4) : item?.heightU ?? 1,
  );
  const [accent, setAccent] = useState(item?.metadata?.accent ?? "none");
  const [status, setStatus] = useState<RackItemStatus>(item?.metadata?.status ?? "online");
  const [ports, setPorts] = useState(item?.metadata?.ports ?? 24);
  const [disks, setDisks] = useState(item?.metadata?.disks ?? 4);
  const [battery, setBattery] = useState(item?.metadata?.battery ?? 90);
  const [load, setLoad] = useState(item?.metadata?.load ?? 60);
  const [shell, setShell] = useState<RackShell>(item?.metadata?.shell ?? "black");
  const [expiry, setExpiry] = useState(item?.metadata?.expiry ?? "");
  const [rotation, setRotation] = useState(item?.metadata?.rotation ?? -2);
  const [kuaiguaiSize, setKuaiguaiSize] = useState<"small" | "regular" | "large">(
    initialMetadata.kuaiguaiSize ?? "regular",
  );
  const [kuaiguaiStyle, setKuaiguaiStyle] = useState<KuaiKuaiStyle>(initialKuaiguaiStyle);
  const [notes, setNotes] = useState(item?.metadata?.notes ?? "");
  const [tags, setTags] = useState(joinValues(item?.metadata?.tags));
  // The IT Ops Host this device is (docs/ITOPS.md Hosts); its child Hosts show
  // in the Rack View callout.
  const siteHosts = useItOpsStore((state) => state.hostsBySite[siteId] ?? []);
  const [hostId, setHostId] = useState(item?.metadata?.hostId ?? "");
  const [networkPortRows, setNetworkPortRows] = useState<RackNetworkPort[]>(
    initialMetadata.networkPorts ?? [],
  );
  const [snmpTarget, setSnmpTarget] = useState(initialMetadata.snmp?.target ?? "");
  const [snmpOid, setSnmpOid] = useState(initialMetadata.snmp?.oid ?? "");
  const [vendor, setVendor] = useState(item?.metadata?.vendor ?? "");
  // Kept as text so the field can be blank (= draw unknown).
  const [powerDraw, setPowerDraw] = useState(
    item?.metadata?.powerW ? String(item.metadata.powerW) : "",
  );
  const [busy, setBusy] = useState(false);
  const maxDisks = Math.max(1, heightU) * DISKS_PER_U;
  const placedStartU =
    kind === "kuaiguai" && startU === rack.heightU + 1
      ? startU
      : clampStartUForHeight(startU, heightU, rack.heightU);
  const previewLabel = label.trim() || t(`itops.racks.kind.${kind}`);
  const parsedDraw = Number.parseInt(powerDraw, 10);
  const parsedPowerDraw = Number.isFinite(parsedDraw) && parsedDraw > 0 ? parsedDraw : null;
  // A 乖乖 package is decor: no status/shell/accent/power semantics.
  const isKuaiguai = kind === "kuaiguai";

  const metadata: RackItemMetadata = {
    accent: isKuaiguai || accent === "none" ? null : accent,
    status: isKuaiguai ? "online" : status,
    shell: isKuaiguai || shell === "black" ? null : shell,
    notes: notes.trim() || null,
    tags: splitLines(tags),
    connectionIds: initialMetadata.connectionIds,
    hostId: hostId || null,
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
    vendor: vendor.trim() || null,
    powerW: isKuaiguai ? null : parsedPowerDraw,
    ...(isKuaiguai
      ? { expiry: expiry.trim() || null, rotation, kuaiguaiSize, kuaiguaiStyle }
      : {}),
    ...(showsPorts(kind) ? { ports } : {}),
    ...(showsDisks(kind) ? { disks } : {}),
    ...(kind === "ups" ? { battery } : {}),
    ...(kind === "pdu" ? { load } : {}),
  };

  const needsConnection = kind === "connection";
  const hasConnection = !needsConnection || connectionId.length > 0;
  const canSave = hasConnection && !busy && heightU >= 1 && startU >= 1;
  // Picker flow: the dialog only configures the device; the rack position
  // comes from the armed placement click afterwards.
  const placementMode = !isEdit && !!onConfigured;

  function updateNetworkPort(index: number, patch: Partial<RackNetworkPort>) {
    setNetworkPortRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addNetworkPort() {
    setNetworkPortRows((rows) => [...rows, newNetworkPort(rows.length)]);
  }

  function selectKind(next: RackItemKind) {
    setKind(next);
    if (next === "kuaiguai") {
      setHeightU(kuaiguaiStyle === "laidDown" ? 1 : 4);
    } else if (kind === "kuaiguai") {
      setHeightU(1);
      setStartU((current) => clampStartUForHeight(current, 1, rack.heightU));
    }
  }

  function selectKuaiguaiStyle(next: KuaiKuaiStyle) {
    const nextHeight = next === "laidDown" ? 1 : 4;
    setKuaiguaiStyle(next);
    setHeightU(nextHeight);
    if (startU <= rack.heightU) {
      setStartU((current) => clampStartUForHeight(current, nextHeight, rack.heightU));
    }
  }

  async function handleSave() {
    if (!canSave) return;
    const resolvedConnectionId = needsConnection ? connectionId : null;
    if (placementMode) {
      onConfigured!({
        kind,
        connectionId: resolvedConnectionId,
        label: label.trim(),
        heightU,
        metadata,
      });
      onClose();
      return;
    }
    setBusy(true);
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
    <DialogShell onBackdrop={onClose} zClassName="itops-page">
      <Sheet
        width={760}
        className="rack-item-dialog"
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
        <div className="rack-item-dialog-grid">
          <section className="rack-item-dialog-column type-column">
            <div className="rack-item-preview-block">
              <div className="rack-item-preview-stage">
                <div className="rack-item-preview-rack">
                  <span className="rack-item-preview-rail" />
                  <div className="rack-item-preview-bay">
                    <div
                      className="rack-item-preview-device"
                      style={{
                        ["--rack-item-preview-height" as string]: `${Math.min(4, Math.max(1, heightU)) * 22}px`,
                      }}
                    >
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
                        kuaiguaiSize={kind === "kuaiguai" ? kuaiguaiSize : null}
                        kuaiguaiStyle={kind === "kuaiguai" ? kuaiguaiStyle : null}
                        heightU={heightU}
                        accent={accent === "none" ? null : accent}
                        shell={shell}
                        seed={item?.id ?? `${kind}-${label}`}
                      />
                    </div>
                    <span className="rack-item-preview-empty-slot" />
                    <span className="rack-item-preview-empty-slot" />
                    <span className="rack-item-preview-empty-slot" />
                  </div>
                  <span className="rack-item-preview-rail" />
                </div>
              </div>
              <div className="rack-item-preview-caption">
                <strong>{previewLabel}</strong>
                <span>
                  {heightU}U · {t(`itops.racks.shell.${shell}`)}
                </span>
              </div>
            </div>

            {/* The picker placement flow already chose the type and an
                existing device keeps its type: the switcher grid only shows
                for the empty-slot add flow. */}
            {placementMode || isEdit ? null : (
              <div
                className="rack-kind-preview-grid"
                role="group"
                aria-label={t("itops.racks.kindPreviewLabel")}
              >
                {RACK_ITEM_KINDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rack-kind-preview${kind === value ? " selected" : ""}`}
                    aria-pressed={kind === value}
                    onClick={() => selectKind(value)}
                  >
                    <span className="rack-kind-preview-face">
                      <RackDevice
                        kind={value}
                        label={t(`itops.racks.kind.${value}`)}
                        subLabel={null}
                        status={status}
                        ports={showsPorts(value) ? ports : null}
                        disks={showsDisks(value) ? disks : null}
                        battery={value === "ups" ? battery : null}
                        load={value === "pdu" ? load : null}
                        expiry={value === "kuaiguai" ? expiry : null}
                        rotation={value === "kuaiguai" ? rotation : null}
                        kuaiguaiSize={value === "kuaiguai" ? kuaiguaiSize : null}
                        kuaiguaiStyle={value === "kuaiguai" ? kuaiguaiStyle : null}
                        heightU={1}
                        accent={accent === "none" ? null : accent}
                        shell={shell}
                        seed={`preview-${value}`}
                      />
                    </span>
                    <span className="rack-kind-preview-label">{t(`itops.racks.kind.${value}`)}</span>
                  </button>
                ))}
              </div>
            )}

            <Field label={t("itops.racks.labelLabel")} hint={t("itops.racks.labelHint")}>
              <TextInput
                value={label}
                placeholder={t("itops.racks.labelPlaceholder")}
                onChange={(event) => setLabel(event.currentTarget.value)}
              />
            </Field>

            {kind === "server" || kind === "storage" || kind === "connection" ? (
              <Field label={t("itops.racks.vendorLabel")} hint={t("itops.racks.vendorHint")}>
                <TextInput value={vendor} onChange={(event) => setVendor(event.currentTarget.value)} />
              </Field>
            ) : null}

            {siteHosts.length > 0 ? (
              <Field label={t("itops.racks.hostLabel")} hint={t("itops.racks.hostHint")}>
                <Select
                  value={hostId}
                  onChange={(event) => setHostId(event.currentTarget.value)}
                  options={[
                    { value: "", label: t("itops.racks.hostNone") },
                    ...siteHosts.map((siteHost) => ({
                      value: siteHost.id,
                      label: hostDisplayName(siteHost),
                    })),
                  ]}
                />
              </Field>
            ) : null}

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
          </section>

          <section className="rack-item-dialog-column form-column">
            {isKuaiguai ? null : (
              <>
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
                  <div className="rack-item-shell-grid">
                    {SHELL_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`rack-item-shell-tile${shell === value ? " selected" : ""}`}
                        aria-pressed={shell === value}
                        onClick={() => setShell(value)}
                      >
                        <span className="rack-item-shell-face">
                          <RackDevice
                            kind={kind}
                            label=""
                            subLabel={null}
                            status={status}
                            ports={showsPorts(kind) ? ports : null}
                            disks={showsDisks(kind) ? disks : null}
                            battery={kind === "ups" ? battery : null}
                            load={kind === "pdu" ? load : null}
                            heightU={1}
                            accent={accent === "none" ? null : accent}
                            shell={value}
                            seed={`shell-${value}-${kind}`}
                          />
                        </span>
                        <span>{t(`itops.racks.shell.${value}`)}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label={t("itops.racks.accentLabel")}>
                  <Swatches value={accent} onChange={setAccent} allowNone noneLabel={t("itops.racks.accentNone")} />
                </Field>
              </>
            )}

            {showsPorts(kind) || showsDisks(kind) || kind === "ups" || kind === "pdu" ? (
              <div className="rack-form-grid two">
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

            <div className="rack-form-grid two">
              {placementMode ? null : (
                <Field label={t("itops.racks.startULabel")} req>
                  <Stepper value={startU} min={1} onChange={(next) => setStartU(clampStartUForHeight(next, heightU, rack.heightU))} ariaDecrease={t("itops.racks.startUDecrease")} ariaIncrease={t("itops.racks.startUIncrease")} />
                </Field>
              )}
              {kind === "kuaiguai" ? null : (
                <Field label={t("itops.racks.itemHeightLabel")} req>
                  <Stepper value={heightU} min={1} onChange={(next) => { const clampedHeight = Math.max(1, Math.min(rack.heightU, next)); setHeightU(clampedHeight); setStartU((current) => clampStartUForHeight(current, clampedHeight, rack.heightU)); setDisks((current) => Math.min(current, clampedHeight * DISKS_PER_U)); }} ariaDecrease={t("itops.racks.itemHeightDecrease")} ariaIncrease={t("itops.racks.itemHeightIncrease")} />
                </Field>
              )}
            </div>

            {isKuaiguai ? null : (
              <Field label={t("itops.racks.powerDrawLabel")} hint={t("itops.racks.powerDrawHint")}>
                <TextInput
                  type="number"
                  mono
                  min={0}
                  value={powerDraw}
                  onChange={(event) => setPowerDraw(event.currentTarget.value)}
                />
              </Field>
            )}

            {kind === "kuaiguai" ? (
              <div className="rack-form-grid two">
                <Field label={t("itops.racks.kuaiguaiStyleLabel")}>
                  <Select
                    value={`${kuaiguaiStyle}:${kuaiguaiSize}`}
                    onChange={(event) => {
                      const [nextStyle, nextSize] = event.currentTarget.value.split(":") as [
                        KuaiKuaiStyle,
                        "small" | "regular" | "large",
                      ];
                      selectKuaiguaiStyle(nextStyle);
                      setKuaiguaiSize(nextSize);
                    }}
                    options={(["full", "laidDown"] as const).flatMap((styleValue) =>
                      (["small", "regular", "large"] as const).map((sizeValue) => ({
                        value: `${styleValue}:${sizeValue}`,
                        label: `${t(`itops.racks.kuaiguaiStyle.${styleValue}`)} · ${t(`itops.racks.kuaiguaiSize.${sizeValue}`)}`,
                      })),
                    )}
                  />
                </Field>
                <Field label={t("itops.racks.expiryLabel")}>
                  <TextInput value={expiry} placeholder="2026-12-31" onChange={(event) => setExpiry(event.currentTarget.value)} />
                </Field>
                <Field label={t("itops.racks.rotationLabel")}>
                  <Stepper value={rotation} min={-45} onChange={(next) => setRotation(Math.max(-45, Math.min(45, next)))} ariaDecrease={t("itops.racks.rotationDecrease")} ariaIncrease={t("itops.racks.rotationIncrease")} />
                </Field>
              </div>
            ) : null}

            <Field label={t("itops.racks.notesLabel")} hint={t("itops.racks.notesHint")}>
              <TextArea rows={8} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
            </Field>

            <Field label={t("itops.racks.tagsLabel")} hint={t("itops.racks.listHint")}>
              <TextArea rows={2} value={tags} onChange={(event) => setTags(event.currentTarget.value)} />
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

          </section>
        </div>
      </Sheet>
    </DialogShell>
  );
}
