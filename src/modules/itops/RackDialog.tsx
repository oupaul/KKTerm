// Create / edit a Rack in a Fleet's virtual datacenter (docs/FLEET.md Phase C).
// Built from the shared dialog primitives (docs/DESIGN_LANGUAGE.md).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Sheet, Stepper, TextInput } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { Rack } from "../../types";
import { useItOpsStore } from "./state";

const MAX_RACK_U = 100;

export function RackDialog({
  fleetId,
  rack,
  onClose,
}: {
  fleetId: string;
  rack?: Rack | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!rack;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createRack = useItOpsStore((state) => state.createRack);
  const updateRack = useItOpsStore((state) => state.updateRack);

  const [name, setName] = useState(rack?.name ?? "");
  const [region, setRegion] = useState(rack?.region ?? "");
  const [area, setArea] = useState(rack?.area ?? "");
  const [heightU, setHeightU] = useState(rack?.heightU ?? 42);
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !busy;

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    const input = { name: trimmedName, region: region.trim(), area: area.trim(), heightU };
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
        <Field label={t("itops.racks.regionLabel")}>
          <TextInput
            value={region}
            placeholder={t("itops.racks.regionPlaceholder")}
            onChange={(event) => setRegion(event.currentTarget.value)}
          />
        </Field>
        <Field label={t("itops.racks.areaLabel")}>
          <TextInput
            value={area}
            placeholder={t("itops.racks.areaPlaceholder")}
            onChange={(event) => setArea(event.currentTarget.value)}
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
