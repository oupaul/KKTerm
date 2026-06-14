// Curated lucide icon set for Workspaces, plus a renderer with a letter-avatar
// fallback. Kept small and deliberately distinct from the larger Dashboard icon
// catalog so the New Workspace picker stays scannable.

import type { CSSProperties } from "react";
import * as Icons from "lucide-react";
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
  size = 18,
}: {
  color?: string | null;
  icon?: string | null;
  name: string;
  size?: number;
}) {
  const style = color ? ({ color } satisfies CSSProperties) : undefined;
  const materialIconUrl = materialIconRefToUrl(icon);
  if (materialIconUrl) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className="workspace-material-icon"
        draggable={false}
        height={size}
        src={materialIconUrl}
        width={size}
      />
    );
  }
  const IconCmp = resolveIcon(icon);
  if (IconCmp) {
    return <IconCmp size={size} style={style} />;
  }
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className="workspace-icon-letter" style={style}>
      {letter}
    </span>
  );
}
