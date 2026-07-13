import { Download } from "../../../lib/reicon";
import { useTranslation } from "react-i18next";
import { ConnectionTypeGlyph } from "./ConnectionGlyph";
import type { ConnectionType } from "../../../types";

export const CONNECTION_CREATION_OPTIONS = [
  { type: "local", labelKey: "connections.localTerminal" },
  { type: "ssh", labelKey: "connections.ssh" },
  { type: "telnet", labelKey: "connections.telnet" },
  { type: "serial", labelKey: "connections.serial" },
  { type: "url", labelKey: "connections.url" },
  { type: "rdp", labelKey: "connections.rdp" },
  { type: "vnc", labelKey: "connections.vnc" },
  { type: "ftp", labelKey: "connections.ftp" },
  { type: "localFiles", labelKey: "connections.localFiles" },
  { type: "fileView", labelKey: "connections.fileView" },
] as const satisfies ReadonlyArray<{
  type: ConnectionType;
  labelKey: string;
}>;

export function AddConnectionMenu({
  onImportRequested,
  onSelectType,
}: {
  onImportRequested: () => void;
  onSelectType: (connectionType: ConnectionType) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="add-connection-menu" role="menu" aria-label={t("connections.addConnection")}>
      {CONNECTION_CREATION_OPTIONS.map((option) => (
        <button key={option.type} onClick={() => onSelectType(option.type)} role="menuitem" type="button">
          <ConnectionTypeGlyph className="menu-item-icon" size={15} type={option.type} />
          <span className="connection-main">
            <strong>{t(option.labelKey)}</strong>
          </span>
        </button>
      ))}
      <div className="add-connection-menu-separator" aria-hidden="true" />
      <button onClick={onImportRequested} role="menuitem" type="button">
        <Download className="menu-item-icon" size={15} />
        <span className="connection-main">
          <strong>{t("connections.import.tileTitle")}</strong>
        </span>
      </button>
    </div>
  );
}
