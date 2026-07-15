import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import i18next from "../../../../i18n/config";
import { Actions, Btn, DIcon, DialogShell, Select, Sheet, TextInput } from "../../../../app/ui/dialog";
import {
  invokeCommand,
  isTauriRuntime,
  selectTerminalRecordingsExportFile,
} from "../../../../lib/tauri";
import { useWorkspaceStore } from "../../../../store";
import type { WorkspaceTab } from "../../../../types";
import { flattenConnections } from "../treeUtils";
import {
  DEFAULT_TERMINAL_RECORDING_COLUMN_WIDTHS,
  buildTerminalRecordingsExportName,
  filterAndSortTerminalRecordings,
  normalizeRecordingPath,
  recordingHostLabel,
  resizeTerminalRecordingColumn,
  resolveTerminalRecordingRows,
  terminalRecordingGridMinimumWidth,
  terminalRecordingGridTemplate,
  type RecordingDateRange,
  type RecordingSort,
  type RecordingSortKey,
  type TerminalRecordingColumnKey,
  type TerminalRecordingColumnWidths,
  type TerminalRecordingRow,
} from "./terminalRecordingsModel";

const FileViewerWorkspace = lazy(async () => ({
  default: (await import("../file-viewer/FileViewerWorkspace")).FileViewerWorkspace,
}));

export function TerminalRecordingsDialog() {
  const browser = useWorkspaceStore((state) => state.terminalRecordingsBrowser);
  const close = useWorkspaceStore((state) => state.closeTerminalRecordingsBrowser);
  if (!browser) {
    return null;
  }
  return (
    <TerminalRecordingsDialogContent
      initialConnectionId={browser.initialConnectionId}
      initialRecordingPath={browser.initialRecordingPath}
      key={browser.requestId}
      onClose={close}
    />
  );
}

function TerminalRecordingsDialogContent({
  initialConnectionId,
  initialRecordingPath,
  onClose,
}: {
  initialConnectionId?: string;
  initialRecordingPath?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [rows, setRows] = useState<TerminalRecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [host, setHost] = useState("all");
  const [range, setRange] = useState<RecordingDateRange>("all");
  const [sort, setSort] = useState<RecordingSort>({ key: "date", direction: "desc" });
  const [contentMatches, setContentMatches] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summaryBusy, setSummaryBusy] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<TerminalRecordingColumnWidths>(
    DEFAULT_TERMINAL_RECORDING_COLUMN_WIDTHS,
  );
  const [exporting, setExporting] = useState(false);
  const [viewingRow, setViewingRow] = useState<TerminalRecordingRow>();
  const currentRecordingRowRef = useRef<HTMLDivElement | null>(null);
  const didScrollToInitialRecording = useRef(false);
  const initialRecordingId = useMemo(
    () => (initialRecordingPath ? normalizeRecordingPath(initialRecordingPath) : undefined),
    [initialRecordingPath],
  );

  useEffect(() => {
    let canceled = false;
    async function load() {
      if (!isTauriRuntime()) {
        showStatusBarNotice(t("terminal.tauriRequired"), { tone: "error" });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [recordings, tree] = await Promise.all([
          invokeCommand("list_all_terminal_recordings"),
          invokeCommand("list_connection_tree", undefined),
        ]);
        if (canceled) {
          return;
        }
        const connections = flattenConnections(tree);
        const resolvedRows = resolveTerminalRecordingRows(recordings, connections);
        setRows(resolvedRows);
        if (initialRecordingId && resolvedRows.some((row) => row.id === initialRecordingId)) {
          setSelected(new Set([initialRecordingId]));
        }
        if (initialConnectionId) {
          const initialConnection = connections.find((connection) => connection.id === initialConnectionId);
          if (initialConnection) {
            setHost(recordingHostLabel(initialConnection, initialConnection.name));
          }
        }
      } catch (error) {
        if (!canceled) {
          showStatusBarNotice(
            t("terminal.recordingsLoadFailed", { message: errorMessage(error) }),
            { tone: "error" },
          );
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      canceled = true;
    };
  }, [initialConnectionId, initialRecordingId, showStatusBarNotice, t]);

  useEffect(() => {
    let canceled = false;
    const search = deferredQuery.trim();
    if (!search || !isTauriRuntime()) {
      setContentMatches(new Set());
      setSearching(false);
      return;
    }
    setSearching(true);
    void invokeCommand("search_terminal_recordings", { query: search })
      .then((paths) => {
        if (!canceled) {
          setContentMatches(new Set(paths.map(normalizeRecordingPath)));
        }
      })
      .catch((error) => {
        if (!canceled) {
          setContentMatches(new Set());
          showStatusBarNotice(
            t("terminal.recordingsSearchFailed", { message: errorMessage(error) }),
            { tone: "error" },
          );
        }
      })
      .finally(() => {
        if (!canceled) {
          setSearching(false);
        }
      });
    return () => {
      canceled = true;
    };
  }, [deferredQuery, showStatusBarNotice, t]);

  const hosts = useMemo(
    () => [...new Set(rows.map((row) => row.host))].sort((left, right) => left.localeCompare(right)),
    [rows],
  );
  const visibleRows = useMemo(
    () =>
      filterAndSortTerminalRecordings({
        rows,
        query: deferredQuery,
        contentMatches,
        host,
        range,
        sort,
      }),
    [contentMatches, deferredQuery, host, range, rows, sort],
  );
  useEffect(() => {
    if (
      loading ||
      !initialRecordingId ||
      didScrollToInitialRecording.current ||
      !currentRecordingRowRef.current
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      currentRecordingRowRef.current?.scrollIntoView({ block: "center" });
      didScrollToInitialRecording.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialRecordingId, loading, visibleRows]);
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.id)),
    [rows, selected],
  );
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.id));
  const totalSize = rows.reduce((sum, row) => sum + row.sizeBytes, 0);
  const selectedSize = selectedRows.reduce((sum, row) => sum + row.sizeBytes, 0);
  const batchSummarizing = summaryBusy.size > 0;
  const gridStyle = useMemo(
    () =>
      ({
        "--terminal-recordings-columns": terminalRecordingGridTemplate(columnWidths),
        "--terminal-recordings-min-width": `${terminalRecordingGridMinimumWidth(columnWidths)}px`,
      }) as CSSProperties,
    [columnWidths],
  );

  function toggleSort(key: RecordingSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function toggleSelected(row: TerminalRecordingRow) {
    setSelected((current) => toggleSetValue(current, row.id));
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of visibleRows) {
        if (allVisibleSelected) {
          next.delete(row.id);
        } else {
          next.add(row.id);
        }
      }
      return next;
    });
  }

  async function openFolder() {
    try {
      await invokeCommand("open_terminal_recordings_root");
    } catch (error) {
      showStatusBarNotice(
        t("terminal.recordingsFolderOpenFailed", { message: errorMessage(error) }),
        { tone: "error" },
      );
    }
  }

  async function summarize(row: TerminalRecordingRow, quiet = false) {
    if (row.aiSummary) {
      return true;
    }
    if (summaryBusy.has(row.id)) {
      return false;
    }
    setSummaryBusy((current) => new Set(current).add(row.id));
    try {
      const input = await invokeCommand("prepare_terminal_recording_summary", { path: row.path });
      const response = await invokeCommand("run_ai_agent", {
        request: {
          prompt:
            "Summarize this terminal recording in two concise sentences. State what the operator did, the outcome, and any unresolved error. Do not invent details. This is a cost-controlled sample of the beginning, command/error lines, periodic lines, and ending; if evidence is incomplete, say that the sampled log suggests the conclusion. Return plain text only.",
          contextLabel: `Terminal recording: ${row.fileName}`,
          selectedOutput: input.sample,
          systemContext:
            "This request is a read-only terminal-log summary. Do not call tools and do not propose commands.",
          activeConnectionId: row.connectionId,
          messages: [],
          outputLanguage: i18next.resolvedLanguage ?? i18next.language,
          allowTools: false,
        },
      });
      const summary = response.content.trim();
      await invokeCommand("save_terminal_recording_summary", {
        request: {
          path: row.path,
          summary,
          preview: input.preview,
          providerKind: response.providerKind,
          model: response.model,
        },
      });
      setRows((current) =>
        current.map((entry) =>
          entry.id === row.id
            ? {
                ...entry,
                aiSummary: summary,
                aiSummaryPreview: input.preview,
                aiSummaryModel: response.model,
              }
            : entry,
        ),
      );
      if (!quiet) {
        showStatusBarNotice(t("terminal.recordingsSummaryReady"), { tone: "success" });
      }
      return true;
    } catch (error) {
      showStatusBarNotice(
        t("terminal.recordingsSummaryFailed", { message: errorMessage(error) }),
        { tone: "error" },
      );
      return false;
    } finally {
      setSummaryBusy((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  }

  async function summarizeSelected() {
    let completed = 0;
    for (const row of selectedRows) {
      if (row.aiSummary) {
        continue;
      }
      if (await summarize(row, true)) {
        completed += 1;
      }
    }
    if (completed > 0) {
      showStatusBarNotice(t("terminal.recordingsSummariesReady", { count: completed }), {
        tone: "success",
      });
    }
  }

  async function exportSelected() {
    if (selectedRows.length === 0 || exporting) {
      return;
    }
    const defaultFilename = buildTerminalRecordingsExportName(selectedRows);
    const destination = await selectTerminalRecordingsExportFile({
      title: t("terminal.recordingsExportDialogTitle"),
      filterName: t("terminal.recordingsZipFiles"),
      defaultFilename,
    });
    if (!destination) {
      return;
    }
    setExporting(true);
    try {
      const result = await invokeCommand("export_terminal_recordings", {
        request: { paths: selectedRows.map((row) => row.path), destination },
      });
      showStatusBarNotice(
        t("terminal.recordingsExported", { count: result.count, path: result.destination }),
        { tone: "success" },
      );
    } catch (error) {
      showStatusBarNotice(
        t("terminal.recordingsExportFailed", { message: errorMessage(error) }),
        { tone: "error" },
      );
    } finally {
      setExporting(false);
    }
  }

  const typeLabels = {
    local: t("terminal.recordingsTypeLocal"),
    ssh: t("terminal.recordingsTypeSsh"),
    telnet: t("terminal.recordingsTypeTelnet"),
    serial: t("terminal.recordingsTypeSerial"),
    unknown: t("terminal.recordingsTypeUnknown"),
  };

  return (
    <>
    <DialogShell onBackdrop={onClose}>
      <Sheet
        ariaLabel={t("terminal.recordingsTitle")}
        className="terminal-recordings-dialog"
        closeAriaLabel={t("common.close")}
        footer={
          <>
            <Actions
              extraLeft={
                <span className="terminal-recordings-selection-status">
                  {selectedRows.length > 0
                    ? t("terminal.recordingsSelected", {
                        count: selectedRows.length,
                        size: formatByteCount(selectedSize),
                      })
                    : ""}
                </span>
              }
              primary={
                <span className="terminal-recordings-footer-actions">
                  <Btn
                    kind="ghost"
                    icon="wand"
                    disabled={selectedRows.length === 0 || batchSummarizing}
                    onClick={() => void summarizeSelected()}
                    sm
                  >
                    {batchSummarizing
                      ? t("terminal.recordingsSummarizing")
                      : t("terminal.recordingsSummarize")}
                  </Btn>
                  <Btn
                    kind="primary"
                    icon="download"
                    disabled={selectedRows.length === 0 || exporting}
                    onClick={() => void exportSelected()}
                  >
                    {exporting
                      ? t("terminal.recordingsExporting")
                      : t("terminal.recordingsExportZip")}
                  </Btn>
                </span>
              }
            />
            <TerminalRecordingsDialogResizeHandle
              label={t("terminal.recordingsResizeDialog")}
            />
          </>
        }
        onClose={onClose}
        rule
        sub={t("terminal.recordingsCount", {
          count: rows.length,
          size: formatByteCount(totalSize),
        })}
        title={t("terminal.recordingsTitle")}
      >
        <div className="terminal-recordings-toolbar">
          <label className={`terminal-recordings-search${searching ? " searching" : ""}`}>
            <DIcon name={searching ? "refresh" : "search"} size={15} />
            <TextInput
              aria-label={t("terminal.recordingsSearchPlaceholder")}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={t("terminal.recordingsSearchPlaceholder")}
              value={query}
            />
          </label>
          <Select
            aria-label={t("terminal.recordingsHost")}
            onChange={(event) => setHost(event.currentTarget.value)}
            options={[
              { value: "all", label: t("terminal.recordingsAllHosts") },
              ...hosts.map((value) => ({ value, label: value })),
            ]}
            value={host}
          />
          <Select
            aria-label={t("terminal.recordingsDate")}
            onChange={(event) => setRange(event.currentTarget.value as RecordingDateRange)}
            options={[
              { value: "all", label: t("terminal.recordingsAnyDate") },
              { value: "today", label: t("terminal.recordingsToday") },
              { value: "7d", label: t("terminal.recordingsLastSevenDays") },
            ]}
            value={range}
          />
          <button
            aria-label={t("terminal.openRecordingsFolder")}
            className="terminal-recordings-icon-button"
            onClick={() => void openFolder()}
            title={t("terminal.openRecordingsFolder")}
            type="button"
          >
            <DIcon name="folder" size={17} />
          </button>
        </div>

        <div className="terminal-recordings-grid" role="table" style={gridStyle}>
          <div className="terminal-recordings-grid-head" role="row">
            <div className="terminal-recordings-header-cell terminal-recordings-select-cell" role="columnheader">
              <RecordingCheckbox
                checked={allVisibleSelected}
                label={t("terminal.recordingsSelectAll")}
                onClick={toggleAllVisible}
              />
            </div>
            <RecordingHeaderCell
              column="name"
              label={t("terminal.recordingsName")}
              onResize={setColumnWidths}
              width={columnWidths.name}
            >
              <SortHeader label={t("terminal.recordingsName")} name="name" onSort={toggleSort} sort={sort} />
            </RecordingHeaderCell>
            <RecordingHeaderCell
              column="type"
              label={t("terminal.recordingsType")}
              onResize={setColumnWidths}
              width={columnWidths.type}
            >
              <SortHeader label={t("terminal.recordingsType")} name="type" onSort={toggleSort} sort={sort} />
            </RecordingHeaderCell>
            <RecordingHeaderCell
              column="host"
              label={t("terminal.recordingsHost")}
              onResize={setColumnWidths}
              width={columnWidths.host}
            >
              <SortHeader label={t("terminal.recordingsHost")} name="host" onSort={toggleSort} sort={sort} />
            </RecordingHeaderCell>
            <RecordingHeaderCell
              column="date"
              label={t("terminal.recordingsDate")}
              onResize={setColumnWidths}
              width={columnWidths.date}
            >
              <SortHeader label={t("terminal.recordingsDate")} name="date" onSort={toggleSort} sort={sort} />
            </RecordingHeaderCell>
            <RecordingHeaderCell
              column="time"
              label={t("terminal.recordingsTime")}
              onResize={setColumnWidths}
              width={columnWidths.time}
            >
              <span>{t("terminal.recordingsTime")}</span>
            </RecordingHeaderCell>
            <RecordingHeaderCell
              align="end"
              column="duration"
              label={t("terminal.recordingsDuration")}
              onResize={setColumnWidths}
              width={columnWidths.duration}
            >
              <SortHeader label={t("terminal.recordingsDuration")} name="duration" onSort={toggleSort} sort={sort} />
            </RecordingHeaderCell>
            <RecordingHeaderCell
              align="end"
              column="size"
              label={t("terminal.recordingsSize")}
              onResize={setColumnWidths}
              width={columnWidths.size}
            >
              <SortHeader label={t("terminal.recordingsSize")} name="size" onSort={toggleSort} sort={sort} />
            </RecordingHeaderCell>
            <RecordingHeaderCell
              column="summary"
              label={t("terminal.recordingsAiSummary")}
              onResize={setColumnWidths}
              width={columnWidths.summary}
            >
              <span>{t("terminal.recordingsAiSummary")}</span>
            </RecordingHeaderCell>
          </div>
          <div className="terminal-recordings-grid-body">
            {loading ? <RecordingSkeletonRows /> : null}
            {!loading && visibleRows.length === 0 ? (
              <div className="terminal-recordings-empty">
                <DIcon name="terminal" size={24} />
                <span>
                  {rows.length === 0
                    ? t("terminal.recordingsEmpty")
                    : t("terminal.recordingsNoMatch")}
                </span>
              </div>
            ) : null}
            {!loading
              ? visibleRows.map((row) => {
                  const busy = summaryBusy.has(row.id);
                  return (
                    <div
                      className="terminal-recordings-entry"
                      key={row.id}
                      ref={row.id === initialRecordingId ? currentRecordingRowRef : undefined}
                    >
                      <div
                        className={`terminal-recordings-grid-row${selected.has(row.id) ? " selected" : ""}`}
                        role="row"
                      >
                        <div className="terminal-recordings-cell terminal-recordings-select-cell" role="cell">
                          <RecordingCheckbox
                            checked={selected.has(row.id)}
                            label={t("terminal.recordingsSelectOne", { name: row.fileName })}
                            onClick={() => toggleSelected(row)}
                          />
                        </div>
                        <div className="terminal-recordings-cell" role="cell">
                          <button
                            className="terminal-recordings-name"
                            onClick={() => setViewingRow(row)}
                            title={t("terminal.recordingsOpenBuiltInEditor", { name: row.fileName })}
                            type="button"
                          >
                            <DIcon name="terminal" size={14} />
                            <span>{row.fileName}</span>
                          </button>
                        </div>
                        <div className="terminal-recordings-cell" role="cell">
                          <span
                            className={`terminal-recordings-type terminal-recordings-type-${row.recordingType}`}
                          >
                            {typeLabels[row.recordingType]}
                          </span>
                        </div>
                        <div className="terminal-recordings-cell" role="cell">
                          <span className="terminal-recordings-host" title={row.connectionName}>
                            {row.host}
                          </span>
                        </div>
                        <div className="terminal-recordings-cell" role="cell">
                          <span>{formatDate(row.timestampMillis)}</span>
                        </div>
                        <div className="terminal-recordings-cell" role="cell">
                          <span className="terminal-recordings-mono">{formatTime(row.timestampMillis)}</span>
                        </div>
                        <div className="terminal-recordings-cell terminal-recordings-cell-end" role="cell">
                          <span className="terminal-recordings-number">
                            {formatDuration(row.durationMillis)}
                          </span>
                        </div>
                        <div className="terminal-recordings-cell terminal-recordings-cell-end" role="cell">
                          <span className="terminal-recordings-number">{formatByteCount(row.sizeBytes)}</span>
                        </div>
                        <div className="terminal-recordings-cell terminal-recordings-summary-column" role="cell">
                          <button
                            className={`terminal-recordings-summary-cell${row.aiSummary ? " ready" : ""}`}
                            disabled={busy}
                            onClick={row.aiSummary ? undefined : () => void summarize(row)}
                            title={row.aiSummary ?? t("terminal.recordingsGenerateSummary")}
                            type="button"
                          >
                            <DIcon name={busy ? "refresh" : "wand"} size={14} />
                            <span>
                              {busy
                                ? t("terminal.recordingsSummarizing")
                                : row.aiSummary ?? t("terminal.recordingsGenerateSummary")}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      </Sheet>
    </DialogShell>
    {viewingRow ? (
      <TerminalRecordingViewerDialog row={viewingRow} onClose={() => setViewingRow(undefined)} />
    ) : null}
    </>
  );
}

function TerminalRecordingViewerDialog({
  row,
  onClose,
}: {
  row: TerminalRecordingRow;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const tab = useMemo<WorkspaceTab>(
    () => ({
      id: `terminal-recording-viewer-${row.id}`,
      title: row.fileName,
      toolbarTitle: row.fileName,
      subtitle: row.path,
      kind: "fileViewer",
      panes: [],
      connection: {
        id: `terminal-recording-file-${row.id}`,
        name: row.fileName,
        host: "localhost",
        user: "",
        localStartupDirectory: row.path,
        type: "fileView",
        status: "idle",
      },
    }),
    [row],
  );

  return (
    <DialogShell onBackdrop={onClose} zClassName="kk-qc-subdialog">
      <Sheet
        ariaLabel={row.fileName}
        className="terminal-recording-viewer-dialog"
        closeAriaLabel={t("common.close")}
        onClose={onClose}
        rule
        sub={row.path}
        title={row.fileName}
      >
        <Suspense
          fallback={
            <div className="terminal-recording-viewer-loading">
              {t("workspace.fileViewer.loading")}
            </div>
          }
        >
          <FileViewerWorkspace embeddedDialog isActive tab={tab} />
        </Suspense>
      </Sheet>
    </DialogShell>
  );
}

function TerminalRecordingsDialogResizeHandle({ label }: { label: string }) {
  const dragStart = useRef<
    | {
        height: number;
        pointerId: number;
        startX: number;
        startY: number;
        width: number;
      }
    | undefined
  >(undefined);

  function dialogFor(target: HTMLElement) {
    return target.closest<HTMLElement>(".terminal-recordings-dialog");
  }

  function resizeDialog(dialog: HTMLElement, width: number, height: number) {
    const maxWidth = Math.max(320, window.innerWidth - 24);
    const maxHeight = Math.max(320, window.innerHeight - 24);
    const minWidth = Math.min(840, maxWidth);
    const minHeight = Math.min(520, maxHeight);
    dialog.style.setProperty(
      "--terminal-recordings-dialog-width",
      `${Math.min(maxWidth, Math.max(minWidth, Math.round(width)))}px`,
    );
    dialog.style.setProperty(
      "--terminal-recordings-dialog-height",
      `${Math.min(maxHeight, Math.max(minHeight, Math.round(height)))}px`,
    );
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const dialog = dialogFor(event.currentTarget);
    if (!dialog) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = dialog.getBoundingClientRect();
    dragStart.current = {
      height: bounds.height,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: bounds.width,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = dragStart.current;
    const dialog = dialogFor(event.currentTarget);
    if (!start || start.pointerId !== event.pointerId || !dialog) {
      return;
    }
    resizeDialog(
      dialog,
      start.width + event.clientX - start.startX,
      start.height + event.clientY - start.startY,
    );
  }

  function finishPointerResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragStart.current?.pointerId !== event.pointerId) {
      return;
    }
    dragStart.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleResizeKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    const dialog = dialogFor(event.currentTarget);
    if (!dialog) {
      return;
    }
    event.preventDefault();
    const bounds = dialog.getBoundingClientRect();
    const step = event.shiftKey ? 64 : 24;
    resizeDialog(
      dialog,
      bounds.width + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      bounds.height + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
    );
  }

  return (
    <button
      aria-label={label}
      className="terminal-recordings-dialog-resizer"
      onKeyDown={handleResizeKey}
      onPointerCancel={finishPointerResize}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerResize}
      title={label}
      type="button"
    />
  );
}

function RecordingHeaderCell({
  align,
  children,
  column,
  label,
  onResize,
  width,
}: {
  align?: "end";
  children: ReactNode;
  column: TerminalRecordingColumnKey;
  label: string;
  onResize: (
    update: (current: TerminalRecordingColumnWidths) => TerminalRecordingColumnWidths,
  ) => void;
  width: number;
}) {
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    startWidth: number;
    startX: number;
  }>();

  function resizeTo(nextWidth: number) {
    onResize((current) => resizeTerminalRecordingColumn(current, column, nextWidth));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      startWidth: width,
      startX: event.clientX,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!dragStart || dragStart.pointerId !== event.pointerId) {
      return;
    }
    resizeTo(dragStart.startWidth + event.clientX - dragStart.startX);
  }

  function finishPointerResize(event: ReactPointerEvent<HTMLSpanElement>) {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(undefined);
    }
  }

  function handleResizeKey(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const step = event.shiftKey ? 40 : 12;
    resizeTo(width + (event.key === "ArrowRight" ? step : -step));
  }

  return (
    <div
      className={`terminal-recordings-header-cell${align === "end" ? " align-end" : ""}`}
      role="columnheader"
    >
      {children}
      <span
        aria-label={label}
        aria-orientation="vertical"
        aria-valuenow={width}
        className={`terminal-recordings-column-resizer${dragStart ? " dragging" : ""}`}
        onKeyDown={handleResizeKey}
        onPointerCancel={finishPointerResize}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerResize}
        role="separator"
        tabIndex={0}
      />
    </div>
  );
}

function RecordingCheckbox({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`terminal-recordings-checkbox${checked ? " checked" : ""}`}
      onClick={onClick}
      role="checkbox"
      type="button"
    >
      {checked ? <DIcon name="check" size={11} /> : null}
    </button>
  );
}

function SortHeader({
  label,
  name,
  onSort,
  sort,
}: {
  label: string;
  name: RecordingSortKey;
  onSort: (key: RecordingSortKey) => void;
  sort: RecordingSort;
}) {
  return (
    <button className="terminal-recordings-sort" onClick={() => onSort(name)} type="button">
      {label}
      {sort.key === name ? <span>{sort.direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

function RecordingSkeletonRows() {
  return (
    <div aria-hidden="true" className="terminal-recordings-skeletons">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="terminal-recordings-skeleton" key={index}>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function toggleSetValue(values: Set<string>, value: string) {
  const next = new Set(values);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatByteCount(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(timestamp: number) {
  if (!timestamp) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

function formatTime(timestamp: number) {
  if (!timestamp) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function formatDuration(duration: number | undefined) {
  if (duration === undefined) {
    return "—";
  }
  const totalSeconds = Math.max(0, Math.round(duration / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
