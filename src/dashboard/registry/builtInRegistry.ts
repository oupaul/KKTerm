import type { ComponentType } from "react";
import type { AccentName, IconName, WidgetPreset } from "../types";
import { AppLauncherBody } from "../widgets/AppLauncherBody";
import { HashBody } from "../widgets/HashBody";
import { SubnetBody } from "../widgets/SubnetBody";
import { QuickToolsBody } from "../widgets/QuickToolsBody";
import { ReportBody } from "../widgets/ReportBody";

export interface BuiltInWidgetEntry {
  id: string;
  titleKey: string;
  summaryKey: string;
  category: string;
  defaultPreset: WidgetPreset;
  defaultAccent: AccentName;
  defaultIcon: IconName;
  defaultSize: { w: number; h: number };
  Body: ComponentType;
}

export const BUILT_IN_WIDGETS: BuiltInWidgetEntry[] = [
  {
    id: "appLauncher",
    titleKey: "appLauncher.title",
    summaryKey: "appLauncher.subtitle",
    category: "shortcut",
    defaultPreset: "panel",
    defaultAccent: "blue",
    defaultIcon: "Wrench",
    defaultSize: { w: 4, h: 3 },
    Body: AppLauncherBody,
  },
  {
    id: "hashCalculator",
    titleKey: "dashboard.hashTitle",
    summaryKey: "dashboard.hashSummary",
    category: "hash",
    defaultPreset: "panel",
    defaultAccent: "indigo",
    defaultIcon: "Hash",
    defaultSize: { w: 3, h: 3 },
    Body: HashBody,
  },
  {
    id: "subnetCalculator",
    titleKey: "dashboard.subnetTitle",
    summaryKey: "dashboard.subnetSummary",
    category: "network",
    defaultPreset: "panel",
    defaultAccent: "teal",
    defaultIcon: "Network",
    defaultSize: { w: 3, h: 3 },
    Body: SubnetBody,
  },
  {
    id: "quickTools",
    titleKey: "dashboard.quickToolsTitle",
    summaryKey: "dashboard.quickToolsSummary",
    category: "quick",
    defaultPreset: "panel",
    defaultAccent: "amber",
    defaultIcon: "Wrench",
    defaultSize: { w: 3, h: 3 },
    Body: QuickToolsBody,
  },
  {
    id: "maintenanceReport",
    titleKey: "dashboard.reportTitle",
    summaryKey: "dashboard.reportSummary",
    category: "report",
    defaultPreset: "panel",
    defaultAccent: "slate",
    defaultIcon: "Doc",
    defaultSize: { w: 3, h: 3 },
    Body: ReportBody,
  },
];

export function getBuiltInWidget(id: string): BuiltInWidgetEntry | undefined {
  return BUILT_IN_WIDGETS.find((w) => w.id === id);
}
