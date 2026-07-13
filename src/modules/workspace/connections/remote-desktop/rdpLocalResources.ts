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
