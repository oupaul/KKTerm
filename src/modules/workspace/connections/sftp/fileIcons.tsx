import i18next from "../../../../i18n/config";
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

function fileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return "";
  }
  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

function fileIconFor(file: FileEntry) {
  const iconId = materialFileIconIdFor(file);
  return materialIconUrlByFileName[materialFileIconFileNameForId(iconId)] ?? materialIconUrlByFileName["file.svg"];
}

function fileIconLabel(file: FileEntry) {
  if (file.kind === "folder") {
    return i18next.t("sftp.folder");
  }
  if (file.kind === "symlink") {
    return i18next.t("sftp.symlink");
  }
  const extension = fileExtension(file.name);
  return extension ? i18next.t("sftp.fileTypeLabel", { ext: extension.toUpperCase() }) : i18next.t("sftp.file");
}

export function FileTypeIcon({ file }: { file: FileEntry }) {
  return (
    <span
      aria-label={fileIconLabel(file)}
      className={`file-type-icon file-type-icon-${file.kind}`}
      role="img"
    >
      <img alt="" draggable={false} src={fileIconFor(file)} />
    </span>
  );
}
