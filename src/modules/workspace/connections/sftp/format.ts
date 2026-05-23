import type { SftpTransferResult } from "../../../../lib/tauri";

export function formatTransferResult(result: SftpTransferResult) {
  const parts = [`${result.files} files`];
  if (result.folders > 0) {
    parts.push(`${result.folders} folders`);
  }
  parts.push(formatFileSize(result.bytes));
  return parts.join(" | ");
}

export function joinRemotePath(basePath: string, childName: string) {
  if (!basePath || basePath === ".") {
    return childName;
  }
  if (basePath.endsWith("/")) {
    return `${basePath}${childName}`;
  }
  return `${basePath}/${childName}`;
}

export function joinLocalPath(basePath: string, childName: string) {
  if (!basePath) {
    return childName;
  }
  if (basePath.endsWith("\\") || basePath.endsWith("/")) {
    return `${basePath}${childName}`;
  }
  return `${basePath}\\${childName}`;
}

export function formatFileSize(size?: number) {
  if (size === undefined) {
    return "-";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatRemoteTime(timestamp?: number) {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

export function formatMode(mode?: number) {
  if (mode === undefined) {
    return "";
  }

  return (mode & 0o7777).toString(8).padStart(3, "0");
}
