export type CatalogGroup = "builtIn" | "custom";

export const CATALOG_GROUPS = ["builtIn", "custom"] as const;

export function getCatalogGroup(entry: { isCustom: false }): "builtIn";
export function getCatalogGroup(entry: { isCustom: true }): "custom";
export function getCatalogGroup(entry: { isCustom: boolean }): CatalogGroup;
export function getCatalogGroup(entry: { isCustom: boolean }): CatalogGroup {
  return entry.isCustom ? "custom" : "builtIn";
}
