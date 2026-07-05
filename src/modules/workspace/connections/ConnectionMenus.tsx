import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConnectionTypeGlyph } from "./ConnectionGlyph";
import type { ConnectionType } from "../../../types";

export function AddConnectionMenu({
  onImportRequested,
  onSelectType,
}: {
  onImportRequested: () => void;
  onSelectType: (connectionType: ConnectionType) => void;
}) {
  const { t } = useTranslation();
  const connectionTypeOptions: Array<{
    type: ConnectionType;
    title: string;
  }> = [
    {
      type: "local",
      title: t("connections.localTerminal"),
    },
    {
      type: "ssh",
      title: t("connections.ssh"),
    },
    {
      type: "telnet",
      title: t("connections.telnet"),
    },
    {
      type: "serial",
      title: t("connections.serial"),
    },
    {
      type: "url",
      title: t("connections.url"),
    },
    {
      type: "rdp",
      title: t("connections.rdp"),
    },
    {
      type: "vnc",
      title: t("connections.vnc"),
    },
    {
      type: "ftp",
      title: t("connections.ftp"),
    },
    {
      type: "localFiles",
      title: t("connections.localFiles"),
    },
    {
      type: "fileView",
      title: t("connections.fileView"),
    },
  ];

  return (
    <div className="add-connection-menu" role="menu" aria-label={t("connections.addConnection")}>
      {connectionTypeOptions.map((option) => (
        <button key={option.type} onClick={() => onSelectType(option.type)} role="menuitem" type="button">
          <ConnectionTypeGlyph className="menu-item-icon" size={15} type={option.type} />
          <span className="connection-main">
            <strong>{option.title}</strong>
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
