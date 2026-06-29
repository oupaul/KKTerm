// Create a Server Room in the current Fleet topology. Server Rooms are stored
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
import type { Fleet, Rack, RackShell } from "../../types";
import { useItOpsStore } from "./state";

const DEFAULT_SHELL: RackShell = "black";
const DEFAULT_SERVER_ROOM_ICON_REF = lucideIconRefForName("Server");

export function ServerRoomDialog({
  fleets,
  defaultFleetId,
  onClose,
  onCreated,
}: {
  fleets: Fleet[];
  defaultFleetId: string;
  onClose: () => void;
  onCreated: (rack: Rack) => void;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createRack = useItOpsStore((state) => state.createRack);
  const setRoomIcon = useItOpsStore((state) => state.setRoomIcon);

  const [fleetId, setFleetId] = useState(defaultFleetId || fleets[0]?.id || "");
  const [serverRoom, setServerRoom] = useState("");
  const [rackName, setRackName] = useState("");
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(null);
  const [iconBackgroundColor, setIconBackgroundColor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (fleetId && fleets.some((fleet) => fleet.id === fleetId)) {
      return;
    }
    setFleetId(defaultFleetId || fleets[0]?.id || "");
  }, [defaultFleetId, fleetId, fleets]);

  const trimmedServerRoom = serverRoom.trim();
  const trimmedRackName = rackName.trim();
  const canSave = Boolean(fleetId && trimmedServerRoom && trimmedRackName && !busy);

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setBusy(true);
    try {
      const rack = await createRack(fleetId, {
        name: trimmedRackName,
        serverRoom: trimmedServerRoom,
        rackGroup: "",
        shell: DEFAULT_SHELL,
        heightU: 42,
      });
      // Persist the server room icon on the owning Fleet.
      if (iconDataUrl || iconBackgroundColor) {
        await setRoomIcon(fleetId, trimmedServerRoom, { iconDataUrl, iconBackgroundColor });
      }
      onCreated(rack);
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
            iconDataUrl={iconDataUrl}
            onChange={setIconDataUrl}
            type="localFiles"
          />
          <ConnectionIconBackgroundPicker
            color={iconBackgroundColor}
            onChange={setIconBackgroundColor}
          />
        </div>
        <Field label={t("itops.racks.serverRoomFleetLabel")} req>
          <Select
            value={fleetId}
            onChange={(event) => setFleetId(event.currentTarget.value)}
            options={fleets.map((fleet) => ({ value: fleet.id, label: fleet.name }))}
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
        <Field
          label={t("itops.racks.firstRackLabel")}
          hint={t("itops.racks.firstRackHint")}
          req
        >
          <TextInput
            value={rackName}
            placeholder={t("itops.racks.namePlaceholder")}
            onChange={(event) => setRackName(event.currentTarget.value)}
          />
        </Field>
      </Sheet>
    </DialogShell>
  );
}
