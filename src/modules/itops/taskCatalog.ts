import type { TFunction } from "i18next";
import type { ItopsTask, TaskOperatingSystem } from "../../types";

export const TASK_OPERATING_SYSTEMS: readonly TaskOperatingSystem[] = [
  "any",
  "linux",
  "macos",
  "windows",
  "ciscoIos",
  "ciscoNxos",
  "fortiOs",
  "junos",
  "aristaEos",
];

const BUILTIN_CATEGORIES = new Set(["identity", "uptime", "resources", "interfaces", "routing", "logs"]);

export function taskOsLabel(t: TFunction, os: TaskOperatingSystem): string {
  return t(`itops.tasks.applicableOs.${os}`);
}

export function taskDisplayName(t: TFunction, task: ItopsTask): string {
  if (!task.builtInKey) return task.name;
  const category = task.builtInKey.split(".").pop() ?? "";
  const os = task.applicableOs[0] ?? "any";
  if (!BUILTIN_CATEGORIES.has(category)) return task.name;
  return `${taskOsLabel(t, os)} · ${t(`itops.tasks.catalog.${category}`)}`;
}

export function normalizeTaskOperatingSystems(values: TaskOperatingSystem[]): TaskOperatingSystem[] {
  if (values.length === 0 || values.includes("any")) return ["any"];
  return [...new Set(values)];
}
