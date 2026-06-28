// Create / edit a Rack in a Fleet's virtual datacenter (docs/FLEET.md Phase C).
// Built from the shared dialog primitives (docs/DESIGN_LANGUAGE.md).

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
import type { Rack, RackShell } from "../../types";
import { useItOpsStore } from "./state";

const MAX_RACK_U = 100;
const SHELL_OPTIONS: RackShell[] = ["black", "white", "grey"];

export function RackDialog({
  fleetId,
  rack,
  defaultServerRoom,
  onClose,
}: {
  fleetId: string;
  rack?: Rack | null;
  /** Prefill the Server Room for a new rack (e.g. added within a room). */
  defaultServerRoom?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!rack;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createRack = useItOpsStore((state) => state.createRack);
  const updateRack = useItOpsStore((state) => state.updateRack);

  const [name, setName] = useState(rack?.name ?? "");
  const [serverRoom, setServerRoom] = useState(rack?.serverRoom ?? defaultServerRoom ?? "");
  const [shell, setShell] = useState<RackShell>(rack?.shell ?? "black");
  const [heightU, setHeightU] = useState(rack?.heightU ?? 42);
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !busy;

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    const input = {
      name: trimmedName,
      serverRoom: serverRoom.trim(),
      shell,
      heightU,
    };
    try {
      if (isEdit) {
        await updateRack(fleetId, rack!.id, input);
      } else {
        await createRack(fleetId, input);
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
        <Field label={t("itops.racks.serverRoomLabel")}>
          <TextInput
            value={serverRoom}
            placeholder={t("itops.racks.serverRoomPlaceholder")}
            onChange={(event) => setServerRoom(event.currentTarget.value)}
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
