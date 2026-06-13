import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  ConfirmSheet,
  DIcon,
  DialogShell,
  Field,
  Sheet,
  TextInput,
} from "../../../../app/ui/dialog";
import { FileGlyph } from "./finderGlyphs";
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
  const [draft, setDraft] = useState("");

  return (
    <DialogShell onBackdrop={onCancel}>
      <Sheet
        width={420}
        title={t("sftp.createFolder")}
        ariaLabel={t("sftp.newRemoteFolder")}
        footer={
          <Actions
            cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" icon="newfolder" onClick={() => onCreate(draft)}>
                {t("sftp.createFolder")}
              </Btn>
            }
          />
        }
      >
        <Field label={t("sftp.newRemoteFolder")}>
          <TextInput
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreate(draft);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
              }
            }}
          />
        </Field>
      </Sheet>
    </DialogShell>
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
    <ConfirmSheet
      tone="danger"
      title={t("sftp.deleteRemoteConfirm")}
      message={message}
      confirmLabel={t("sftp.deleteLabel")}
      confirmIcon="trash"
      onCancel={onCancel}
      onConfirm={onConfirm}
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
    <DialogShell zClassName="sftp-conflict-z" onBackdrop={() => onDecision("cancel")}>
      <Sheet
        width={460}
        title={isFolder ? t("sftp.folderExists") : t("sftp.fileExists")}
        sub={conflict.direction === "upload" ? t("sftp.uploadConflict") : t("sftp.downloadConflict")}
        ariaLabel={t("sftp.transferConflict")}
        footer={
          <>
            <Btn onClick={() => onDecision("skip")}>{t("sftp.skip")}</Btn>
            <Btn onClick={() => onDecision("cancel")}>{t("sftp.cancelTransfer")}</Btn>
            <span className="kk-spacer" />
            <Btn kind="primary" onClick={() => onDecision("overwrite")}>
              {t("sftp.overwrite")}
            </Btn>
            <Btn kind="primary" onClick={() => onDecision("overwriteAll")}>
              {t("sftp.overwriteAll")}
            </Btn>
          </>
        }
      >
        <div className="kk-confirm-body">
          <span className="kk-confirm-ico warn">
            <DIcon name="alert" size={24} />
          </span>
          <div className="kk-ct">
            <p>
              {t("sftp.targetExistsDetail", {
                kind: isFolder ? t("sftp.folder").toLowerCase() : t("sftp.file").toLowerCase(),
                name: conflict.name,
              })}
            </p>
          </div>
        </div>
        <code className="sftp-conflict-path">{conflict.targetPath}</code>
        {conflict.remainingConflicts > 0 ? (
          <span className="kk-hint">{t("sftp.moreConflictsDetail", { count: conflict.remainingConflicts })}</span>
        ) : null}
      </Sheet>
    </DialogShell>
  );
}

export function SftpContextMenu({
  menu,
  onTransfer,
  onOpen,
  onRename,
  onDelete,
  onProperties,
  onCopyPath,
  onClose,
}: {
  menu: SftpContextMenuState;
  onTransfer: (menu: SftpContextMenuState) => void;
  onOpen: (menu: SftpContextMenuState) => void;
  onRename: (menu: SftpContextMenuState) => void;
  onDelete: (menu: SftpContextMenuState) => void;
  onProperties: (menu: SftpContextMenuState) => void;
  onCopyPath: (menu: SftpContextMenuState) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const isRemote = menu.side === "remote";

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
    const margin = 8;
    const rect = node.getBoundingClientRect();
    let x = menu.x;
    let y = menu.y;
    if (x + rect.width > window.innerWidth - margin) {
      x = window.innerWidth - rect.width - margin;
    }
    if (y + rect.height > window.innerHeight - margin) {
      y = window.innerHeight - rect.height - margin;
    }
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
  }, [menu.x, menu.y]);

  const canRename = isRemote && menu.names.length === 1;
  const canDelete = isRemote && menu.names.length > 0;
  const canOpen = menu.names.length === 1 && menu.openable;

  return (
    <div
      className="sftp-ctx-menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      ref={menuRef}
      role="menu"
    >
      <button onClick={() => onTransfer(menu)} role="menuitem" type="button">
        <DIcon name={isRemote ? "download" : "upload"} size={15} />
        {isRemote ? t("sftp.download") : t("sftp.upload")}
      </button>
      <button disabled={!canOpen} onClick={() => onOpen(menu)} role="menuitem" type="button">
        <DIcon name="folder" size={15} />
        {t("common.open")}
      </button>
      <div className="sftp-ctx-sep" />
      <button disabled={!canRename} onClick={() => onRename(menu)} role="menuitem" type="button">
        <DIcon name="pencil" size={15} />
        {t("sftp.renameItem")}
      </button>
      <button onClick={() => onCopyPath(menu)} role="menuitem" type="button">
        <DIcon name="copy" size={15} />
        {t("sftp.copyPath")}
      </button>
      <button disabled={!canDelete} onClick={() => onDelete(menu)} role="menuitem" type="button">
        <DIcon name="trash" size={15} />
        {t("sftp.deleteLabel")}
      </button>
      <div className="sftp-ctx-sep" />
      <button onClick={() => onProperties(menu)} role="menuitem" type="button">
        <DIcon name="info" size={15} />
        {t("sftp.getInfo")}
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
    remoteProperties?.user ?? properties.entry.user ?? (uidValue === undefined ? "-" : String(uidValue));
  const group =
    remoteProperties?.group ?? properties.entry.group ?? (gidValue === undefined ? "-" : String(gidValue));

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
    <DialogShell onBackdrop={onClose}>
      <div className="sftp-props" role="dialog" aria-label={t("sftp.sftpProperties")}>
        <div className="sftp-props-head">
          <span className="sftp-props-glyph">
            <FileGlyph entry={properties.entry} size={56} />
          </span>
          <div className="nm">{properties.entry.name}</div>
          <div className="sub">{remoteProperties?.kind ?? properties.entry.kind}</div>
        </div>
        <div className="sftp-props-body">
          <div className="sftp-props-row">
            <span className="k">{t("sftp.type")}</span>
            <span className="v">{remoteProperties?.kind ?? properties.entry.kind}</span>
          </div>
          <div className="sftp-props-row">
            <span className="k">{t("sftp.size")}</span>
            <span className="v">{formatFileSize(size)}</span>
          </div>
          <div className="sftp-props-row">
            <span className="k">{t("sftp.modified")}</span>
            <span className="v">{formatRemoteTime(modified)}</span>
          </div>
          <div className="sftp-props-row">
            <span className="k">{t("sftp.accessed")}</span>
            <span className="v">{formatRemoteTime(accessed)}</span>
          </div>
          <div className="sftp-props-row">
            <span className="k">{t("sftp.owner")}</span>
            <span className="v">{owner}</span>
          </div>
          <div className="sftp-props-row">
            <span className="k">{t("sftp.group")}</span>
            <span className="v">{group}</span>
          </div>
          <div className="sftp-props-row">
            <span className="k">{t("sftp.mode")}</span>
            <span className="v">{modeValue || "-"}</span>
          </div>
        </div>
        {isRemote ? (
          <div className="sftp-perm-grid">
            <Field label={t("sftp.chmod")}>
              <TextInput
                inputMode="numeric"
                maxLength={4}
                value={mode}
                onChange={(event) => setMode(event.currentTarget.value)}
              />
            </Field>
            <Field label={t("sftp.chownUid")}>
              <TextInput
                inputMode="numeric"
                value={uid}
                onChange={(event) => setUid(event.currentTarget.value)}
              />
            </Field>
            <Field label={t("sftp.chownGid")}>
              <TextInput
                inputMode="numeric"
                value={gid}
                onChange={(event) => setGid(event.currentTarget.value)}
              />
            </Field>
          </div>
        ) : null}
        {error ? <p className="sftp-props-error">{error}</p> : null}
        <div className="sftp-props-actions">
          {isRemote ? (
            <Btn kind="primary" disabled={isSaving} onClick={() => void handleSave()}>
              {t("sftp.save")}
            </Btn>
          ) : null}
          <Btn onClick={onClose}>{t("common.close")}</Btn>
        </div>
      </div>
    </DialogShell>
  );
}
