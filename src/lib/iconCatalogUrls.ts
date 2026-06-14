import { materialIconFileNameForId, materialIconIdFromRef } from "./iconCatalog";

const materialIconModules = import.meta.glob("../assets/file-icons/material-icon-theme/icons/*.svg", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const materialIconUrlByFileName = Object.fromEntries(
  Object.entries(materialIconModules).map(([path, url]) => {
    const fileName = path.slice(path.lastIndexOf("/") + 1);
    return [fileName, url];
  }),
);

export function materialIconUrlForId(iconId: string) {
  const fileName = materialIconFileNameForId(iconId);
  return fileName ? materialIconUrlByFileName[fileName] ?? null : null;
}

export function materialIconRefToUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const iconId = materialIconIdFromRef(value);
  return iconId ? materialIconUrlForId(iconId) : null;
}
