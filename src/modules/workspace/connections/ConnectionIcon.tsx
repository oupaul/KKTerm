import type { CSSProperties } from "react";
import type { ConnectionType } from "../../../types";
import rdpIcon from "../../../assets/connection-icons/rdp.png";
import serialIcon from "../../../assets/connection-icons/serial.png";
import sshIcon from "../../../assets/connection-icons/ssh.png";
import powershellIcon from "../../../assets/connection-icons/powershell.svg";
import powershell5Icon from "../../../assets/connection-icons/powershell5.svg";
import telnetIcon from "../../../assets/connection-icons/telnet.png";
import terminalIcon from "../../../assets/connection-icons/terminal.png";
import urlIcon from "../../../assets/connection-icons/url.png";
import vncIcon from "../../../assets/connection-icons/vnc.png";
import wslIcon from "../../../assets/connection-icons/wsl.png";
import { fileBrowserConnectionIconSrc } from "./fileBrowserConnectionIcons";

export const CONNECTION_ICON_SRC: Record<ConnectionType, string> = {
  local: terminalIcon,
  ssh: sshIcon,
  telnet: telnetIcon,
  serial: serialIcon,
  url: urlIcon,
  rdp: rdpIcon,
  vnc: vncIcon,
  ftp: fileBrowserConnectionIconSrc("ftp"),
  localFiles: fileBrowserConnectionIconSrc("localFiles"),
};

export const PREDEFINED_CONNECTION_ICON_TYPES: ConnectionType[] = [
  "local",
  "ssh",
  "telnet",
  "serial",
  "url",
  "rdp",
  "vnc",
  "ftp",
  "localFiles",
];

export function connectionIconSrcForConnection({
  iconDataUrl,
  localShell,
  type,
}: {
  iconDataUrl?: string | null;
  localShell?: string;
  type: ConnectionType;
}) {
  if (iconDataUrl) {
    return iconDataUrl;
  }
  if (type === "local" && localShell === "wsl.exe") {
    return wslIcon;
  }
  if (type === "local" && localShell === "powershell.exe") {
    return powershell5Icon;
  }
  if (type === "local" && localShell === "pwsh.exe") {
    return powershellIcon;
  }
  if (type === "ftp") {
    return fileBrowserConnectionIconSrc("ftp");
  }
  if (type === "localFiles") {
    return fileBrowserConnectionIconSrc("localFiles");
  }
  return CONNECTION_ICON_SRC[type];
}

export function ConnectionIcon({
  className,
  iconBackgroundColor,
  iconDataUrl,
  localShell,
  size = 16,
  type,
}: {
  className?: string;
  iconBackgroundColor?: string | null;
  iconDataUrl?: string | null;
  localShell?: string;
  size?: number;
  type: ConnectionType;
}) {
  const src = connectionIconSrcForConnection({ iconDataUrl, localShell, type });
  const hasBackground = Boolean(iconBackgroundColor);
  const shellSize = hasBackground ? size + 6 : size;
  const style = {
    "--connection-icon-bg": iconBackgroundColor ?? "transparent",
    "--connection-icon-size": `${size}px`,
    "--connection-icon-shell-size": `${shellSize}px`,
  } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={["connection-icon-shell", hasBackground ? "has-background" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <img
        alt=""
        className="connection-icon-image"
        draggable={false}
        height={size}
        src={src}
        width={size}
      />
    </span>
  );
}
