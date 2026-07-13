// Create / edit a Site. Built from the shared dialog primitives
// (docs/DESIGN_LANGUAGE.md): a name field and an icon picker. Connection
// binding and execution transport resolution do not belong to Site properties.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Sheet, TextInput } from "../../app/ui/dialog";
import { reiconIconRefForName } from "../../lib/iconCatalog";
import { ConnectionIconBackgroundPicker } from "../workspace/connections/ConnectionIconBackgroundPicker";
import { ConnectionIconPicker } from "../workspace/connections/ConnectionIconPicker";
import { useWorkspaceStore } from "../../store";
import type { Site } from "../../types";
import { useItOpsStore } from "./state";

const DEFAULT_SITE_ICON_REF = reiconIconRefForName("Buildings2");

export function SiteDialog({
  group,
  onClose,
  onSaved,
}: {
  group?: Site | null;
  onClose: () => void;
  onSaved: (group: Site) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!group;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createSite = useItOpsStore((state) => state.createSite);
  const updateSite = useItOpsStore((state) => state.updateSite);

  const [name, setName] = useState(group?.name ?? "");
  const [iconColor, setIconColor] = useState<string | null>(group?.iconColor ?? null);
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(group?.iconDataUrl ?? null);
  const [iconBackgroundColor, setIconBackgroundColor] = useState<string | null>(
    group?.iconBackgroundColor ?? null,
  );
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !busy;

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setBusy(true);
    const input = {
      name: trimmedName,
      memberIds: group?.memberIds ?? [],
      filter: group?.filter ?? null,
      // Keep legacy persisted values stable on edit. New Sites use automatic
      // per-Host resolution; transport is no longer a Site property control.
      transport: group?.transport ?? "auto",
      iconColor,
      iconDataUrl,
      iconBackgroundColor,
    };
    try {
      const saved = isEdit
        ? await updateSite(group!.id, input)
        : await createSite(input);
      showStatusBarNotice(t("itops.sites.savedNotice", { name: saved.name }), {
        tone: "success",
      });
      onSaved(saved);
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
        title={isEdit ? t("itops.sites.editTitle") : t("itops.actions.newSite")}
        ariaLabel={isEdit ? t("itops.sites.editTitle") : t("itops.actions.newSite")}
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
        {isEdit ? null : <p className="hg-dlg-help">{t("itops.sites.createHelp")}</p>}
        <div className="connection-type-summary">
          <ConnectionIconPicker
            customIconDataUrls={[]}
            defaultIconDataUrl={DEFAULT_SITE_ICON_REF}
            defaultIconKeywords={["site", "building", "default"]}
            defaultIconLabel={t("itops.sites.heading")}
            iconBackgroundColor={iconBackgroundColor}
            iconColor={iconColor}
            iconDataUrl={iconDataUrl}
            onChange={setIconDataUrl}
            onIconColorChange={setIconColor}
            type="localFiles"
          />
          <div className="connection-icon-palettes">
            <ConnectionIconBackgroundPicker
              color={iconBackgroundColor}
              onChange={setIconBackgroundColor}
            />
          </div>
        </div>
        <Field label={t("itops.sites.nameLabel")} req>
          <TextInput
            value={name}
            placeholder={t("itops.sites.namePlaceholder")}
            onChange={(event) => setName(event.currentTarget.value)}
            autoFocus
          />
        </Field>

      </Sheet>
    </DialogShell>
  );
}
