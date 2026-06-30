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
  "ShelvingUnit",
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

/**
 * Whether a Workspace icon can be recolored by the foreground palette. Brand
 * and Material artwork render as `<img>` and ignore `--workspace-icon-color`;
 * Lucide glyphs and the letter-avatar fallback honor it.
 */
export function workspaceIconSupportsForegroundColor(icon?: string | null) {
  return !brandIconRefToUrl(icon) && !materialIconRefToUrl(icon);
}

function resolveIcon(name?: string | null): LucideIcon | null {
  if (!name) {
    return null;
  }
  const lookup = Icons as unknown as Record<string, LucideIcon | undefined>;
  return lookup[name] ?? null;
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

/**
 * Render a Workspace's icon by lucide name, falling back to a letter avatar
 * (the Workspace name's first character) when no icon is set or the name is
 * unknown.
 */
export function WorkspaceIcon({
  backgroundColor,
  color,
  icon,
  name,
  shellSize,
  size = 18,
}: {
  backgroundColor?: string | null;
  color?: string | null;
  icon?: string | null;
  name: string;
  shellSize?: number;
  size?: number;
}) {
  const hasBackground = Boolean(backgroundColor);
  const resolvedShellSize = shellSize ?? (hasBackground ? size + 6 : size);
  const style = {
    "--workspace-icon-bg": backgroundColor ?? "transparent",
    "--workspace-icon-color": color ?? (hasBackground
      ? iconForegroundForBackground(backgroundColor)
      : "var(--accent)"),
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
