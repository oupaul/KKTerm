// Curated lucide icon set for Workspaces, plus a renderer with a letter-avatar
// fallback. Kept small and deliberately distinct from the larger Dashboard icon
// catalog so the New Workspace picker stays scannable.

import * as Icons from "lucide-react";

export const WORKSPACE_ICON_NAMES = [
  "Folder",
  "Server",
  "Terminal",
  "Globe",
  "Database",
  "Shield",
  "Briefcase",
  "Home",
  "Cloud",
  "Box",
  "Layers",
  "Rocket",
  "Cpu",
  "Network",
  "Star",
  "Zap",
] as const;

export type WorkspaceIconName = (typeof WORKSPACE_ICON_NAMES)[number];

type LucideIcon = React.ComponentType<{ size?: number }>;

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
  icon,
  name,
  size = 18,
}: {
  icon?: string | null;
  name: string;
  size?: number;
}) {
  const IconCmp = resolveIcon(icon);
  if (IconCmp) {
    return <IconCmp size={size} />;
  }
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className="workspace-icon-letter">
      {letter}
    </span>
  );
}
