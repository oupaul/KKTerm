import type { ComponentType, CSSProperties } from "react";
import * as Icons from "lucide-react";
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
import { lucideIconNameFromRef } from "../../../lib/iconCatalog";
import { brandIconRefToUrl } from "../../../lib/brandIconUrls";
import { materialIconRefToUrl } from "../../../lib/iconCatalogUrls";
import { osIconRefToUrl } from "../../../lib/osIconUrls";
import { fileBrowserConnectionIconSrc } from "./fileBrowserConnectionIcons";
import documentIcon from "../../../assets/file-icons/material-icon-theme/icons/document.svg";

type LucideIcon = ComponentType<{ size?: number; style?: CSSProperties }>;

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
  fileView: documentIcon,
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
  "fileView",
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
  const MaterialOrImage = brandIconRefToUrl(src) ?? osIconRefToUrl(src) ?? materialIconRefToUrl(src) ?? src;
  const lucideIconName = lucideIconNameFromRef(src);
  const LucideIcon = lucideIconName
    ? (Icons as unknown as Record<string, LucideIcon | undefined>)[lucideIconName]
    : null;
  const hasBackground = Boolean(iconBackgroundColor);
  const shellSize = hasBackground ? size + 6 : size;
  const style = {
    "--connection-icon-bg": iconBackgroundColor ?? "transparent",
    "--connection-icon-fg": hasBackground
      ? iconForegroundForBackground(iconBackgroundColor)
      : "currentColor",
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
      {LucideIcon ? (
        <LucideIcon size={size} />
      ) : (
        <img
          alt=""
          className="connection-icon-image"
          draggable={false}
          height={size}
          src={MaterialOrImage}
          width={size}
        />
      )}
    </span>
  );
}

function iconForegroundForBackground(color?: string | null) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) {
    return "var(--surface)";
  }
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.72 ? "var(--text)" : "var(--surface)";
}
