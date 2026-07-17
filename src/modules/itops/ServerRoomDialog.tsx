// Create or edit a first-class Server Room in the current Site topology.

import { useEffect, useState } from "react";
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
import { reiconIconRefForName } from "../../lib/iconCatalog";
import { ConnectionIconBackgroundPicker } from "../workspace/connections/ConnectionIconBackgroundPicker";
import { ConnectionIconPicker } from "../workspace/connections/ConnectionIconPicker";
import { useWorkspaceStore } from "../../store";
import type { Site, ServerRoom } from "../../types";
import {
  ISO_FLOOR_COLORS,
  sanitizeIsoFloor,
  type IsoFloorColor,
} from "./siteTreeState";
import { useItOpsStore } from "./state";

const DEFAULT_SERVER_ROOM_ICON_REF = reiconIconRefForName("ServerSquare");

export function ServerRoomDialog({
  sites,
  defaultSiteId,
  room,
  duplicateOf,
  duplicateName,
  onClose,
  onSaved,
}: {
  sites: Site[];
  defaultSiteId: string;
  room?: ServerRoom | null;
  duplicateOf?: ServerRoom | null;
  duplicateName?: string;
  onClose: () => void;
  onSaved: (room: ServerRoom) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!room;
  const isDuplicate = !!duplicateOf;
  const sourceRoom = room ?? duplicateOf;
  const isProperties = isEdit || isDuplicate;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createServerRoom = useItOpsStore((state) => state.createServerRoom);
  const updateServerRoom = useItOpsStore((state) => state.updateServerRoom);
  const duplicateServerRoom = useItOpsStore((state) => state.duplicateServerRoom);
  const setRoomIcon = useItOpsStore((state) => state.setRoomIcon);
  const initialSiteId = sourceRoom?.siteId ?? (defaultSiteId || sites[0]?.id || "");
  const existingIcon = sourceRoom
    ? sites.find((site) => site.id === sourceRoom.siteId)?.roomIcons?.[sourceRoom.name]
    : undefined;

  const [siteId, setSiteId] = useState(initialSiteId);
  const [serverRoom, setServerRoom] = useState(duplicateName ?? sourceRoom?.name ?? "");
  const [floorColor, setFloorColor] = useState<IsoFloorColor>(
    sanitizeIsoFloor(sourceRoom?.floorColor),
  );
  const [iconColor, setIconColor] = useState<string | null>(existingIcon?.iconColor ?? null);
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(existingIcon?.iconDataUrl ?? null);
  const [iconBackgroundColor, setIconBackgroundColor] = useState<string | null>(
    existingIcon?.iconBackgroundColor ?? null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (siteId && sites.some((site) => site.id === siteId)) {
      return;
    }
    setSiteId(defaultSiteId || sites[0]?.id || "");
  }, [defaultSiteId, siteId, sites]);

  const trimmedServerRoom = serverRoom.trim();
  const canSave = Boolean(siteId && trimmedServerRoom && !busy);

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setBusy(true);
    try {
      const saved = isDuplicate
        ? await duplicateServerRoom(
            siteId,
            duplicateOf!.id,
            trimmedServerRoom,
            floorColor,
          )
        : isEdit
          ? await updateServerRoom(siteId, room!.id, trimmedServerRoom, floorColor)
          : await createServerRoom(siteId, trimmedServerRoom, floorColor);
      const icon = iconColor || iconDataUrl || iconBackgroundColor
        ? { iconColor, iconDataUrl, iconBackgroundColor }
        : null;
      await setRoomIcon(saved.siteId, saved.name, icon);
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
        width={460}
        title={isProperties ? t("common.properties") : t("itops.racks.newServerRoomTitle")}
        ariaLabel={isProperties ? t("common.properties") : t("itops.racks.newServerRoomTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" onClick={() => void handleSave()} disabled={!canSave}>
                {isProperties ? t("itops.actions.save") : t("itops.actions.create")}
              </Btn>
            }
          />
        }
      >
        {isProperties ? null : <p className="hg-dlg-help">{t("itops.racks.serverRoomCreateHelp")}</p>}
        <div className="connection-type-summary">
          <ConnectionIconPicker
            customIconDataUrls={[]}
            defaultIconDataUrl={DEFAULT_SERVER_ROOM_ICON_REF}
            defaultIconKeywords={["server", "room", "default"]}
            defaultIconLabel={t("itops.racks.addServerRoom")}
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
        <Field label={t("itops.racks.serverRoomSiteLabel")} req>
          <Select
            value={siteId}
            disabled={isProperties}
            onChange={(event) => setSiteId(event.currentTarget.value)}
            options={sites.map((site) => ({ value: site.id, label: site.name }))}
          />
        </Field>
        <Field label={t("itops.racks.serverRoomNameLabel")} req>
          <TextInput
            value={serverRoom}
            placeholder={t("itops.racks.serverRoomPlaceholder")}
            onChange={(event) => setServerRoom(event.currentTarget.value)}
            autoFocus
          />
        </Field>
        <Field label={t("itops.floorPlan.floorColorLabel")}>
          <div className="server-room-floor-options" role="group">
            {ISO_FLOOR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="server-room-floor-option"
                data-active={floorColor === color}
                aria-pressed={floorColor === color}
                onClick={() => setFloorColor(color)}
              >
                <span className="server-room-floor-swatch" data-floor={color} aria-hidden="true" />
                <span>{t(`itops.floorPlan.floorColor.${color}`)}</span>
              </button>
            ))}
          </div>
        </Field>
      </Sheet>
    </DialogShell>
  );
}
