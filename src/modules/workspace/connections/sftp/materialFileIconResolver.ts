import manifest from "../../../../assets/file-icons/material-icon-theme/manifest.json";
import type { FileEntry } from "../../../../types";

type IconManifest = {
  file: string;
  folder: string;
  iconFiles: Record<string, string>;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  folderNames: Record<string, string>;
};

const materialIconManifest = manifest as IconManifest;

function normalizedRecord(record: Record<string, string>) {
  const normalized: Record<string, string> = {};
  for (const [key, iconId] of Object.entries(record)) {
    normalized[key.toLowerCase()] = iconId;
  }
  return normalized;
}

const fileNames = normalizedRecord(materialIconManifest.fileNames);
const folderNames = normalizedRecord(materialIconManifest.folderNames);
const fileExtensionEntries = Object.entries(normalizedRecord(materialIconManifest.fileExtensions)).sort(
  ([left], [right]) => right.length - left.length || left.localeCompare(right),
);

function matchesExtension(fileName: string, extension: string) {
  return fileName === extension || fileName.endsWith(`.${extension}`);
}

export function materialFileIconIdFor(file: Pick<FileEntry, "name" | "kind">) {
  const normalizedName = file.name.toLowerCase();

  if (file.kind === "folder") {
    return folderNames[normalizedName] ?? materialIconManifest.folder;
  }

  const exactFileNameIcon = fileNames[normalizedName];
  if (exactFileNameIcon) {
    return exactFileNameIcon;
  }

  for (const [extension, iconId] of fileExtensionEntries) {
    if (matchesExtension(normalizedName, extension)) {
      return iconId;
    }
  }

  return materialIconManifest.file;
}

export function materialFileIconFileNameForId(iconId: string) {
  return materialIconManifest.iconFiles[iconId] ?? `${iconId}.svg`;
}
