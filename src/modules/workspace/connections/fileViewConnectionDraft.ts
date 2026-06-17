import { materialIconRefForId } from "../../../lib/iconCatalog";
import { materialFileIconIdFor } from "./sftp/materialFileIconResolver";
import type { CreateConnectionRequest } from "../../../types";

function fileNameFromPath(path: string) {
  const parts = path.trim().replace(/[\\/]+$/g, "").split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function buildFileViewConnectionDraftFromPath(
  filePath: string,
  options: { workspaceId?: string; folderId?: string } = {},
): CreateConnectionRequest & { iconDataUrl: string } {
  const name = fileNameFromPath(filePath) || filePath;
  const iconId = materialFileIconIdFor({ name, kind: "file" });
  const draft: CreateConnectionRequest & { iconDataUrl: string } = {
    name,
    host: "localhost",
    user: "local",
    type: "fileView",
    localStartupDirectory: filePath,
    iconDataUrl: materialIconRefForId(iconId),
  };
  if (options.workspaceId) {
    draft.workspaceId = options.workspaceId;
  }
  if (options.folderId) {
    draft.folderId = options.folderId;
  }
  return draft;
}
