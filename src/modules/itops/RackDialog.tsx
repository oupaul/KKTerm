// Create / edit a Rack in a Site's virtual datacenter (docs/SITE.md Phase C).
// Built from the shared dialog primitives (docs/DESIGN_LANGUAGE.md).

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Select,
  Sheet,
  TextInput,
} from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { Site, Rack, RackShell, ServerRoom } from "../../types";
import { RackElevation } from "./RackElevation";
import { useItOpsStore } from "./state";

const MAX_RACK_U = 100;
const MAX_RACK_DEPTH_MM = 5000;
// Mirrors the backend sanity ceiling (1 MW).
const MAX_RACK_POWER_W = 1_000_000;
const HEIGHT_PRESETS = [6, 9, 12, 15, 18, 22, 24, 27, 32, 37, 42, 45, 48];
const DEPTH_PRESETS = [600, 800, 900, 1000, 1070, 1200];
const SHELL_OPTIONS: RackShell[] = ["black", "white", "grey"];

function numericInput(value: string, fallback: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(1, parsed)) : fallback;
}

function shellPreviewRack(shell: RackShell): Rack {
  return {
    id: `rack-shell-preview-${shell}`,
    siteId: "",
    name: "",
    serverRoom: "",
    rackGroup: "",
    shell,
    background: null,
    heightU: 8,
    depthMm: 1000,
    sortOrder: 0,
    items: [],
  };
}

export function RackDialog({
  defaultSiteId,
  sites,
  serverRoomsBySite,
  rack,
  defaultServerRoom,
  defaultGroup,
  onClose,
  onSaved,
}: {
  defaultSiteId: string;
  sites: Site[];
  serverRoomsBySite: Record<string, ServerRoom[]>;
  rack?: Rack | null;
  /** Prefill the Server Room for a new rack (e.g. added within a room). */
  defaultServerRoom?: string;
  /** Prefill the Group for a new rack (e.g. added within a group section). */
  defaultGroup?: string;
  onClose: () => void;
  onSaved?: (rack: Rack) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!rack;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createRack = useItOpsStore((state) => state.createRack);
  const updateRack = useItOpsStore((state) => state.updateRack);
  const racksBySite = useItOpsStore((state) => state.racksBySite);
  const groupListId = useId();

  const [siteId, setSiteId] = useState(rack?.siteId ?? defaultSiteId);
  const [name, setName] = useState(rack?.name ?? "");
  const [serverRoom, setServerRoom] = useState(rack?.serverRoom ?? defaultServerRoom ?? "");
  const [rackGroup, setRackGroup] = useState(rack?.rackGroup ?? defaultGroup ?? "");
  const [shell, setShell] = useState<RackShell>(rack?.shell ?? "black");
  const [heightU, setHeightU] = useState(rack?.heightU ?? 42);
  const [heightMode, setHeightMode] = useState<"preset" | "custom">(
    rack && !HEIGHT_PRESETS.includes(rack.heightU) ? "custom" : "preset",
  );
  const [depthMm, setDepthMm] = useState(rack?.depthMm ?? 1000);
  const [depthMode, setDepthMode] = useState<"preset" | "custom">(
    rack && !DEPTH_PRESETS.includes(rack.depthMm) ? "custom" : "preset",
  );
  // Kept as text so the field can be blank (= capacity unset).
  const [powerCapacity, setPowerCapacity] = useState(
    rack?.powerCapacityW ? String(rack.powerCapacityW) : "",
  );
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && siteId.length > 0 && serverRoom.length > 0 && !busy;

  const serverRoomOptions = useMemo(() => {
    const names = new Set((serverRoomsBySite[siteId] ?? []).map((entry) => entry.name));
    if (serverRoom.trim()) {
      names.add(serverRoom.trim());
    }
    return [
      { value: "", label: t("itops.racks.serverRoomRequiredOption") },
      ...[...names].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value })),
    ];
  }, [siteId, serverRoomsBySite, serverRoom, t]);

  const groupOptions = useMemo(() => {
    const groups = new Set(
      (racksBySite[siteId] ?? [])
        .filter((entry) => entry.serverRoom === serverRoom)
        .map((entry) => entry.rackGroup.trim())
        .filter(Boolean),
    );
    return [...groups].sort((a, b) => a.localeCompare(b));
  }, [racksBySite, serverRoom, siteId]);

  useEffect(() => {
    if (siteId && sites.some((site) => site.id === siteId)) {
      return;
    }
    setSiteId(defaultSiteId || sites[0]?.id || "");
  }, [defaultSiteId, siteId, sites]);

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    const parsedPower = Number.parseInt(powerCapacity, 10);
    const input = {
      name: trimmedName,
      serverRoom: serverRoom.trim(),
      rackGroup: rackGroup.trim(),
      shell,
      heightU,
      depthMm,
      powerCapacityW:
        Number.isFinite(parsedPower) && parsedPower > 0
          ? Math.min(parsedPower, MAX_RACK_POWER_W)
          : null,
    };
    try {
      if (isEdit) {
        await updateRack(siteId, rack!.id, input);
        onSaved?.({ ...rack!, ...input, shell: shell ?? null });
      } else {
        const created = await createRack(siteId, input);
        onSaved?.(created);
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  const livePreview: Rack = {
    ...(rack ?? {
      id: "rack-dialog-preview",
      siteId,
      background: null,
      sortOrder: 0,
      items: [],
    }),
    name: trimmedName,
    serverRoom,
    rackGroup,
    shell,
    heightU,
    depthMm,
  };

  return (
    <DialogShell onBackdrop={onClose}>
      <Sheet
        width={700}
        className="rack-dialog"
        title={isEdit ? t("itops.racks.editTitle") : t("itops.racks.newTitle")}
        ariaLabel={isEdit ? t("itops.racks.editTitle") : t("itops.racks.newTitle")}
        rule
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn
                kind="primary"
                icon={isEdit ? "check" : "plus"}
                onClick={() => void handleSave()}
                disabled={!canSave}
              >
                {isEdit ? t("itops.actions.save") : t("itops.actions.create")}
              </Btn>
            }
          />
        }
      >
        <div className="rack-dialog-layout itops-page">
          <aside className="rack-dialog-preview">
            <div className="rack-dialog-preview-stage" aria-hidden="true">
              <RackElevation rack={livePreview} />
            </div>
            <div className="rack-dialog-preview-caption">
              <strong>{trimmedName || t("itops.racks.newTitle")}</strong>
              <span>
                {t("itops.racks.unitCount", { count: heightU })} · {depthMm} mm · {t(`itops.racks.shell.${shell}`)}
              </span>
            </div>
          </aside>

          <div className="rack-dialog-form">
            <div className="rack-dialog-field-row">
              <Field label={t("itops.racks.siteLabel")} req>
                <Select
                  value={siteId}
                  disabled={isEdit || sites.length <= 1}
                  onChange={(event) => setSiteId(event.currentTarget.value)}
                  options={sites.map((site) => ({ value: site.id, label: site.name }))}
                />
              </Field>
              <Field label={t("itops.racks.serverRoomSelectLabel")} req>
                <Select
                  value={serverRoom}
                  onChange={(event) => setServerRoom(event.currentTarget.value)}
                  options={serverRoomOptions}
                />
              </Field>
            </div>

            <div className="rack-dialog-field-row">
              <Field label={t("itops.racks.nameLabel")} req>
                <TextInput
                  value={name}
                  placeholder={t("itops.racks.namePlaceholder")}
                  onChange={(event) => setName(event.currentTarget.value)}
                  autoFocus
                />
              </Field>
              <Field label={t("itops.racks.groupLabel")}>
                <TextInput
                  value={rackGroup}
                  placeholder={t("itops.racks.groupPlaceholder")}
                  list={groupOptions.length > 0 ? groupListId : undefined}
                  onChange={(event) => setRackGroup(event.currentTarget.value)}
                />
                {groupOptions.length > 0 ? (
                  <datalist id={groupListId}>
                    {groupOptions.map((value) => <option key={value} value={value} />)}
                  </datalist>
                ) : null}
              </Field>
            </div>

            <Field label={t("itops.racks.shellLabel")}>
              <div className="rack-dialog-shell-grid">
                {SHELL_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rack-dialog-shell-tile${shell === value ? " selected" : ""}`}
                    aria-pressed={shell === value}
                    onClick={() => setShell(value)}
                  >
                    <div className="rack-dialog-shell-preview" aria-hidden="true">
                      <RackElevation rack={shellPreviewRack(value)} />
                    </div>
                    <span>{t(`itops.racks.shell.${value}`)}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="rack-dialog-field-row rack-dialog-dimensions">
              <Field label={t("itops.racks.heightLabel")} req>
                <Select
                  value={heightMode === "custom" ? "custom" : String(heightU)}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (value === "custom") setHeightMode("custom");
                    else {
                      setHeightMode("preset");
                      setHeightU(Number(value));
                    }
                  }}
                  options={[
                    ...HEIGHT_PRESETS.map((value) => ({ value: String(value), label: `${value}U` })),
                    { value: "custom", label: t("itops.racks.customOption") },
                  ]}
                />
                {heightMode === "custom" ? (
                  <TextInput
                    type="number"
                    mono
                    min={1}
                    max={MAX_RACK_U}
                    value={heightU}
                    aria-label={t("itops.racks.heightLabel")}
                    onChange={(event) => setHeightU(numericInput(event.currentTarget.value, heightU, MAX_RACK_U))}
                  />
                ) : null}
              </Field>
              <Field label={t("itops.racks.depthLabel")} req>
                <Select
                  value={depthMode === "custom" ? "custom" : String(depthMm)}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (value === "custom") setDepthMode("custom");
                    else {
                      setDepthMode("preset");
                      setDepthMm(Number(value));
                    }
                  }}
                  options={[
                    ...DEPTH_PRESETS.map((value) => ({
                      value: String(value),
                      label: value === 600
                        ? t("itops.racks.depthNetworkOption")
                        : value === 1000
                          ? t("itops.racks.depthServerOption")
                          : `${value} mm`,
                    })),
                    { value: "custom", label: t("itops.racks.customOption") },
                  ]}
                />
                {depthMode === "custom" ? (
                  <TextInput
                    type="number"
                    mono
                    min={1}
                    max={MAX_RACK_DEPTH_MM}
                    value={depthMm}
                    aria-label={t("itops.racks.depthLabel")}
                    onChange={(event) => setDepthMm(numericInput(event.currentTarget.value, depthMm, MAX_RACK_DEPTH_MM))}
                  />
                ) : null}
              </Field>
              <Field label={t("itops.racks.powerCapacityLabel")}>
                <TextInput
                  type="number"
                  mono
                  min={0}
                  max={MAX_RACK_POWER_W}
                  value={powerCapacity}
                  placeholder={t("itops.racks.powerCapacityPlaceholder")}
                  onChange={(event) => setPowerCapacity(event.currentTarget.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      </Sheet>
    </DialogShell>
  );
}
