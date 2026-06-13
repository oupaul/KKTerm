import type { FileEntry } from "../../../../types";
import { materialFileIconFileNameForId, materialFileIconIdFor } from "./materialFileIconResolver";

const materialIconModules = import.meta.glob("../../../../assets/file-icons/material-icon-theme/icons/*.svg", {
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

function fileIconFor(entry: FileEntry) {
  const iconId = materialFileIconIdFor(entry);
  return materialIconUrlByFileName[materialFileIconFileNameForId(iconId)] ?? materialIconUrlByFileName["file.svg"];
}

export function FileGlyph({ entry, size = 22 }: { entry: FileEntry; size?: number }) {
  return <img alt="" aria-hidden="true" draggable={false} height={size} src={fileIconFor(entry)} width={size} />;
}
