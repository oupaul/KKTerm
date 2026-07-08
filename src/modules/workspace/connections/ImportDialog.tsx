import { Loader2 } from "../../../lib/reicon";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import {
  invokeCommand,
  selectConnectionImportFile,
  type BookmarkImportSource,
  type BookmarkTreeNode,
  type ImportFilePreview,
  type ScanProgressEvent,
  type ScanResultEntry,
} from "../../../lib/tauri";
import {
  Actions,
  Btn,
  DIcon,
  DialogShell,
  Field,
  Segmented,
  Select,
  Sheet,
  TextInput,
  type DialogIconName,
} from "../../../app/ui/dialog";
import { useWorkspaceStore } from "../../../store";
import { defaultPortForConnectionType, uniqueRuntimeId } from "./utils";
import type {
  ConnectionTree,
  ConnectionType,
  CreateConnectionRequest,
  SshSettings,
  Workspace,
} from "../../../types";

type ImportDialogProps = {
  tree: ConnectionTree;
  sshSettings: SshSettings;
  onClose: () => void;
  onImported: (result: {
    count: number;
    source: ImportSource;
  }) => void;
};

type ImportSource = "file" | "scan" | "bookmarks";
type StatusFilter = "all" | "selected" | "missingUser";
type BulkField = "user" | "password" | null;

type Candidate = {
  id: string;
  selected: boolean;
  name: string;
  host: string;
  user: string;
  password: string;
  url?: string;
  port?: number;
  type: ConnectionType;
  folderPath: string[];
};

const SCAN_PROTOCOLS: Array<{ ports: number[]; labelKey: string }> = [
  { ports: [22], labelKey: "connections.import.portSsh" },
  { ports: [23], labelKey: "connections.import.portTelnet" },
  { ports: [3389], labelKey: "connections.import.portRdp" },
  { ports: [80, 443], labelKey: "connections.import.portHttpHttps" },
];

const IMPORTABLE_TYPES: ConnectionType[] = [
  "ssh",
  "telnet",
  "rdp",
  "vnc",
  "serial",
  "url",
  "local",
];

const SOURCE_ICONS: Record<ImportSource, DialogIconName> = {
  file: "package",
  scan: "network",
  bookmarks: "star",
};

const TYPE_ICONS: Partial<Record<ConnectionType, DialogIconName>> = {
  ssh: "server",
  telnet: "terminal",
  rdp: "monitor",
  vnc: "network",
  serial: "bolt",
  url: "globe",
  local: "terminal",
};

export function ImportDialog({ sshSettings, onClose, onImported }: ImportDialogProps) {
  const { t } = useTranslation();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const [source, setSource] = useState<ImportSource>("file");
  const [error, setError] = useState("");
  const [filePath, setFilePath] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [target, setTarget] = useState("");
  const [enabledPorts, setEnabledPorts] = useState<Set<number>>(
    () => new Set(SCAN_PROTOCOLS.flatMap((entry) => entry.ports)),
  );
  const [customScanPort, setCustomScanPort] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgressEvent | null>(null);
  const scanIdRef = useRef("");
  const [bookmarkSources, setBookmarkSources] = useState<BookmarkImportSource[]>([]);
  const [bookmarkSourceId, setBookmarkSourceId] = useState("");
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(() => new Set());
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [bookmarksPreviewing, setBookmarksPreviewing] = useState(false);
  const bookmarkDiscoveryRef = useRef(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ConnectionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bulkField, setBulkField] = useState<BulkField>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkScope, setBulkScope] = useState<"all" | "empty">("empty");
  const [destinationWorkspaceId, setDestinationWorkspaceId] = useState(activeWorkspaceId);
  const [importing, setImporting] = useState(false);

  const workspaceOptions = useMemo(
    () =>
      workspaces.length > 0
        ? workspaces
        : [{
            id: activeWorkspaceId,
            name: t("workspace.workspace"),
            icon: null,
            iconColor: null,
            isDefault: activeWorkspaceId === "default",
            sortOrder: 0,
          }],
    [activeWorkspaceId, t, workspaces],
  );
  const selectedSource = bookmarkSources.find((entry) => entry.id === bookmarkSourceId) ?? null;
  const selectedCount = candidates.filter((row) => row.selected).length;
  const allVisibleTypes = useMemo(() => {
    const types = new Set(candidates.map((row) => row.type));
    return IMPORTABLE_TYPES.filter((type) => types.has(type));
  }, [candidates]);
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) {
        return false;
      }
      if (statusFilter === "selected" && !row.selected) {
        return false;
      }
      if (statusFilter === "missingUser" && row.user.trim()) {
        return false;
      }
      if (q && !`${row.name} ${row.host} ${row.user} ${row.url ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [candidates, search, statusFilter, typeFilter]);
  const allFilteredSelected =
    filteredCandidates.length > 0 && filteredCandidates.every((row) => row.selected);
  const someFilteredSelected = filteredCandidates.some((row) => row.selected);
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;
  const scanPorts = useMemo(
    () => normalizeScanPorts(enabledPorts, customScanPort),
    [customScanPort, enabledPorts],
  );

  useEffect(() => {
    let dispose: (() => void) | null = null;
    let disposed = false;

    void listen<ScanProgressEvent>("import-scan-progress", (event) => {
      if (event.payload.scanId !== scanIdRef.current) {
        return;
      }
      setProgress(event.payload);
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
      } else {
        dispose = unlisten;
      }
    });

    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  useEffect(() => {
    setError("");
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setBulkField(null);
    clearPreview();
  }, [source]);

  useEffect(() => {
    if (!workspaceOptions.some((workspace) => workspace.id === destinationWorkspaceId)) {
      setDestinationWorkspaceId(activeWorkspaceId);
    }
  }, [activeWorkspaceId, destinationWorkspaceId, workspaceOptions]);

  useEffect(() => {
    // Guard re-entrancy with a ref, NOT with `bookmarksLoading`. Listing the
    // loading flag in the dependency array (and writing it below) made the
    // effect re-run the moment discovery started, whose cleanup cancelled the
    // in-flight request before it could resolve — so the dialog hung on
    // "Looking for browser bookmark sources…" forever regardless of which (or
    // whether any) browsers were installed.
    if (source !== "bookmarks" || bookmarksLoaded || bookmarkDiscoveryRef.current) {
      return;
    }
    let cancelled = false;
    bookmarkDiscoveryRef.current = true;
    setBookmarksLoading(true);
    invokeCommand("list_browser_bookmark_sources", undefined)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setBookmarkSources(response.sources);
        const first =
          response.sources.find((entry) => entry.root.children.length > 0) ??
          response.sources[0];
        if (first) {
          setBookmarkSourceId(first.id);
          setSelectedNodeIds(new Set(bookmarkSourceNodeIds(first)));
        }
      })
      .catch((failure) => {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      })
      .finally(() => {
        bookmarkDiscoveryRef.current = false;
        if (!cancelled) {
          setBookmarksLoaded(true);
          setBookmarksLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookmarksLoaded, source]);

  async function handleBrowse() {
    setError("");
    try {
      const path = await selectConnectionImportFile();
      if (!path) {
        return;
      }
      setFilePath(path);
      setFileLoading(true);
      const result = await invokeCommand("parse_import_file", { request: { path } });
      setPreview(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      clearPreview();
    } finally {
      setFileLoading(false);
    }
  }

  async function handleStartScan() {
    setError("");
    if (!target.trim()) {
      setError(t("connections.import.scanTargetRequired"));
      return;
    }
    if (scanPorts.length === 0) {
      setError(t("connections.import.scanPortRequired"));
      return;
    }
    const scanId = uniqueRuntimeId("scan");
    scanIdRef.current = scanId;
    setScanning(true);
    setProgress({ scanId, completed: 0, total: 0 });
    setCandidates([]);
    setWarnings([]);
    try {
      const response = await invokeCommand("scan_network_for_connections", {
        request: {
          scanId,
          target: target.trim(),
          ports: scanPorts,
        },
      });
      setWarnings([]);
      setCandidates(response.results.map(scanResultToCandidate));
      if (response.results.length === 0) {
        setError(t("connections.import.scanNoResults"));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setScanning(false);
    }
  }

  function togglePortGroup(ports: number[]) {
    setEnabledPorts((current) => {
      const next = new Set(current);
      if (ports.every((port) => next.has(port))) {
        ports.forEach((port) => next.delete(port));
      } else {
        ports.forEach((port) => next.add(port));
      }
      return next;
    });
  }

  function handleBookmarkSourceChange(sourceId: string) {
    setBookmarkSourceId(sourceId);
    const source = bookmarkSources.find((entry) => entry.id === sourceId);
    setSelectedNodeIds(new Set(source ? bookmarkSourceNodeIds(source) : []));
    clearPreview();
    setError("");
  }

  function handleBookmarkRefresh() {
    setError("");
    setBookmarkSources([]);
    setBookmarkSourceId("");
    setSelectedNodeIds(new Set());
    bookmarkDiscoveryRef.current = false;
    setBookmarksLoaded(false);
    clearPreview();
  }

  async function handleBookmarkPreview() {
    if (!selectedSource) {
      setError(t("connections.import.bookmarksSourceRequired"));
      return;
    }
    const nodeIds =
      selectedNodeIds.size > 0
        ? Array.from(selectedNodeIds)
        : bookmarkSourceNodeIds(selectedSource);
    if (nodeIds.length === 0) {
      setError(t("connections.import.bookmarksSelectionRequired"));
      return;
    }
    setError("");
    setBookmarksPreviewing(true);
    try {
      const result = await invokeCommand("preview_browser_bookmark_import", {
        request: {
          sourceId: selectedSource.id,
          selectedNodeIds: nodeIds,
        },
      });
      setPreview(result);
      if (result.drafts.length === 0) {
        setError(t("connections.import.bookmarksNoImportable"));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      clearPreview();
    } finally {
      setBookmarksPreviewing(false);
    }
  }

  function setPreview(result: ImportFilePreview) {
    setWarnings(result.warnings);
    setCandidates(result.drafts.map(draftToCandidate));
  }

  function clearPreview() {
    setWarnings([]);
    setCandidates([]);
  }

  function updateRow(id: string, patch: Partial<Candidate>) {
    setCandidates((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function setAllFiltered(value: boolean) {
    const ids = new Set(filteredCandidates.map((row) => row.id));
    setCandidates((current) =>
      current.map((row) => (ids.has(row.id) ? { ...row, selected: value } : row)),
    );
  }

  function openBulkField(field: Exclude<BulkField, null>) {
    setError("");
    setBulkField(field);
    setBulkValue("");
    setBulkScope("empty");
  }

  function closeBulkField() {
    setBulkField(null);
    setBulkValue("");
  }

  function applyBulkField() {
    if (!bulkField) {
      return;
    }
    if (bulkField === "user") {
      const user = bulkValue.trim();
      if (!user) {
        setError(t("connections.import.bulkUserRequired"));
        return;
      }
      setCandidates((current) =>
        current.map((row) => {
          if (!row.selected || (bulkScope === "empty" && row.user.trim())) {
            return row;
          }
          return { ...row, user };
        }),
      );
    } else {
      if (!bulkValue) {
        setError(t("connections.import.bulkPasswordRequired"));
        return;
      }
      setCandidates((current) =>
        current.map((row) => {
          if (!row.selected || (bulkScope === "empty" && row.password)) {
            return row;
          }
          return { ...row, password: bulkValue };
        }),
      );
    }
    closeBulkField();
  }

  async function resolveFolderPath(
    baseFolderId: string | undefined,
    folderPath: string[],
    folderCache: Map<string, string>,
    workspaceId: string,
  ) {
    let parentFolderId = baseFolderId;
    const pathSegments: string[] = [];
    for (const rawSegment of folderPath) {
      const segment = rawSegment.trim();
      if (!segment) {
        continue;
      }
      pathSegments.push(segment);
      const cacheKey = `${parentFolderId ?? "__root__"}/${pathSegments.join("/")}`;
      const cached = folderCache.get(cacheKey);
      if (cached) {
        parentFolderId = cached;
        continue;
      }
      const folder = await invokeCommand("create_connection_folder", {
        request: {
          name: segment,
          parentFolderId,
          workspaceId,
        },
      });
      folderCache.set(cacheKey, folder.id);
      parentFolderId = folder.id;
    }
    return parentFolderId;
  }

  async function storeImportedPassword(connectionId: string, password: string) {
    if (!password) {
      return;
    }
    await invokeCommand("store_secret", {
      request: {
        kind: "connectionPassword",
        ownerId: connectionId,
        secret: password,
      },
    });
  }

  async function handleImport() {
    if (selectedCount === 0) {
      setError(t("connections.import.noneSelected"));
      return;
    }

    setImporting(true);
    try {
      const folderCache = new Map<string, string>();

      for (const row of candidates) {
        if (!row.selected) {
          continue;
        }
        const port = ["local", "serial", "url"].includes(row.type)
          ? row.port
          : row.port ?? defaultPortForConnectionType(row.type, sshSettings);
        const rowFolderId = await resolveFolderPath(
          undefined,
          row.folderPath,
          folderCache,
          destinationWorkspaceId,
        );
        const password = ["ssh", "telnet", "rdp", "vnc"].includes(row.type)
          ? row.password
          : "";
        const request: CreateConnectionRequest = {
          name:
            row.name.trim() ||
            row.host ||
            row.url ||
            t("connections.import.bookmarkFallbackName"),
          type: row.type,
          host: row.type === "url" ? undefined : row.host,
          user: row.user,
          folderId: rowFolderId,
          workspaceId: destinationWorkspaceId,
          port,
          url: row.type === "url" ? row.url ?? row.host : undefined,
          authMethod: password && row.type === "ssh" ? "password" : undefined,
        };
        const connection = await invokeCommand("create_connection", { request });
        await storeImportedPassword(connection.id, password);
      }

      onImported({ count: selectedCount, source });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setImporting(false);
    }
  }

  const footer = (
    <Actions
      extraLeft={
        <WorkspaceDestinationPicker
          destinationWorkspaceId={destinationWorkspaceId}
          onDestinationWorkspaceId={setDestinationWorkspaceId}
          workspaces={workspaceOptions}
        />
      }
      primary={
        <Btn
          disabled={importing || selectedCount === 0}
          icon={importing ? undefined : "download"}
          kind="primary"
          onClick={() => void handleImport()}
        >
          {importing ? <Loader2 className="spin" size={14} /> : null}
          {t("connections.import.importCount", { count: selectedCount })}
        </Btn>
      }
      cancel={<Btn onClick={onClose}>{t("connections.cancel")}</Btn>}
    />
  );

  return (
    <DialogShell>
      <Sheet
        ariaLabel={t("connections.import.title")}
        className="import-dialog import-dialog-redesign"
        eyebrow={t("connections.import.title")}
        footer={footer}
        height={720}
        width={920}
      >
        <div className="import-unified">
          <Segmented
            value={source}
            onChange={(value) => setSource(value as ImportSource)}
            options={[
              { value: "file", label: t("connections.import.fromFileTitle"), icon: "package" },
              { value: "bookmarks", label: t("connections.import.bookmarksTitle"), icon: "star" },
              { value: "scan", label: t("connections.import.scanTitle"), icon: "network" },
            ]}
          />
          <SourceContext
            bookmarkSources={bookmarkSources}
            bookmarksLoaded={bookmarksLoaded}
            bookmarksLoading={bookmarksLoading}
            bookmarksPreviewing={bookmarksPreviewing}
            enabledPorts={enabledPorts}
            fileLoading={fileLoading}
            filePath={filePath}
            onBookmarkPreview={() => void handleBookmarkPreview()}
            onBookmarkRefresh={handleBookmarkRefresh}
            onBookmarkSourceChange={handleBookmarkSourceChange}
            onChooseFile={() => void handleBrowse()}
            onCustomScanPort={setCustomScanPort}
            onPortToggle={togglePortGroup}
            onScan={() => void handleStartScan()}
            progress={progress}
            progressPercent={progressPercent}
            scanning={scanning}
            selectedNodeCount={selectedNodeIds.size}
            selectedSource={selectedSource}
            source={source}
            customScanPort={customScanPort}
            target={target}
            setTarget={setTarget}
            t={t}
          />
          {source === "bookmarks" && selectedSource ? (
            <BookmarkWarnings source={selectedSource} t={t} />
          ) : null}
          {error ? <p className="form-error import-inline-error">{error}</p> : null}
          <FilterBar
            allVisibleTypes={allVisibleTypes}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            t={t}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
          />
          <CandidateList
            allFilteredSelected={allFilteredSelected}
            candidates={filteredCandidates}
            onSetAllFiltered={setAllFiltered}
            onUpdateRow={updateRow}
            someFilteredSelected={someFilteredSelected}
            t={t}
          />
          {warnings.length > 0 ? (
            <div className="import-warnings" role="status">
              <strong>{t("connections.import.warningsHeading")}</strong>
              <ul>
                {warnings.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="import-toolbar-redesign">
            <span className="import-toolbar-lead">{t("connections.import.previewHeading", {
              count: candidates.length,
              selected: selectedCount,
            })}</span>
            <ToolMenu
              disabled={selectedCount === 0}
              icon="key"
              label={t("connections.import.setUsernameButton")}
              open={bulkField === "user"}
              onOpen={() => (bulkField === "user" ? closeBulkField() : openBulkField("user"))}
            >
              <BulkFieldEditor
                field="user"
                value={bulkValue}
                scope={bulkScope}
                onValue={setBulkValue}
                onScope={setBulkScope}
                onApply={applyBulkField}
                onCancel={closeBulkField}
                t={t}
              />
            </ToolMenu>
            <ToolMenu
              disabled={selectedCount === 0}
              icon="keyround"
              label={t("connections.import.setPasswordButton")}
              open={bulkField === "password"}
              onOpen={() => (bulkField === "password" ? closeBulkField() : openBulkField("password"))}
            >
              <BulkFieldEditor
                field="password"
                value={bulkValue}
                scope={bulkScope}
                onValue={setBulkValue}
                onScope={setBulkScope}
                onApply={applyBulkField}
                onCancel={closeBulkField}
                t={t}
              />
            </ToolMenu>
          </div>
        </div>
      </Sheet>
    </DialogShell>
  );
}

function SourceContext({
  bookmarkSources,
  bookmarksLoaded,
  bookmarksLoading,
  bookmarksPreviewing,
  customScanPort,
  enabledPorts,
  fileLoading,
  filePath,
  onBookmarkPreview,
  onBookmarkRefresh,
  onBookmarkSourceChange,
  onChooseFile,
  onCustomScanPort,
  onPortToggle,
  onScan,
  progress,
  progressPercent,
  scanning,
  selectedNodeCount,
  selectedSource,
  source,
  target,
  setTarget,
  t,
}: {
  bookmarkSources: BookmarkImportSource[];
  bookmarksLoaded: boolean;
  bookmarksLoading: boolean;
  bookmarksPreviewing: boolean;
  customScanPort: string;
  enabledPorts: Set<number>;
  fileLoading: boolean;
  filePath: string;
  onBookmarkPreview: () => void;
  onBookmarkRefresh: () => void;
  onBookmarkSourceChange: (sourceId: string) => void;
  onChooseFile: () => void;
  onCustomScanPort: (port: string) => void;
  onPortToggle: (ports: number[]) => void;
  onScan: () => void;
  progress: ScanProgressEvent | null;
  progressPercent: number;
  scanning: boolean;
  selectedNodeCount: number;
  selectedSource: BookmarkImportSource | null;
  source: ImportSource;
  target: string;
  setTarget: (value: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (source === "file") {
    return (
      <div className="import-source-card">
        <SourceIcon source="file" />
        <div className="import-source-copy">
          <strong>{filePath || t("connections.import.noFileChosen")}</strong>
          <span>{t("connections.import.fileFormatsHint")}</span>
        </div>
        <Btn disabled={fileLoading} icon="folder" onClick={onChooseFile} sm>
          {fileLoading ? <Loader2 className="spin" size={13} /> : null}
          {t("connections.import.chooseFile")}
        </Btn>
      </div>
    );
  }

  if (source === "bookmarks") {
    return (
      <div className="import-source-card">
        <SourceIcon source="bookmarks" />
        <div className="import-source-copy">
          {bookmarksLoading || !bookmarksLoaded ? (
            <strong>{t("connections.import.bookmarksLoading")}</strong>
          ) : bookmarksLoaded && bookmarkSources.length === 0 ? (
            <strong>{t("connections.import.bookmarksNoSources")}</strong>
          ) : (
            <>
              <Select
                value={selectedSource?.id ?? ""}
                onChange={(event) => onBookmarkSourceChange(event.currentTarget.value)}
                options={bookmarkSources.map((entry) => ({
                  value: entry.id,
                  label: entry.label,
                }))}
              />
              {selectedSource ? (
                <span>{t("connections.import.bookmarksSourcePath", { path: selectedSource.path })}</span>
              ) : null}
            </>
          )}
        </div>
        <Btn
          disabled={
            bookmarksLoading ||
            !bookmarksLoaded ||
            bookmarksPreviewing ||
            (Boolean(selectedSource) && selectedNodeCount === 0)
          }
          icon="star"
          onClick={selectedSource ? onBookmarkPreview : onBookmarkRefresh}
          sm
        >
          {bookmarksPreviewing ? <Loader2 className="spin" size={13} /> : null}
          {selectedSource
            ? t("connections.import.bookmarksPreview", { count: selectedNodeCount })
            : t("common.refresh")}
        </Btn>
      </div>
    );
  }

  return (
    <div className="import-source-card import-source-card-scan">
      <SourceIcon source="scan" />
      <div className="import-source-copy">
        <div className="import-scan-row-redesign">
          <TextInput
            mono
            onChange={(event) => setTarget(event.currentTarget.value)}
            placeholder={t("connections.import.scanTargetPlaceholder")}
            value={target}
          />
          <div className="import-portchips-redesign">
            {SCAN_PROTOCOLS.map((entry) => (
              <button
                className={entry.ports.every((port) => enabledPorts.has(port)) ? "on" : ""}
                key={entry.labelKey}
                onClick={() => onPortToggle(entry.ports)}
                type="button"
              >
                {t(entry.labelKey)}
              </button>
            ))}
            <TextInput
              aria-label={t("connections.port")}
              className="import-custom-port-input"
              inputMode="numeric"
              max={65535}
              min={1}
              onChange={(event) => onCustomScanPort(event.currentTarget.value)}
              placeholder={t("connections.port")}
              type="number"
              value={customScanPort}
            />
          </div>
        </div>
        {scanning || (progress && progress.total > 0) ? (
          <div className="import-progress" aria-live="polite">
            <div
              className="import-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
            <span className="import-progress-text">
              {progress ? `${progress.completed}/${progress.total} (${progressPercent}%)` : ""}
            </span>
          </div>
        ) : (
          <span>{t("connections.import.scanTargetHint")}</span>
        )}
      </div>
      <Btn disabled={scanning} icon="network" onClick={onScan} sm>
        {scanning ? <Loader2 className="spin" size={13} /> : null}
        {scanning ? t("connections.import.scanRunning") : t("connections.import.scanStart")}
      </Btn>
    </div>
  );
}

function SourceIcon({ source }: { source: ImportSource }) {
  return (
    <span className={`import-source-icon ${source}`}>
      <DIcon name={SOURCE_ICONS[source]} size={17} />
    </span>
  );
}

function BookmarkWarnings({
  source,
  t,
}: {
  source: BookmarkImportSource;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return source.warnings.length > 0 ? (
    <div className="import-bookmark-strip">
      <div className="import-warnings" role="status">
        <strong>{t("connections.import.warningsHeading")}</strong>
        <ul>
          {source.warnings.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;
}

function FilterBar({
  allVisibleTypes,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  t,
  typeFilter,
  setTypeFilter,
}: {
  allVisibleTypes: ConnectionType[];
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  t: ReturnType<typeof useTranslation>["t"];
  typeFilter: ConnectionType | "all";
  setTypeFilter: (value: ConnectionType | "all") => void;
}) {
  return (
    <div className="import-filter-redesign">
      <div className="import-search-redesign">
        <DIcon name="search" size={14} />
        <input
          aria-label={t("common.search")}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={t("common.search")}
          type="text"
          value={search}
        />
        {search ? (
          <button aria-label={t("common.clear")} onClick={() => setSearch("")} type="button">
            <DIcon name="close" size={12} />
          </button>
        ) : null}
      </div>
      <div className="import-typechips-redesign">
        <button
          className={typeFilter === "all" ? "on" : ""}
          onClick={() => setTypeFilter("all")}
          type="button"
        >
          {t("connections.import.previewAll")}
        </button>
        {allVisibleTypes.map((type) => (
          <button
            className={typeFilter === type ? "on" : ""}
            key={type}
            onClick={() => setTypeFilter(type)}
            type="button"
          >
            <TypeGlyph type={type} />
            {connectionTypeText(type, t)}
          </button>
        ))}
      </div>
      <div className="import-statusseg-redesign kk-seg" role="tablist">
        {([
          ["all", t("connections.import.previewAll")],
          ["selected", t("connections.import.previewSelected")],
          ["missingUser", t("connections.import.previewMissingUser")],
        ] as Array<[StatusFilter, string]>).map(([value, label]) => (
          <button
            className={statusFilter === value ? "active" : ""}
            key={value}
            onClick={() => setStatusFilter(value)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CandidateList({
  allFilteredSelected,
  candidates,
  onSetAllFiltered,
  onUpdateRow,
  someFilteredSelected,
  t,
}: {
  allFilteredSelected: boolean;
  candidates: Candidate[];
  onSetAllFiltered: (value: boolean) => void;
  onUpdateRow: (id: string, patch: Partial<Candidate>) => void;
  someFilteredSelected: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <div className="import-listwrap-redesign">
      <div className="import-row-redesign import-head-redesign">
        <MiniCheck
          indeterminate={!allFilteredSelected && someFilteredSelected}
          label={t("connections.import.selectAll")}
          on={allFilteredSelected}
          onChange={onSetAllFiltered}
        />
        <span>{t("connections.import.colName")}</span>
        <span>{t("connections.import.colHost")}</span>
        <span>{t("connections.import.colType")}</span>
        <span>{t("connections.folder")}</span>
        <span>{t("connections.import.colUser")}</span>
      </div>
      <div className="import-list-redesign">
        {candidates.length === 0 ? (
          <p className="import-empty">{t("connections.import.previewEmpty")}</p>
        ) : null}
        {candidates.map((row) => (
          <CandidateRow key={row.id} row={row} onUpdate={onUpdateRow} t={t} />
        ))}
      </div>
    </div>
  );
}

function CandidateRow({
  row,
  onUpdate,
  t,
}: {
  row: Candidate;
  onUpdate: (id: string, patch: Partial<Candidate>) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const folder = row.folderPath.join(" / ") || t("connections.import.destinationRoot");
  return (
    <div className={`import-row-redesign import-candidate-redesign${row.selected ? " selected" : ""}`}>
      <MiniCheck
        label={t("connections.import.selectRow")}
        on={row.selected}
        onChange={(selected) => onUpdate(row.id, { selected })}
      />
      <TextInput
        onChange={(event) => onUpdate(row.id, { name: event.currentTarget.value })}
        value={row.name}
      />
      <TextInput
        mono
        onChange={(event) => onUpdate(row.id, { host: event.currentTarget.value })}
        value={row.host}
      />
      <Select
        onChange={(event) =>
          onUpdate(row.id, { type: event.currentTarget.value as ConnectionType })
        }
        options={IMPORTABLE_TYPES.map((type) => ({
          value: type,
          label: connectionTypeText(type, t),
        }))}
        value={row.type}
      />
      <span className="import-folder-cell" title={folder}>
        <DIcon name="folder" size={12} />
        {folder}
      </span>
      <div className="import-user-cell">
        <TextInput
          mono
          onChange={(event) => onUpdate(row.id, { user: event.currentTarget.value })}
          value={row.user}
        />
        {["ssh", "telnet", "rdp", "vnc"].includes(row.type) ? (
          <TextInput
            onChange={(event) => onUpdate(row.id, { password: event.currentTarget.value })}
            placeholder={t("connections.import.bulkPasswordLabel")}
            type="password"
            value={row.password}
          />
        ) : null}
      </div>
    </div>
  );
}

function ToolMenu({
  children,
  disabled,
  icon,
  label,
  onOpen,
  open,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: DialogIconName;
  label: string;
  onOpen: () => void;
  open: boolean;
}) {
  return (
    <div className="import-tool-redesign">
      <button
        aria-expanded={open}
        className={open ? "open" : ""}
        disabled={disabled}
        onClick={onOpen}
        type="button"
      >
        <DIcon name={icon} size={15} />
        {label}
        <DIcon name="chevdown" size={12} />
      </button>
      {open ? <div className="import-popover-redesign">{children}</div> : null}
    </div>
  );
}

function BulkFieldEditor({
  field,
  value,
  scope,
  onValue,
  onScope,
  onApply,
  onCancel,
  t,
}: {
  field: Exclude<BulkField, null>;
  value: string;
  scope: "all" | "empty";
  onValue: (value: string) => void;
  onScope: (value: "all" | "empty") => void;
  onApply: () => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <>
      <Field label={field === "user" ? t("connections.import.bulkUserLabel") : t("connections.import.bulkPasswordLabel")}>
        <TextInput
          autoFocus
          onChange={(event) => onValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onApply();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder={
            field === "user"
              ? t("connections.import.bulkUserPlaceholder")
              : t("connections.import.bulkPasswordPlaceholder")
          }
          type={field === "user" ? "text" : "password"}
          value={value}
        />
      </Field>
      <div className="import-bulk-scope" role="radiogroup">
        <label className="import-bulk-scope-option">
          <input
            checked={scope === "empty"}
            name={`import-bulk-scope-${field}`}
            onChange={() => onScope("empty")}
            type="radio"
          />
          <span>{t("connections.import.bulkScopeUnfilled")}</span>
        </label>
        <label className="import-bulk-scope-option">
          <input
            checked={scope === "all"}
            name={`import-bulk-scope-${field}`}
            onChange={() => onScope("all")}
            type="radio"
          />
          <span>{t("connections.import.bulkScopeAll")}</span>
        </label>
      </div>
      <div className="import-popover-actions">
        <Btn kind="primary" onClick={onApply} sm>{t("connections.import.bulkApply")}</Btn>
        <Btn onClick={onCancel} sm>{t("connections.import.bulkCancel")}</Btn>
      </div>
    </>
  );
}

function WorkspaceDestinationPicker({
  destinationWorkspaceId,
  onDestinationWorkspaceId,
  workspaces,
}: {
  destinationWorkspaceId: string;
  onDestinationWorkspaceId: (value: string) => void;
  workspaces: Workspace[];
}) {
  const { t } = useTranslation();

  return (
    <div className="import-destination-redesign">
      <span>{t("workspace.workspace")}</span>
      <Select
        onChange={(event) => onDestinationWorkspaceId(event.currentTarget.value)}
        options={workspaces.map((workspace) => ({
          value: workspace.id,
          label: workspace.name,
        }))}
        value={destinationWorkspaceId}
      />
    </div>
  );
}

function MiniCheck({
  indeterminate,
  label,
  on,
  onChange,
}: {
  indeterminate?: boolean;
  label: string;
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      aria-checked={indeterminate ? "mixed" : on}
      aria-label={label}
      className={`import-check-redesign${on ? " on" : ""}${indeterminate ? " ind" : ""}`}
      onClick={() => onChange(!on)}
      role="checkbox"
      type="button"
    >
      {indeterminate ? <DIcon name="minus" size={12} /> : on ? <DIcon name="check" size={12} /> : null}
    </button>
  );
}

function TypeGlyph({ type }: { type: ConnectionType }) {
  const icon = TYPE_ICONS[type] ?? "server";
  return <DIcon name={icon} size={12} />;
}

function draftToCandidate(draft: ImportFilePreview["drafts"][number], index: number): Candidate {
  return {
    id: `${index}`,
    selected: true,
    name: draft.name,
    host: draft.host,
    user: draft.user,
    password: "",
    url: draft.url,
    port: draft.port,
    type: draft.type,
    folderPath: draft.folderPath,
  };
}

function scanResultToCandidate(entry: ScanResultEntry, index: number): Candidate {
  const url = entry.type === "url" ? urlForScannedPort(entry.host, entry.port) : undefined;
  const host = url ?? entry.host;
  return {
    id: `${index}`,
    selected: true,
    name: host,
    host,
    user: "",
    password: "",
    port: entry.port,
    type: entry.type,
    folderPath: [],
  };
}

function collectBookmarkNodeIds(node: BookmarkTreeNode): string[] {
  return [
    node.id,
    ...node.children.flatMap((child) => collectBookmarkNodeIds(child)),
  ];
}

function bookmarkSourceNodeIds(source: BookmarkImportSource): string[] {
  return source.root.children.flatMap((node) => collectBookmarkNodeIds(node));
}

function normalizeScanPorts(enabledPorts: Set<number>, customPort: string): number[] {
  const ports = new Set(enabledPorts);
  const parsedCustomPort = Number(customPort);
  if (Number.isInteger(parsedCustomPort) && parsedCustomPort >= 1 && parsedCustomPort <= 65535) {
    ports.add(parsedCustomPort);
  }
  return Array.from(ports).sort((left, right) => left - right);
}

function urlForScannedPort(host: string, port: number): string {
  if (port === 80) {
    return `http://${host}`;
  }
  if (port === 443) {
    return `https://${host}`;
  }
  return `http://${host}:${port}`;
}

function connectionTypeText(type: ConnectionType, t: ReturnType<typeof useTranslation>["t"]) {
  if (type === "local") {
    return t("connections.localTerminal");
  }
  return t(`connections.${type}` as const);
}
