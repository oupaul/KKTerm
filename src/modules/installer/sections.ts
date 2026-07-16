// Presentation metadata for the Install Helper category sidebar. Recipe
// visibility and membership live in installer/catalog.v1.json through each
// recipe's required `section`; this file only owns section order, labels, icons,
// and tints.

import {
  Bot,
  Box,
  Boxes,
  Briefcase,
  Brush,
  Code2,
  Cpu,
  Globe,
  Video,
  Wrench,
  Zap,
} from "../../lib/reicon";
import type { LucideIcon } from "../../lib/reicon";
import type { RecipeSection } from "./types";

export type InstallerSectionId = Exclude<RecipeSection, "internal">;

export interface InstallerSection {
  /// Stable id; also the `sec:<id>` sidebar filter value.
  id: InstallerSectionId;
  /// i18n key for the section / filter label.
  titleKey: string;
  Icon: LucideIcon;
  /// CSS custom property holding the section tint.
  tintVar: string;
}

export const INSTALLER_CATEGORY_SECTIONS: InstallerSection[] = [
  {
    id: "essentials",
    titleKey: "installer.section.essentials",
    Icon: Box,
    tintVar: "--installer-tint-essentials",
  },
  {
    id: "aiAgents",
    titleKey: "installer.section.aiAgents",
    Icon: Bot,
    tintVar: "--installer-tint-ai-agents",
  },
  {
    id: "aiPlatforms",
    titleKey: "installer.section.aiPlatforms",
    Icon: Cpu,
    tintVar: "--installer-tint-ai-platforms",
  },
  {
    id: "development",
    titleKey: "installer.section.development",
    Icon: Code2,
    tintVar: "--installer-tint-development",
  },
  {
    id: "design",
    titleKey: "installer.section.design",
    Icon: Brush,
    tintVar: "--installer-tint-design",
  },
  {
    id: "productivity",
    titleKey: "installer.section.productivity",
    Icon: Briefcase,
    tintVar: "--installer-tint-productivity",
  },
  {
    id: "multimedia",
    titleKey: "installer.section.multimedia",
    Icon: Video,
    tintVar: "--installer-tint-multimedia",
  },
  {
    id: "windowsPowerUser",
    titleKey: "installer.section.windowsPowerUser",
    Icon: Zap,
    tintVar: "--installer-tint-power",
  },
  {
    id: "remoteAccess",
    titleKey: "installer.section.remoteAccess",
    Icon: Globe,
    tintVar: "--installer-tint-remote",
  },
  {
    id: "packageManagers",
    titleKey: "installer.section.packageManagers",
    Icon: Boxes,
    tintVar: "--installer-tint-package-managers",
  },
  {
    id: "utilities",
    titleKey: "installer.section.utilities",
    Icon: Wrench,
    tintVar: "--installer-tint-utilities",
  },
];
