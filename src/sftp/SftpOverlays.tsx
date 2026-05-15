import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../app/ConfirmDialog";
import { formatFileSize, formatRemoteTime } from "./format";
import type {
  FilePropertiesState,
  RemoteDeleteRequest,
  SftpContextMenuState,
  TransferConflictDecision,
  TransferConflictState,
} from "./types";

export function NewRemoteFolderDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (name: string) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    onCreate(draft);
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("sftp.newRemoteFolder")}
        aria-modal="true"
        className="connection-dialog sftp-folder-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <h2>{t("sftp.createFolder")}</h2>
          </div>
        </header>
        <label>
          <span>{t("sftp.newRemoteFolder")}</span>
          <input
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
              }
            }}
            ref={inputRef}
            value={draft}
          />
        </label>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={submit} type="button">
            {t("sftp.createFolder")}
          </button>
          <button className="toolbar-button" onClick={onCancel} type="button">
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmRemoteDeleteDialog({
  onCancel,
  onConfirm,
  request,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  request: RemoteDeleteRequest;
}) {
  const { t } = useTranslation();
  const message =
    request.items.length === 1
      ? t("sftp.deleteRemoteItemConfirm", {
          kind: request.items[0].kind,
          name: request.items[0].name,
        })
      : t("sftp.deleteRemoteItemsMultiple", { count: request.items.length });

  return (
    <ConfirmDialog
      confirmLabel={t("sftp.deleteLabel")}
      message={message}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={t("sftp.deleteRemoteConfirm")}
      tone="danger"
    />
  );
}

export function TransferConflictDialog({
  conflict,
  onDecision,
}: {
  conflict: TransferConflictState;
  onDecision: (decision: TransferConflictDecision) => void;
}) {
  const { t } = useTranslation();
  const isFolder = conflict.isFolder;

  return (
    <div className="dialog-backdrop transfer-conflict-backdrop" role="presentation">
      <div className="transfer-conflict-dialog" role="dialog" aria-label={t("sftp.transferConflict")}>
        <header>
          <div>
            <strong>{isFolder ? t("sftp.folderExists") : t("sftp.fileExists")}</strong>
            <span>{conflict.direction === "upload" ? t("sftp.uploadConflict") : t("sftp.downloadConflict")}</span>
          </div>
          <button
            className="icon-button"
            aria-label={t("sftp.cancelTransferConflict")}
            onClick={() => onDecision("cancel")}
            type="button"
          >
            <X size={15} />
          </button>
        </header>
        <p>
          {t("sftp.targetExistsDetail", { kind: isFolder ? t("sftp.folder").toLowerCase() : t("sftp.file").toLowerCase(), name: conflict.name })}
        </p>
        <code>{conflict.targetPath}</code>
        {conflict.remainingConflicts > 0 ? (
          <small>
            {t("sftp.moreConflictsDetail", { count: conflict.remainingConflicts })}
          </small>
        ) : null}
        <div className="transfer-conflict-actions">
          <button className="secondary-button" onClick={() => onDecision("skip")} type="button">
            {t("sftp.skip")}
          </button>
          <button className="secondary-button" onClick={() => onDecision("cancel")} type="button">
            {t("sftp.cancelTransfer")}
          </button>
          <button className="primary-button" onClick={() => onDecision("overwrite")} type="button">
            {t("sftp.overwrite")}
          </button>
          <button
            className="primary-button"
            onClick={() => onDecision("overwriteAll")}
            type="button"
          >
            {t("sftp.overwriteAll")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SftpContextMenu({
  menu,
  onTransfer,
  onRename,
  onDelete,
  onProperties,
  onClose,
}: {
  menu: SftpContextMenuState;
  onTransfer: (menu: SftpContextMenuState) => void;
  onRename: (menu: SftpContextMenuState) => void;
  onDelete: (menu: SftpContextMenuState) => void;
  onProperties: (menu: SftpContextMenuState) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = () => onClose();
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) {
      return;
    }

    node.style.left = `${menu.x}px`;
    node.style.top = `${menu.y}px`;
  }, [menu.x, menu.y]);

  const transferLabel = menu.side === "local" ? t("sftp.transferUpload") : t("sftp.transferDownload");
  const canRename = menu.side === "remote" && menu.names.length === 1;
  const canDelete = menu.side === "remote" && menu.names.length > 0;

  return (
    <div
      className="sftp-context-menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      ref={menuRef}
      role="menu"
    >
      <button onClick={() => onTransfer(menu)} role="menuitem" type="button">
        {t("sftp.transfer")}
        <small>{transferLabel}</small>
      </button>
      <button disabled={!canRename} onClick={() => onRename(menu)} role="menuitem" type="button">
        {t("sftp.renameItem")}
      </button>
      <button disabled={!canDelete} onClick={() => onDelete(menu)} role="menuitem" type="button">
        {t("sftp.deleteLabel")}
      </button>
      <button onClick={() => onProperties(menu)} role="menuitem" type="button">
        {t("sftp.properties")}
      </button>
    </div>
  );
}

export function SftpPropertiesPopup({
  properties,
  onClose,
  onSave,
}: {
  properties: FilePropertiesState;
  onClose: () => void;
  onSave: (request: { permissions?: string; uid?: number; gid?: number }) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const remoteProperties = properties.remoteProperties;
  const isRemote = properties.side === "remote";
  const modeValue = remoteProperties?.mode ?? properties.entry.mode ?? "";
  const uidValue = remoteProperties?.uid ?? properties.entry.uid;
  const gidValue = remoteProperties?.gid ?? properties.entry.gid;
  const [mode, setMode] = useState(modeValue);
  const [uid, setUid] = useState(uidValue === undefined ? "" : String(uidValue));
  const [gid, setGid] = useState(gidValue === undefined ? "" : String(gidValue));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMode(modeValue);
    setUid(uidValue === undefined ? "" : String(uidValue));
    setGid(gidValue === undefined ? "" : String(gidValue));
    setError("");
  }, [gidValue, modeValue, uidValue]);

  const size = remoteProperties?.size ?? properties.entry.sizeBytes;
  const modified = remoteProperties?.modified ?? properties.entry.modifiedTimestamp;
  const accessed = remoteProperties?.accessed ?? properties.entry.accessedTimestamp;
  const owner =
    remoteProperties?.user ??
    properties.entry.user ??
    (uidValue === undefined ? "-" : String(uidValue));
  const group =
    remoteProperties?.group ??
    properties.entry.group ??
    (gidValue === undefined ? "-" : String(gidValue));

  function parseOptionalOwner(value: string, label: "Owner" | "Group") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(label === "Owner" ? t("sftp.ownerMustBeNumber") : t("sftp.groupMustBeNumber"));
    }
    return parsed;
  }

  async function handleSave() {
    setError("");

    if (mode.trim() && !/^[0-7]{3,4}$/.test(mode.trim())) {
      setError(t("sftp.modeHint"));
      return;
    }

    try {
      const request = {
        permissions: mode.trim() || undefined,
        uid: parseOptionalOwner(uid, "Owner"),
        gid: parseOptionalOwner(gid, "Group"),
      };
      setIsSaving(true);
      await onSave(request);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="sftp-properties-popover" role="dialog" aria-label={t("sftp.sftpProperties")}>
      <header>
        <div>
          <strong>{properties.entry.name}</strong>
          <span>{properties.path}</span>
        </div>
        <button className="icon-button" aria-label={t("sftp.closeProperties")} onClick={onClose} type="button">
          <X size={15} />
        </button>
      </header>
      <div className="properties-grid">
        <span>{t("sftp.type")}</span>
        <strong>{remoteProperties?.kind ?? properties.entry.kind}</strong>
        <span>{t("sftp.size")}</span>
        <strong>{formatFileSize(size)}</strong>
        <span>{t("sftp.modified")}</span>
        <strong>{formatRemoteTime(modified)}</strong>
        <span>{t("sftp.accessed")}</span>
        <strong>{formatRemoteTime(accessed)}</strong>
        <span>{t("sftp.owner")}</span>
        <strong>{owner}</strong>
        <span>{t("sftp.group")}</span>
        <strong>{group}</strong>
        <span>{t("sftp.mode")}</span>
        <strong>{modeValue || "-"}</strong>
      </div>
      {isRemote ? (
        <div className="properties-edit-grid">
          <label>
            <span>{t("sftp.chmod")}</span>
            <input
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setMode(event.currentTarget.value)}
              value={mode}
            />
          </label>
          <label>
            <span>{t("sftp.chownUid")}</span>
            <input
              inputMode="numeric"
              onChange={(event) => setUid(event.currentTarget.value)}
              value={uid}
            />
          </label>
          <label>
            <span>{t("sftp.chownGid")}</span>
            <input
              inputMode="numeric"
              onChange={(event) => setGid(event.currentTarget.value)}
              value={gid}
            />
          </label>
        </div>
      ) : null}
      {error ? <p className="properties-error">{error}</p> : null}
      <div className="properties-actions">
        <button className="secondary-button" onClick={onClose} type="button">
          {t("common.close")}
        </button>
        {isRemote ? (
          <button className="primary-button" disabled={isSaving} onClick={() => void handleSave()} type="button">
            {t("sftp.save")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
