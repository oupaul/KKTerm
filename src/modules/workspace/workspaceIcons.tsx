// Curated lucide icon set for Workspaces, plus a renderer with a letter-avatar
// fallback. Kept small and deliberately distinct from the larger Dashboard icon
// catalog so the New Workspace picker stays scannable.

import type { CSSProperties, ReactNode } from "react";
import * as Icons from "lucide-react";
import { brandIconRefToUrl } from "../../lib/brandIconUrls";
import { materialIconRefToUrl } from "../../lib/iconCatalogUrls";

export const WORKSPACE_ICON_NAMES = [
  "Folder",
  "FolderOpen",
  "Server",
  "Terminal",
  "Command",
  "Globe",
  "Database",
  "Shield",
  "KeyRound",
  "Lock",
  "Briefcase",
  "Home",
  "Cloud",
  "Box",
  "Boxes",
  "Package",
  "Archive",
  "Layers",
  "Rocket",
  "Cpu",
  "Activity",
  "Gauge",
  "Network",
  "Route",
  "Workflow",
  "GitBranch",
  "Radio",
  "Monitor",
  "Laptop",
  "HardDrive",
  "FileCode",
  "Code2",
  "Braces",
  "Wrench",
  "Settings",
  "Building2",
  "Factory",
  "Warehouse",
  "Landmark",
  "Star",
  "Zap",
] as const;

export type WorkspaceIconName = (typeof WORKSPACE_ICON_NAMES)[number];

type LucideIcon = React.ComponentType<{ size?: number; style?: CSSProperties }>;

function resolveIcon(name?: string | null): LucideIcon | null {
  if (!name) {
    return null;
  }
  const lookup = Icons as unknown as Record<string, LucideIcon | undefined>;
  return lookup[name] ?? null;
}

/**
 * Render a Workspace's icon by lucide name, falling back to a letter avatar
 * (the Workspace name's first character) when no icon is set or the name is
 * unknown.
 */
export function WorkspaceIcon({
  color,
  icon,
  name,
  shellSize,
  size = 18,
}: {
  color?: string | null;
  icon?: string | null;
  name: string;
  shellSize?: number;
  size?: number;
}) {
  const hasBackground = Boolean(color);
  const resolvedShellSize = shellSize ?? (hasBackground ? size + 6 : size);
  const style = {
    "--workspace-icon-bg": color ?? "transparent",
    "--workspace-icon-color": hasBackground ? "var(--surface)" : "var(--accent)",
    "--workspace-icon-size": `${size}px`,
    "--workspace-icon-shell-size": `${resolvedShellSize}px`,
  } as CSSProperties;
  const imageIconUrl = brandIconRefToUrl(icon) ?? materialIconRefToUrl(icon);
  let content: ReactNode;
  if (imageIconUrl) {
    content = (
      <img
        alt=""
        aria-hidden="true"
        className="workspace-material-icon"
        draggable={false}
        height={size}
        src={imageIconUrl}
        width={size}
      />
    );
  } else {
    const IconCmp = resolveIcon(icon);
    if (IconCmp) {
      content = <IconCmp size={size} />;
    } else {
      const letter = name.trim().charAt(0).toUpperCase() || "?";
      content = (
        <span aria-hidden="true" className="workspace-icon-letter">
          {letter}
        </span>
      );
    }
  }
  return (
    <span
      aria-hidden="true"
      className={hasBackground ? "workspace-icon-shell has-background" : "workspace-icon-shell"}
      style={style}
    >
      {content}
    </span>
  );
}
