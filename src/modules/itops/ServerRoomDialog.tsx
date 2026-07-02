// Create a Server Room in the current Site topology. Server Rooms are stored
// as the rack's `server_room` grouping tag, so creating one also creates its
// first Rack.

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
import { lucideIconRefForName } from "../../lib/iconCatalog";
import { ConnectionIconBackgroundPicker } from "../workspace/connections/ConnectionIconBackgroundPicker";
import { ConnectionIconPicker } from "../workspace/connections/ConnectionIconPicker";
import { useWorkspaceStore } from "../../store";
import type { Site, ServerRoom } from "../../types";
import { useItOpsStore } from "./state";

const DEFAULT_SERVER_ROOM_ICON_REF = lucideIconRefForName("Server");

export function ServerRoomDialog({
  sites,
  defaultSiteId,
  onClose,
  onCreated,
}: {
  sites: Site[];
  defaultSiteId: string;
  onClose: () => void;
  onCreated: (room: ServerRoom) => void;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createServerRoom = useItOpsStore((state) => state.createServerRoom);
  const setRoomIcon = useItOpsStore((state) => state.setRoomIcon);

  const [siteId, setSiteId] = useState(defaultSiteId || sites[0]?.id || "");
  const [serverRoom, setServerRoom] = useState("");
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(null);
  const [iconBackgroundColor, setIconBackgroundColor] = useState<string | null>(null);
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
      const room = await createServerRoom(siteId, trimmedServerRoom);
      // Persist the server room icon on the owning Site.
      if (iconColor || iconDataUrl || iconBackgroundColor) {
        await setRoomIcon(siteId, trimmedServerRoom, { iconColor, iconDataUrl, iconBackgroundColor });
      }
      onCreated(room);
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
        title={t("itops.racks.newServerRoomTitle")}
        ariaLabel={t("itops.racks.newServerRoomTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" onClick={() => void handleSave()} disabled={!canSave}>
                {t("itops.actions.create")}
              </Btn>
            }
          />
        }
      >
        <p className="hg-dlg-help">{t("itops.racks.serverRoomCreateHelp")}</p>
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
      </Sheet>
    </DialogShell>
  );
}
