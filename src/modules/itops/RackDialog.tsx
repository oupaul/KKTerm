// Create / edit a Rack in a Fleet's virtual datacenter (docs/FLEET.md Phase C).
// Built from the shared dialog primitives (docs/DESIGN_LANGUAGE.md).

import { useEffect, useMemo, useState } from "react";
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
import type { Fleet, Rack, RackShell } from "../../types";
import { useItOpsStore } from "./state";

const MAX_RACK_U = 100;
const SHELL_OPTIONS: RackShell[] = ["black", "white", "grey"];

export function RackDialog({
  defaultFleetId,
  fleets,
  racksByFleet,
  rack,
  defaultServerRoom,
  defaultGroup,
  onClose,
  onSaved,
}: {
  defaultFleetId: string;
  fleets: Fleet[];
  racksByFleet: Record<string, Rack[]>;
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

  const [fleetId, setFleetId] = useState(rack?.fleetId ?? defaultFleetId);
  const [name, setName] = useState(rack?.name ?? "");
  const [serverRoom, setServerRoom] = useState(rack?.serverRoom ?? defaultServerRoom ?? "");
  const [rackGroup, setRackGroup] = useState(rack?.rackGroup ?? defaultGroup ?? "");
  const [shell, setShell] = useState<RackShell>(rack?.shell ?? "black");
  const [heightU, setHeightU] = useState(rack?.heightU ?? 42);
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && fleetId.length > 0 && !busy;

  const serverRoomOptions = useMemo(() => {
    const names = new Set(
      (racksByFleet[fleetId] ?? []).map((entry) => entry.serverRoom.trim()).filter(Boolean),
    );
    if (serverRoom.trim()) {
      names.add(serverRoom.trim());
    }
    return [
      { value: "", label: t("itops.racks.unassigned") },
      ...[...names].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value })),
    ];
  }, [fleetId, racksByFleet, serverRoom, t]);

  useEffect(() => {
    if (fleetId && fleets.some((fleet) => fleet.id === fleetId)) {
      return;
    }
    setFleetId(defaultFleetId || fleets[0]?.id || "");
  }, [defaultFleetId, fleetId, fleets]);

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    const input = {
      name: trimmedName,
      serverRoom: serverRoom.trim(),
      rackGroup: rackGroup.trim(),
      shell,
      heightU,
    };
    try {
      if (isEdit) {
        await updateRack(fleetId, rack!.id, input);
        onSaved?.({ ...rack!, ...input, shell: shell ?? null });
      } else {
        const created = await createRack(fleetId, input);
        onSaved?.(created);
      }
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
        width={420}
        title={isEdit ? t("itops.racks.editTitle") : t("itops.racks.newTitle")}
        ariaLabel={isEdit ? t("itops.racks.editTitle") : t("itops.racks.newTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" onClick={() => void handleSave()} disabled={!canSave}>
                {isEdit ? t("itops.actions.save") : t("itops.actions.create")}
              </Btn>
            }
          />
        }
      >
        <Field label={t("itops.racks.nameLabel")} req>
          <TextInput
            value={name}
            placeholder={t("itops.racks.namePlaceholder")}
            onChange={(event) => setName(event.currentTarget.value)}
            autoFocus
          />
        </Field>
        <Field label={t("itops.racks.fleetLabel")} req>
          <Select
            value={fleetId}
            disabled={isEdit || fleets.length <= 1}
            onChange={(event) => setFleetId(event.currentTarget.value)}
            options={fleets.map((fleet) => ({ value: fleet.id, label: fleet.name }))}
          />
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("itops.racks.serverRoomSelectLabel")}>
            <Select
              value={serverRoom}
              onChange={(event) => setServerRoom(event.currentTarget.value)}
              options={serverRoomOptions}
            />
          </Field>
          <Field label={t("itops.racks.groupLabel")}>
            <TextInput
              value={rackGroup}
              placeholder={t("itops.racks.groupPlaceholder")}
              onChange={(event) => setRackGroup(event.currentTarget.value)}
            />
          </Field>
        </div>
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
        <Field label={t("itops.racks.heightLabel")}>
          <Stepper
            value={heightU}
            min={1}
            onChange={(next) => setHeightU(Math.min(MAX_RACK_U, Math.max(1, next)))}
            ariaDecrease={t("itops.racks.heightDecrease")}
            ariaIncrease={t("itops.racks.heightIncrease")}
          />
        </Field>
      </Sheet>
    </DialogShell>
  );
}
