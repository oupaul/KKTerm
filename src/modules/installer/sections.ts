// Visibility + presentation metadata for the Installer Helper category sidebar.
//
// The UI renders by these explicit per-section id lists, NOT by the catalog's
// `category` field, so a recipe added to installer/catalog.v1.json stays
// invisible until its id is listed here. See docs/ADR/0008 "Adding a recipe
// (developer checklist)".
//
// Each section also carries a lucide glyph and a CSS tint variable (defined in
// src/styles/colorSchemes.css) so the rail rows match the house-style mockup.

import { Bot, Box, Code2, Cpu, Globe, Wrench, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface InstallerSection {
  /// Stable id; also the `sec:<id>` sidebar filter value.
  id: string;
  /// i18n key for the section / filter label.
  titleKey: string;
  /// Catalog recipe ids in this section, in display order.
  ids: string[];
  Icon: LucideIcon;
  /// CSS custom property holding the section tint.
  tintVar: string;
}

// NOTE: within each section, `ids` is declared immediately after `titleKey`.
// Source-grep guards in tests/ assert `titleKey: "installer.section.X", ids:
// [...]` adjacency, so keep these two fields together when editing.
export const INSTALLER_CATEGORY_SECTIONS: InstallerSection[] = [
  {
    id: "essentials",
    titleKey: "installer.section.essentials",
    ids: ["winget", "node-bundle", "python-bundle", "git"],
    Icon: Box,
    tintVar: "--installer-tint-essentials",
  },
  {
    id: "aiAgents",
    titleKey: "installer.section.aiAgents",
    ids: [
      "claude-code-cli",
      "codex-cli",
      "antigravity-cli",
      "opencode",
      "openclaw",
      "codex-desktop",
      "claude-desktop",
      "hermes-agent",
    ],
    Icon: Bot,
    tintVar: "--installer-tint-ai-agents",
  },
  {
    id: "aiPlatforms",
    titleKey: "installer.section.aiPlatforms",
    ids: ["ollama", "n8n", "open-webui", "flowise", "langflow"],
    Icon: Cpu,
    tintVar: "--installer-tint-ai-platforms",
  },
  {
    id: "development",
    titleKey: "installer.section.development",
    ids: ["vscode", "cursor", "docker-desktop", "bruno", "wsl", "rustup"],
    Icon: Code2,
    tintVar: "--installer-tint-development",
  },
  {
    id: "windowsPowerUser",
    titleKey: "installer.section.windowsPowerUser",
    ids: ["powershell-7", "powertoys", "sysinternals-suite", "everything", "ditto"],
    Icon: Zap,
    tintVar: "--installer-tint-power",
  },
  {
    id: "remoteAccess",
    titleKey: "installer.section.remoteAccess",
    ids: ["tailscale", "rustdesk"],
    Icon: Globe,
    tintVar: "--installer-tint-remote",
  },
  {
    id: "utilities",
    titleKey: "installer.section.utilities",
    ids: [
      "notepadpp",
      "nssm",
      "vcxsrv",
      "ripgrep",
      "jq",
      "fzf",
      "coreutils",
      "7zip",
      "sharex",
      "ffmpeg",
      "excalidraw",
      "bentopdf",
    ],
    Icon: Wrench,
    tintVar: "--installer-tint-utilities",
  },
];

/// All recipe ids visible in the Installer Helper, across every section.
export const INSTALLER_VISIBLE_IDS = new Set(
  INSTALLER_CATEGORY_SECTIONS.flatMap((section) => section.ids),
);
