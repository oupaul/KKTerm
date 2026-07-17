import type { RdpDriveSelection } from "../../../../types";

export function normalizeRdpDrive(value: string) {
  const match = value.trim().match(/^([a-z]):(?:[\\/]*)$/i);
  return match ? `${match[1].toUpperCase()}:` : null;
}

export function normalizeRdpDriveSelection(
  selection: RdpDriveSelection | null | undefined,
): RdpDriveSelection {
  if (!selection || selection.mode !== "selected") {
    return { mode: "all" };
  }
  const drives = Array.from(
    new Set(selection.drives.map(normalizeRdpDrive).filter((drive): drive is string => Boolean(drive))),
  ).sort();
  return { mode: "selected", drives };
}

export function rdpDriveSelectionSummary(selection: RdpDriveSelection) {
  const normalized = normalizeRdpDriveSelection(selection);
  return normalized.mode === "all" ? null : normalized.drives.join(", ");
}

export function normalizeRdpSharedLocalFolders(
  folders: string[] | null | undefined,
  legacyFolder?: string | null,
) {
  const values = folders && folders.length > 0 ? folders : legacyFolder ? [legacyFolder] : [];
  return Array.from(new Set(values.map((folder) => folder.trim()).filter(Boolean)));
}

export function parseRdpSharedLocalFolders(
  value: FormDataEntryValue | null,
  fallback: string[],
) {
  if (typeof value !== "string" || !value) {
    return normalizeRdpSharedLocalFolders(fallback);
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? normalizeRdpSharedLocalFolders(parsed.filter((folder): folder is string => typeof folder === "string"))
      : normalizeRdpSharedLocalFolders(fallback);
  } catch {
    return normalizeRdpSharedLocalFolders(fallback);
  }
}

export function parseRdpDriveSelection(value: FormDataEntryValue | null, fallback: RdpDriveSelection) {
  if (typeof value !== "string" || !value) {
    return normalizeRdpDriveSelection(fallback);
  }
  try {
    return normalizeRdpDriveSelection(JSON.parse(value) as RdpDriveSelection);
  } catch {
    return normalizeRdpDriveSelection(fallback);
  }
}
