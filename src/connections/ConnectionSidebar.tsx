import { defaultPortForConnectionType, connectionSubtitle, connectionTypeLabel, isRemoteDesktopConnectionType, localShellOptionsForPlatform, uniqueRuntimeId, type LocalShellOption } from "./utils";
import { collectConnectionFolderIds, countConnections, countFolders, filterConnectionTree, flattenConnections, flattenFolders, upsertRootConnection, withLiveConnectionStatuses } from "./treeUtils";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronRight, Folder, FolderPlus, Globe2, PanelRight, Play, Plus, Save, Search, Server, Terminal, X } from "lucide-react";
import { AddComputer as IconParkAddComputer, CollapseTextInput as IconParkCollapseTextInput, DataScreen as IconParkDataScreen, Delete as IconParkDelete, Edit as IconParkEdit, ExpandTextInput as IconParkExpandTextInput, FolderPlus as IconParkFolderPlus, LaptopComputer as IconParkLaptopComputer, Server as IconParkServer, Setting as IconParkSetting, Terminal as IconParkTerminal } from "@icon-park/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { invokeCommand, isTauriRuntime, selectKeyFile } from "../lib/tauri";
import { connectionTree } from "../sample-data";
import { useWorkspaceStore } from "../store";
import type { Connection, ConnectionFolder, ConnectionStatus, ConnectionTree, ConnectionType, CreateConnectionRequest, SplitDirection, SshSettings, UpdateConnectionRequest } from "../types";

type DraggedTreeItem =
  | { kind: "folder"; folderId: string }
  | { kind: "connection"; connectionId: string };

type TreeDropTarget =
  | { kind: "root"; targetIndex: number }
  | { kind: "folder"; folderId: string; targetIndex: number }
  | {
      kind: "connection";
      folderId?: string;
      connectionId: string;
      targetIndex: number;
    };

type TreeDragPreview = {
  kind: "folder" | "connection";
  title: string;
  subtitle?: string;
  connectionType?: ConnectionType;
  connectionStatus?: ConnectionStatus;
  connectionCount?: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
};

type PendingFolderDraft = {
  parentFolderId?: string;
};

type TreeContextMenuState =
  | {
      kind: "tree";
      x: number;
      y: number;
    }
  | {
      kind: "folder";
      folder: ConnectionFolder;
      x: number;
      y: number;
    }
  | {
      kind: "connection";
      connection: Connection;
      folderId?: string;
      x: number;
      y: number;
    };

type EditConnectionState = {
  connection: Connection;
  folderId?: string;
};

type ConnectionDialogRequest = CreateConnectionRequest & {
  password?: string;
  urlCredentialUsername?: string;
  urlPassword?: string;
};

type ConnectionTileType = ConnectionType;

const RECENT_CONNECTION_STORAGE_KEY = "admin-deck.recentConnectionIds";

const RECENT_CONNECTION_LIMIT = 5;

function loadRecentConnectionIds() {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const storedIds = JSON.parse(localStorage.getItem(RECENT_CONNECTION_STORAGE_KEY) ?? "[]");
    return Array.isArray(storedIds)
      ? storedIds.filter((connectionId): connectionId is string => typeof connectionId === "string")
      : [];
  } catch {
    return [];
  }
}

function saveRecentConnectionIds(connectionIds: string[]) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    RECENT_CONNECTION_STORAGE_KEY,
    JSON.stringify(connectionIds.slice(0, RECENT_CONNECTION_LIMIT)),
  );
}

export function ConnectionSidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const query = useWorkspaceStore((state) => state.query);
  const setQuery = useWorkspaceStore((state) => state.setQuery);
  const openConnection = useWorkspaceStore((state) => state.openConnection);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const addConnectionToTerminalPane = useWorkspaceStore((state) => state.addConnectionToTerminalPane);
  const activeSessionCounts = useWorkspaceStore((state) => state.activeSessionCounts);
  const sshSettings = useWorkspaceStore((state) => state.sshSettings);
  const [tree, setTree] = useState<ConnectionTree>(connectionTree);
  const [formMode, setFormMode] = useState<"save" | "quick" | null>(null);
  const [formError, setFormError] = useState("");
  const [treeError, setTreeError] = useState("");
  const [quickConnectMenuOpen, setQuickConnectMenuOpen] = useState(false);
  const [recentConnectionIds, setRecentConnectionIds] = useState(loadRecentConnectionIds);
  const [dropTarget, setDropTarget] = useState("");
  const [dragPreview, setDragPreview] = useState<TreeDragPreview | null>(null);
  const [draggedSourceId, setDraggedSourceId] = useState("");
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(() => new Set());
  const [pendingFolderDraft, setPendingFolderDraft] = useState<PendingFolderDraft | null>(null);
  const [treeContextMenu, setTreeContextMenu] = useState<TreeContextMenuState | null>(null);
  const [editConnection, setEditConnection] = useState<EditConnectionState | null>(null);
  const quickConnectRef = useRef<HTMLDivElement | null>(null);
  const draggedItemRef = useRef<DraggedTreeItem | null>(null);
  const pointerDragTargetRef = useRef<TreeDropTarget | null>(null);
  const pointerDragListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    stop: (event: PointerEvent) => void;
  } | null>(null);
  const suppressTreeClickRef = useRef(false);

  useEffect(() => {
    void reloadConnectionGroups();
  }, []);

  useEffect(() => {
    if (!quickConnectMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const node = quickConnectRef.current;
      if (node && !node.contains(event.target as Node)) {
        setQuickConnectMenuOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setQuickConnectMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [quickConnectMenuOpen]);

  useEffect(
    () => () => {
      removePointerDragListeners();
    },
    [],
  );

  async function reloadConnectionGroups() {
    try {
      setTree(await invokeCommand("list_connection_tree"));
    } catch {
      setTree(connectionTree);
    }
  }

  async function handleConnectionSaved(connection: Connection, folderId?: string) {
    if (folderId) {
      await reloadConnectionGroups();
    } else {
      setTree((currentTree) => upsertRootConnection(currentTree, connection));
    }
    setFormMode(null);
    setFormError("");
    setTreeError("");
  }

  function handleConnectionReady(connection: Connection) {
    setTree((currentTree) => upsertRootConnection(currentTree, connection));
    rememberConnection(connection);
    openConnection(connection);
    setFormMode(null);
    setFormError("");
    setTreeError("");
  }

  function rememberConnection(connection: Connection) {
    setRecentConnectionIds((currentIds) => {
      const nextIds = [
        connection.id,
        ...currentIds.filter((connectionId) => connectionId !== connection.id),
      ].slice(0, RECENT_CONNECTION_LIMIT);
      saveRecentConnectionIds(nextIds);
      return nextIds;
    });
  }

  function handleOpenConnection(connection: Connection) {
    rememberConnection(connection);
    openConnection(connection);
  }

  function handleAddConnectionToFocusedPane(connection: Connection, direction: SplitDirection) {
    if (connection.type === "url" || isRemoteDesktopConnectionType(connection.type)) {
      handleOpenConnection(connection);
      return;
    }

    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    if (!activeTab || activeTab.kind !== "terminal") {
      handleOpenConnection(connection);
      return;
    }
    rememberConnection(connection);
    addConnectionToTerminalPane(activeTab.id, connection, direction);
  }

  function handleQuickLocalShell(option: LocalShellOption) {
    setQuickConnectMenuOpen(false);
    const connection: Connection = {
      id: uniqueRuntimeId("quick"),
      name: option.label,
      host: "localhost",
      user: "local",
      type: "local",
      localShell: option.value,
      status: "idle",
    };
    openConnection(connection);
  }

  function handleQuickSsh(connection: Connection) {
    setQuickConnectMenuOpen(false);
    openConnection(connection);
  }

  async function handleQuickAdminShell(option: LocalShellOption) {
    if (!option.value) {
      return;
    }

    setTreeError("");
    setQuickConnectMenuOpen(false);
    try {
      await invokeCommand("launch_elevated_terminal", {
        request: {
          shell: option.value,
        },
      });
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function storeConnectionPassword(connectionId: string, password: string) {
    if (!isTauriRuntime()) {
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

  async function storeUrlPassword(connectionId: string, password: string) {
    if (!isTauriRuntime()) {
      return;
    }

    await invokeCommand("store_secret", {
      request: {
        kind: "urlPassword",
        ownerId: connectionId,
        secret: password,
      },
    });
  }

  async function upsertUrlCredential(connectionId: string, username: string) {
    if (!isTauriRuntime()) {
      return;
    }

    await invokeCommand("upsert_url_credential", {
      request: {
        connectionId,
        username,
      },
    });
  }

  async function handleConnectionSubmit(request: ConnectionDialogRequest) {
    setFormError("");
    const { password, urlCredentialUsername, urlPassword, ...connectionRequest } = request;
    if (formMode === "save") {
      try {
        const connection = await invokeCommand("create_connection", {
          request: connectionRequest,
        });
        if (password) {
          await storeConnectionPassword(connection.id, password);
        }
        if (connection.type === "url" && urlCredentialUsername && urlPassword) {
          await storeUrlPassword(connection.id, urlPassword);
          await upsertUrlCredential(connection.id, urlCredentialUsername);
        }
        await handleConnectionSaved(
          {
            ...connection,
            hasPassword: Boolean(password),
            urlCredentialUsername:
              connection.type === "url" && urlCredentialUsername ? urlCredentialUsername : undefined,
            hasUrlCredential: connection.type === "url" && Boolean(urlCredentialUsername && urlPassword),
          },
          connectionRequest.folderId,
        );
      } catch (error) {
        setFormError(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    const connection: Connection = {
      id: `quick-${Date.now()}`,
      name: connectionRequest.name || connectionRequest.host || connectionRequest.url || "Quick session",
      host: connectionRequest.host ?? "",
      user: connectionRequest.user ?? "",
      port: connectionRequest.port,
      keyPath: connectionRequest.keyPath,
      proxyJump: connectionRequest.proxyJump,
      authMethod: connectionRequest.authMethod,
      hasPassword: Boolean(password),
      type: connectionRequest.type,
      localShell: connectionRequest.localShell,
      url: connectionRequest.url,
      dataPartition: connectionRequest.dataPartition,
      useTmuxSessions: connectionRequest.useTmuxSessions,
      tmuxConnectionId:
        connectionRequest.type === "ssh" && connectionRequest.useTmuxSessions !== false
          ? uniqueRuntimeId("admindeck")
          : undefined,
      urlCredentialUsername:
        connectionRequest.type === "url" && urlCredentialUsername ? urlCredentialUsername : undefined,
      hasUrlCredential: connectionRequest.type === "url" && Boolean(urlCredentialUsername && urlPassword),
      status: "idle",
    };

    try {
      if (password) {
        await storeConnectionPassword(connection.id, password);
      }
      if (connection.type === "url" && urlCredentialUsername && urlPassword) {
        await storeUrlPassword(connection.id, urlPassword);
      }
      handleConnectionReady(connection);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleConnectionUpdate(request: ConnectionDialogRequest) {
    if (!editConnection) {
      return;
    }

    setFormError("");
    const { password, urlCredentialUsername, urlPassword, ...connectionRequest } = request;
    const updateRequest: UpdateConnectionRequest = {
      ...connectionRequest,
      id: editConnection.connection.id,
      type: editConnection.connection.type,
    };

    try {
      const connection = await invokeCommand("update_connection", {
        request: updateRequest,
      });
      if (password) {
        await storeConnectionPassword(connection.id, password);
      }
      if (connection.type === "url" && urlPassword) {
        await storeUrlPassword(connection.id, urlPassword);
      }
      if (connection.type === "url" && urlCredentialUsername) {
        await upsertUrlCredential(connection.id, urlCredentialUsername);
      }
      await reloadConnectionGroups();
      setEditConnection(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleCreateFolder(parentFolderId?: string) {
    setTreeError("");
    if (parentFolderId) {
      setCollapsedFolderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(parentFolderId);
        return nextIds;
      });
    }
    setPendingFolderDraft({ parentFolderId });
  }

  function handleCancelPendingFolder() {
    setPendingFolderDraft(null);
  }

  async function handleCommitPendingFolder(name: string, parentFolderId?: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      handleCancelPendingFolder();
      return;
    }

    setPendingFolderDraft(null);
    await createFolder(trimmedName, parentFolderId);
  }

  async function createFolder(name: string, parentFolderId?: string) {
    if (!name) {
      return;
    }

    try {
      setTreeError("");
      await invokeCommand("create_connection_folder", {
        request: { name, parentFolderId },
      });
      await reloadConnectionGroups();
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleRenameFolder(folder: ConnectionFolder) {
    const name = window.prompt("Rename folder", folder.name)?.trim();
    if (!name || name === folder.name) {
      return;
    }

    try {
      setTreeError("");
      await invokeCommand("rename_connection_folder", {
        request: { id: folder.id, name },
      });
      await reloadConnectionGroups();
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDeleteFolder(folder: ConnectionFolder) {
    if (!confirmDeleteFolder(folder)) {
      return;
    }

    try {
      setTreeError("");
      await invokeCommand("delete_connection_folder", {
        folderId: folder.id,
      });
      await reloadConnectionGroups();
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  function confirmDeleteFolder(folder: ConnectionFolder) {
    const childFolderCount = countFolders(folder.folders);
    const connectionCount = countConnections(folder);
    const detail =
      connectionCount === 0 && childFolderCount === 0
        ? `Delete folder "${folder.name}"?`
        : `Delete folder "${folder.name}", ${connectionCount} connection${
            connectionCount === 1 ? "" : "s"
          }, and ${childFolderCount} subfolder${childFolderCount === 1 ? "" : "s"}?`;
    return window.confirm(`${detail}\n\nThis cannot be undone.`);
  }

  async function handleRenameConnection(connection: Connection) {
    const name = window.prompt("Rename connection", connection.name)?.trim();
    if (!name || name === connection.name) {
      return;
    }

    try {
      setTreeError("");
      await invokeCommand("rename_connection", {
        request: { id: connection.id, name },
      });
      await reloadConnectionGroups();
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleMoveFolder(
    folderId: string,
    parentFolderId: string | undefined,
    targetIndex: number,
  ) {
    try {
      setTreeError("");
      setTree(
        await invokeCommand("move_connection_folder", {
          request: { id: folderId, parentFolderId, targetIndex },
        }),
      );
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleMoveConnection(
    connectionId: string,
    folderId: string | undefined,
    targetIndex: number,
  ) {
    try {
      setTreeError("");
      setTree(
        await invokeCommand("move_connection", {
          request: { id: connectionId, folderId, targetIndex },
        }),
      );
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDeleteConnection(connection: Connection) {
    if (!confirmDeleteConnection(connection)) {
      return;
    }

    try {
      setTreeError("");
      await invokeCommand("delete_connection", {
        connectionId: connection.id,
      });
      await reloadConnectionGroups();
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : String(error));
    }
  }

  function confirmDeleteConnection(connection: Connection) {
    return window.confirm(`Delete connection "${connection.name}"?\n\nThis cannot be undone.`);
  }

  const treeWithLiveStatuses = useMemo(
    () => withLiveConnectionStatuses(tree, activeSessionCounts),
    [activeSessionCounts, tree],
  );

  const filteredTree = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return treeWithLiveStatuses;
    }

    return filterConnectionTree(treeWithLiveStatuses, normalizedQuery);
  }, [query, treeWithLiveStatuses]);
  const quickConnectShellOptions = useMemo(() => localShellOptionsForPlatform(), []);
  const recentConnections = useMemo(() => {
    const connectionsById = new Map(
      flattenConnections(treeWithLiveStatuses).map((connection) => [connection.id, connection]),
    );
    return recentConnectionIds
      .map((connectionId) => connectionsById.get(connectionId))
      .filter((connection): connection is Connection => Boolean(connection))
      .slice(0, RECENT_CONNECTION_LIMIT);
  }, [recentConnectionIds, treeWithLiveStatuses]);
  const isTreeFiltered = query.trim().length > 0;

  function handleDragEnd() {
    draggedItemRef.current = null;
    pointerDragTargetRef.current = null;
    setDragPreview(null);
    setDraggedSourceId("");
    setDropTarget("");
  }

  function handleTreeClickCapture(event: ReactMouseEvent) {
    if (!suppressTreeClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressTreeClickRef.current = false;
  }

  function handleTreeContextMenu(event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setTreeContextMenu({
      kind: "tree",
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleConnectionContextMenu(
    connection: Connection,
    folderId: string | undefined,
    event: ReactMouseEvent<HTMLElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setTreeContextMenu({
      kind: "connection",
      connection,
      folderId,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleFolderContextMenu(folder: ConnectionFolder, event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setTreeContextMenu({
      kind: "folder",
      folder,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleToggleFolder(folderId: string) {
    setCollapsedFolderIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(folderId)) {
        nextIds.delete(folderId);
      } else {
        nextIds.add(folderId);
      }
      return nextIds;
    });
  }

  function handleExpandAllFolders() {
    setCollapsedFolderIds(new Set());
    setTreeContextMenu(null);
  }

  function handleCollapseAllFolders() {
    setCollapsedFolderIds(new Set(collectConnectionFolderIds(treeWithLiveStatuses.folders)));
    setTreeContextMenu(null);
  }

  function completeTreeDrop(item: DraggedTreeItem, target: TreeDropTarget) {
    if (item.kind === "folder") {
      if (target.kind === "connection") {
        return;
      }

      if (target.kind === "folder" && item.folderId === target.folderId) {
        return;
      }

      void handleMoveFolder(
        item.folderId,
        target.kind === "folder" ? target.folderId : undefined,
        target.targetIndex,
      );
      return;
    }

    if (item.kind === "connection") {
      if (target.kind === "connection" && item.connectionId === target.connectionId) {
        return;
      }

      void handleMoveConnection(
        item.connectionId,
        target.kind === "root" ? undefined : target.folderId,
        target.targetIndex,
      );
    }
  }

  function removePointerDragListeners() {
    const listeners = pointerDragListenersRef.current;
    if (!listeners) {
      return;
    }

    window.removeEventListener("pointermove", listeners.move);
    window.removeEventListener("pointerup", listeners.stop);
    window.removeEventListener("pointercancel", listeners.stop);
    pointerDragListenersRef.current = null;
  }

  function treeDropTargetFromElement(element: Element | null, item: DraggedTreeItem) {
    const row = element?.closest<HTMLElement>("[data-tree-drop-kind]");
    if (!row) {
      return null;
    }

    if (row.dataset.treeDropKind === "root") {
      return {
        kind: "root",
        targetIndex:
          item.kind === "connection"
            ? Number(row.dataset.connectionCount ?? 0)
            : Number(row.dataset.folderCount ?? 0),
      } satisfies TreeDropTarget;
    }

    if (row.dataset.treeDropKind === "folder") {
      const folderId = row.dataset.folderId;
      if (!folderId) {
        return null;
      }

      const connectionCount = Number(row.dataset.connectionCount ?? 0);
      const folderCount = Number(row.dataset.folderCount ?? 0);
      return {
        kind: "folder",
        folderId,
        targetIndex: item.kind === "connection" ? connectionCount : folderCount,
      } satisfies TreeDropTarget;
    }

    const folderId = row.dataset.folderId;
    const connectionId = row.dataset.connectionId;
    if (!connectionId) {
      return null;
    }

    return {
      kind: "connection",
      folderId: folderId || undefined,
      connectionId,
      targetIndex: Number(row.dataset.connectionIndex ?? 0),
    } satisfies TreeDropTarget;
  }

  function treeDropTargetId(target: TreeDropTarget) {
    if (target.kind === "root") {
      return "root";
    }

    return target.kind === "folder" ? `folder-${target.folderId}` : `connection-${target.connectionId}`;
  }

  function treeItemId(item: DraggedTreeItem) {
    return item.kind === "folder" ? `folder-${item.folderId}` : `connection-${item.connectionId}`;
  }

  function handlePointerDragStart(
    event: ReactPointerEvent<HTMLElement>,
    item: DraggedTreeItem,
    preview: Omit<TreeDragPreview, "x" | "y" | "offsetX" | "offsetY" | "width">,
  ) {
    if (isTreeFiltered || event.button !== 0) {
      return;
    }

    removePointerDragListeners();
    const sourceBounds = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const offsetX = startX - sourceBounds.left;
    const offsetY = startY - sourceBounds.top;
    const previewWidth = Math.min(sourceBounds.width, 320);
    const pointerId = event.pointerId;
    let dragStarted = false;
    pointerDragTargetRef.current = null;

    const updateDragPreview = (pointerEvent: PointerEvent) => {
      setDragPreview((currentPreview) =>
        currentPreview
          ? { ...currentPreview, x: pointerEvent.clientX, y: pointerEvent.clientY }
          : null,
      );
    };

    const startDrag = (pointerEvent: PointerEvent) => {
      if (dragStarted) {
        return;
      }

      dragStarted = true;
      draggedItemRef.current = item;
      suppressTreeClickRef.current = true;
      setDraggedSourceId(treeItemId(item));
      setDragPreview({
        ...preview,
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
        offsetX,
        offsetY,
        width: previewWidth,
      });
      setDropTarget("");
    };
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }

      if (!dragStarted) {
        const xMovement = Math.abs(pointerEvent.clientX - startX);
        const yMovement = Math.abs(pointerEvent.clientY - startY);
        if (xMovement < 4 && yMovement < 4) {
          return;
        }

        startDrag(pointerEvent);
      }

      pointerEvent.preventDefault();
      updateDragPreview(pointerEvent);
      const target = treeDropTargetFromElement(
        document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY),
        item,
      );
      pointerDragTargetRef.current = target;
      setDropTarget(target ? treeDropTargetId(target) : "");
    };
    const stop = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }

      if (!dragStarted) {
        removePointerDragListeners();
        return;
      }

      pointerEvent.preventDefault();
      const target = pointerDragTargetRef.current;
      const dragged = draggedItemRef.current;
      removePointerDragListeners();
      handleDragEnd();
      if (target && dragged) {
        completeTreeDrop(dragged, target);
      }
      window.setTimeout(() => {
        suppressTreeClickRef.current = false;
      }, 0);
    };

    pointerDragListenersRef.current = { move, stop };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  return (
    <aside className="connection-sidebar" aria-hidden={collapsed}>
      <div className="sidebar-header">
        <div>
          <h1>Connections</h1>
        </div>
        <div className="sidebar-actions">
          <button
            className="icon-button"
            aria-label="Add connection"
            title="Add connection"
            onClick={() => setFormMode("save")}
          >
            <Plus size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Collapse Connections column"
            title="Collapse Connections column"
            onClick={onToggleCollapsed}
            type="button"
          >
            <PanelRight size={17} />
          </button>
        </div>
      </div>

      <label className="search-box">
        <Search size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search hosts, folders"
        />
      </label>

      <div className="quick-connect-anchor" ref={quickConnectRef}>
        <button
          aria-expanded={quickConnectMenuOpen}
          aria-haspopup="menu"
          className="quick-connect"
          onClick={() => setQuickConnectMenuOpen((isOpen) => !isOpen)}
        >
          <Play size={15} />
          Quick connect
        </button>
        {quickConnectMenuOpen ? (
          <QuickConnectMenu
            recentConnections={recentConnections}
            shellOptions={quickConnectShellOptions}
            sshSettings={sshSettings}
            onOpenConnection={(connection) => {
              setQuickConnectMenuOpen(false);
              handleOpenConnection(connection);
            }}
            onOpenElevatedShell={(option) => void handleQuickAdminShell(option)}
            onOpenLocalShell={handleQuickLocalShell}
            onOpenSsh={handleQuickSsh}
          />
        ) : null}
      </div>
      <div className="tree-folder-controls" aria-label="Folder tree controls">
        <button
          aria-label="New folder"
          className="tree-folder-control"
          onClick={() => void handleCreateFolder()}
          title="New folder"
          type="button"
        >
          <FolderPlus size={13} />
        </button>
        <button
          aria-label="Collapse all folders"
          className="tree-folder-control"
          onClick={handleCollapseAllFolders}
          title="Collapse All"
          type="button"
        >
          <IconParkCollapseTextInput size={13} />
        </button>
        <button
          aria-label="Expand all folders"
          className="tree-folder-control"
          onClick={handleExpandAllFolders}
          title="Expand All"
          type="button"
        >
          <IconParkExpandTextInput size={13} />
        </button>
      </div>
      {treeError ? <p className="form-error tree-error">{treeError}</p> : null}

      <div
        className={`tree-list ${dropTarget === "root" ? "drop-target" : ""}`}
        aria-label="Connection tree"
        data-connection-count={filteredTree.connections.length}
        data-folder-count={filteredTree.folders.length}
        data-tree-drop-kind="root"
        onContextMenu={handleTreeContextMenu}
      >
        {filteredTree.connections.map((connection, connectionIndex) => (
          <ConnectionRow
            connection={connection}
            key={connection.id}
            connectionIndex={connectionIndex}
            dragDisabled={isTreeFiltered}
            isDraggingSource={draggedSourceId === `connection-${connection.id}`}
            isDropTarget={dropTarget === `connection-${connection.id}`}
            onClickCapture={handleTreeClickCapture}
            onOpen={() => handleOpenConnection(connection)}
            onContextMenu={(event) => handleConnectionContextMenu(connection, undefined, event)}
            onPointerDragStart={(event) =>
              handlePointerDragStart(
                event,
                { kind: "connection", connectionId: connection.id },
                {
                  kind: "connection",
                  title: connection.name,
                  subtitle: connection.host,
                  connectionType: connection.type,
                  connectionStatus: connection.status,
                },
              )
            }
          />
        ))}
        {pendingFolderDraft && !pendingFolderDraft.parentFolderId ? (
          <NewFolderDraftRow
            level={0}
            onCancel={handleCancelPendingFolder}
            onCommit={(name) => void handleCommitPendingFolder(name)}
          />
        ) : null}
        {filteredTree.folders.map((folder) => (
          <ConnectionFolderNode
            dragDisabled={isTreeFiltered}
            draggedSourceId={draggedSourceId}
            dropTarget={dropTarget}
            folder={folder}
            collapsedFolderIds={collapsedFolderIds}
            key={folder.id}
            level={0}
            onClickCapture={handleTreeClickCapture}
            pendingFolderDraft={pendingFolderDraft}
            onCancelPendingFolder={handleCancelPendingFolder}
            onCommitPendingFolder={handleCommitPendingFolder}
            onContextMenu={handleFolderContextMenu}
            onConnectionContextMenu={handleConnectionContextMenu}
            onCreateFolder={handleCreateFolder}
            onOpenConnection={handleOpenConnection}
            onPointerDragStart={handlePointerDragStart}
            onToggleFolder={handleToggleFolder}
          />
        ))}
      </div>

      {treeContextMenu ? (
        <TreeContextMenu
          menu={treeContextMenu}
          canAddToPane={Boolean(tabs.find((tab) => tab.id === activeTabId && tab.kind === "terminal"))}
          onClose={() => setTreeContextMenu(null)}
          onCreateConnection={() => {
            setTreeContextMenu(null);
            setFormMode("save");
          }}
          onCreateFolder={() => {
            setTreeContextMenu(null);
            handleCreateFolder();
          }}
          onDelete={() => {
            const menu = treeContextMenu;
            setTreeContextMenu(null);
            if (menu.kind === "connection") {
              void handleDeleteConnection(menu.connection);
            } else if (menu.kind === "folder") {
              void handleDeleteFolder(menu.folder);
            }
          }}
          onProperties={() => {
            const menu = treeContextMenu;
            setTreeContextMenu(null);
            if (menu.kind === "connection") {
              setFormError("");
              setEditConnection({ connection: menu.connection, folderId: menu.folderId });
            }
          }}
          onRename={() => {
            const menu = treeContextMenu;
            setTreeContextMenu(null);
            if (menu.kind === "connection") {
              void handleRenameConnection(menu.connection);
            } else if (menu.kind === "folder") {
              void handleRenameFolder(menu.folder);
            }
          }}
          onAddToPane={(direction) => {
            const menu = treeContextMenu;
            setTreeContextMenu(null);
            if (menu.kind === "connection") {
              handleAddConnectionToFocusedPane(menu.connection, direction);
            }
          }}
        />
      ) : null}

      {dragPreview ? <TreeDragPreview preview={dragPreview} /> : null}

      {formMode ? (
        <ConnectionDialog
          error={formError}
          tree={tree}
          mode={formMode}
          sshSettings={sshSettings}
          onCancel={() => {
            setFormMode(null);
            setFormError("");
          }}
          onSubmit={handleConnectionSubmit}
        />
      ) : null}
      {editConnection ? (
        <ConnectionDialog
          error={formError}
          initialConnection={editConnection.connection}
          initialFolderId={editConnection.folderId}
          tree={tree}
          mode="edit"
          sshSettings={sshSettings}
          onCancel={() => {
            setEditConnection(null);
            setFormError("");
          }}
          onSubmit={handleConnectionUpdate}
        />
      ) : null}
    </aside>
  );
}

function ConnectionFolderNode({
  collapsedFolderIds,
  dragDisabled,
  draggedSourceId,
  dropTarget,
  folder,
  level,
  onClickCapture,
  onCreateFolder,
  onOpenConnection,
  onPointerDragStart,
  onToggleFolder,
  onCancelPendingFolder,
  onCommitPendingFolder,
  onConnectionContextMenu,
  onContextMenu,
  pendingFolderDraft,
}: {
  collapsedFolderIds: Set<string>;
  dragDisabled: boolean;
  draggedSourceId: string;
  dropTarget: string;
  folder: ConnectionFolder;
  level: number;
  onClickCapture: (event: ReactMouseEvent) => void;
  onCreateFolder: (parentFolderId?: string) => void | Promise<void>;
  onOpenConnection: (connection: Connection) => void;
  onPointerDragStart: (
    event: ReactPointerEvent<HTMLElement>,
    item: DraggedTreeItem,
    preview: Omit<TreeDragPreview, "x" | "y" | "offsetX" | "offsetY" | "width">,
  ) => void;
  onToggleFolder: (folderId: string) => void;
  onCancelPendingFolder: () => void;
  onCommitPendingFolder: (name: string, parentFolderId?: string) => void | Promise<void>;
  onConnectionContextMenu: (
    connection: Connection,
    folderId: string | undefined,
    event: ReactMouseEvent<HTMLElement>,
  ) => void;
  onContextMenu: (folder: ConnectionFolder, event: ReactMouseEvent<HTMLElement>) => void;
  pendingFolderDraft: PendingFolderDraft | null;
}) {
  const connectionCount = countConnections(folder);
  const folderCount = countFolders(folder.folders);
  const isCollapsed = collapsedFolderIds.has(folder.id);

  return (
    <section className="tree-group" style={{ paddingLeft: level * 14 } as CSSProperties}>
      <div
        className={`tree-folder-row ${dragDisabled ? "" : "can-drag"} ${
          dropTarget === `folder-${folder.id}` ? "drop-target" : ""
        } ${draggedSourceId === `folder-${folder.id}` ? "dragging-source" : ""}`}
        data-connection-count={folder.connections.length}
        data-folder-count={folder.folders.length}
        data-folder-id={folder.id}
        data-tree-drop-kind="folder"
        onClickCapture={onClickCapture}
        onContextMenu={(event) => onContextMenu(folder, event)}
        onPointerDown={(event) =>
          onPointerDragStart(
            event,
            { kind: "folder", folderId: folder.id },
            {
              kind: "folder",
              title: folder.name,
              connectionCount,
            },
          )
        }
      >
        <div className="tree-folder">
          <button
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${folder.name}`}
            className="tree-disclosure"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFolder(folder.id);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            title={isCollapsed ? "Expand folder" : "Collapse folder"}
            type="button"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <Folder size={15} />
          <span>{folder.name}</span>
          <small>{connectionCount + folderCount}</small>
        </div>
        <span className="folder-actions">
          <button
            className="row-action"
            aria-label={`New subfolder in ${folder.name}`}
            onClick={() => void onCreateFolder(folder.id)}
          >
            <FolderPlus size={13} />
          </button>
        </span>
      </div>
      {!isCollapsed ? (
        <>
          {folder.connections.map((connection, connectionIndex) => (
            <ConnectionRow
              connection={connection}
              connectionIndex={connectionIndex}
              dragDisabled={dragDisabled}
              folderId={folder.id}
              isDraggingSource={draggedSourceId === `connection-${connection.id}`}
              isDropTarget={dropTarget === `connection-${connection.id}`}
              key={connection.id}
              onClickCapture={onClickCapture}
              onOpen={() => onOpenConnection(connection)}
              onContextMenu={(event) => onConnectionContextMenu(connection, folder.id, event)}
              onPointerDragStart={(event) =>
                onPointerDragStart(
                  event,
                  { kind: "connection", connectionId: connection.id },
                  {
                    kind: "connection",
                    title: connection.name,
                    subtitle: connection.host,
                    connectionType: connection.type,
                    connectionStatus: connection.status,
                  },
                )
              }
            />
          ))}
          {pendingFolderDraft?.parentFolderId === folder.id ? (
            <NewFolderDraftRow
              level={level + 1}
              onCancel={onCancelPendingFolder}
              onCommit={(name) => void onCommitPendingFolder(name, folder.id)}
            />
          ) : null}
          {folder.folders.map((childFolder) => (
            <ConnectionFolderNode
              collapsedFolderIds={collapsedFolderIds}
              dragDisabled={dragDisabled}
              draggedSourceId={draggedSourceId}
              dropTarget={dropTarget}
              folder={childFolder}
              key={childFolder.id}
              level={level + 1}
              onClickCapture={onClickCapture}
              pendingFolderDraft={pendingFolderDraft}
              onCancelPendingFolder={onCancelPendingFolder}
              onCommitPendingFolder={onCommitPendingFolder}
              onConnectionContextMenu={onConnectionContextMenu}
              onContextMenu={onContextMenu}
              onCreateFolder={onCreateFolder}
              onOpenConnection={onOpenConnection}
              onPointerDragStart={onPointerDragStart}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </>
      ) : null}
    </section>
  );
}

function NewFolderDraftRow({
  level,
  onCancel,
  onCommit,
}: {
  level: number;
  onCancel: () => void;
  onCommit: (name: string) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isSettledRef = useRef(false);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  const settle = (name: string) => {
    if (isSettledRef.current) {
      return;
    }

    isSettledRef.current = true;
    if (!name.trim()) {
      onCancel();
      return;
    }

    void onCommit(name);
  };

  return (
    <div className="tree-group pending-folder-group" style={{ paddingLeft: level * 14 } as CSSProperties}>
      <div className="tree-folder-row pending-folder-row">
        <div className="tree-folder pending-folder">
          <ChevronDown size={14} />
          <Folder size={15} />
          <input
            aria-label="New folder name"
            className="pending-folder-input"
            onBlur={(event) => settle(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                settle(event.currentTarget.value);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                isSettledRef.current = true;
                onCancel();
              }
            }}
            ref={inputRef}
          />
        </div>
      </div>
    </div>
  );
}

function TreeContextMenu({
  menu,
  canAddToPane,
  onClose,
  onCreateConnection,
  onCreateFolder,
  onDelete,
  onProperties,
  onRename,
  onAddToPane,
}: {
  menu: TreeContextMenuState;
  canAddToPane: boolean;
  onClose: () => void;
  onCreateConnection: () => void;
  onCreateFolder: () => void;
  onDelete: () => void;
  onProperties: () => void;
  onRename: () => void;
  onAddToPane: (direction: SplitDirection) => void;
}) {
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

    const bounds = node.getBoundingClientRect();
    const sidebarBounds = node.closest(".connection-sidebar")?.getBoundingClientRect();
    const minLeft = sidebarBounds ? sidebarBounds.left + 8 : 8;
    const maxLeft = sidebarBounds
      ? sidebarBounds.right - bounds.width - 8
      : window.innerWidth - bounds.width - 8;
    const left = Math.min(menu.x, maxLeft);
    const top = Math.min(menu.y, window.innerHeight - bounds.height - 8);
    node.style.left = `${Math.max(minLeft, left)}px`;
    node.style.top = `${Math.max(8, top)}px`;
  }, [menu.x, menu.y]);

  return (
    <div
      className="tree-context-menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      ref={menuRef}
      role="menu"
    >
      {menu.kind === "tree" ? (
        <>
          <button onClick={onCreateConnection} role="menuitem" type="button">
            <IconParkAddComputer className="menu-item-icon" size={15} />
            <span>New Connection</span>
          </button>
          <button onClick={onCreateFolder} role="menuitem" type="button">
            <IconParkFolderPlus className="menu-item-icon" size={15} />
            <span>New Folder</span>
          </button>
        </>
      ) : null}
      {menu.kind !== "tree" ? (
        <>
          <button onClick={onRename} role="menuitem" type="button">
            <IconParkEdit className="menu-item-icon" size={15} />
            <span>Rename</span>
          </button>
          <button onClick={onDelete} role="menuitem" type="button">
            <IconParkDelete className="menu-item-icon" size={15} />
            <span>Delete</span>
          </button>
        </>
      ) : null}
      {menu.kind === "connection" ? (
        <>
          {canAddToPane ? (
            <div className="tree-context-submenu" role="none">
              <button aria-haspopup="menu" className="tree-submenu-trigger" role="menuitem" type="button">
                <PanelRight className="menu-item-icon" size={15} />
                <span>Add to...</span>
                <ChevronRight className="menu-item-chevron" size={13} />
              </button>
              <div className="tree-context-submenu-menu" role="menu" aria-label="Add to pane">
                <button onClick={() => onAddToPane("left")} role="menuitem" type="button">
                  <ArrowLeft className="menu-item-icon" size={15} />
                  <span>Left</span>
                </button>
                <button onClick={() => onAddToPane("right")} role="menuitem" type="button">
                  <ArrowRight className="menu-item-icon" size={15} />
                  <span>Right</span>
                </button>
                <button onClick={() => onAddToPane("down")} role="menuitem" type="button">
                  <ArrowDown className="menu-item-icon" size={15} />
                  <span>Lower</span>
                </button>
                <button onClick={() => onAddToPane("up")} role="menuitem" type="button">
                  <ArrowUp className="menu-item-icon" size={15} />
                  <span>Upper</span>
                </button>
              </div>
            </div>
          ) : null}
          <button onClick={onProperties} role="menuitem" type="button">
            <IconParkSetting className="menu-item-icon" size={15} />
            <span>Properties</span>
          </button>
        </>
      ) : null}
    </div>
  );
}

export function QuickConnectMenu({
  recentConnections,
  shellOptions,
  sshSettings,
  onOpenConnection,
  onOpenElevatedShell,
  onOpenLocalShell,
  onOpenSsh,
}: {
  recentConnections: Connection[];
  shellOptions: LocalShellOption[];
  sshSettings: SshSettings;
  onOpenConnection: (connection: Connection) => void;
  onOpenElevatedShell: (option: LocalShellOption) => void;
  onOpenLocalShell: (option: LocalShellOption) => void;
  onOpenSsh: (connection: Connection) => void;
}) {
  const [sshDialogOpen, setSshDialogOpen] = useState(false);
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState(String(sshSettings.defaultPort));
  const normalizedSshPort = Number(sshPort || sshSettings.defaultPort);
  const canSubmitSsh =
    Boolean(sshHost.trim()) &&
    Number.isInteger(normalizedSshPort) &&
    normalizedSshPort >= 1 &&
    normalizedSshPort <= 65535;

  function handleSshSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const host = sshHost.trim();
    if (!canSubmitSsh) {
      return;
    }

    onOpenSsh({
      id: uniqueRuntimeId("quick"),
      name: host,
      host,
      user: sshSettings.defaultUser,
      port: normalizedSshPort,
      authMethod: "agent",
      type: "ssh",
      useTmuxSessions: false,
      status: "idle",
    });
  }

  return (
    <div className="quick-connect-menu" role="menu" aria-label="Quick connect">
      {sshDialogOpen ? (
        <form className="quick-connect-mini-dialog" onSubmit={handleSshSubmit}>
          <label>
            <span>Hostname</span>
            <input
              autoFocus
              onChange={(event) => setSshHost(event.currentTarget.value)}
              placeholder="example.internal"
              required
              value={sshHost}
            />
          </label>
          <label>
            <span>Port</span>
            <input
              inputMode="numeric"
              max="65535"
              min="1"
              onChange={(event) => setSshPort(event.currentTarget.value)}
              placeholder={String(sshSettings.defaultPort)}
              type="number"
              value={sshPort}
            />
          </label>
          <div className="quick-connect-mini-actions">
            <button disabled={!canSubmitSsh} type="submit">
              Connect
            </button>
            <button onClick={() => setSshDialogOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setSshDialogOpen(true)} role="menuitem" type="button">
          <Server size={15} />
          <span>SSH</span>
        </button>
      )}
      {shellOptions.map((option) =>
        option.canElevate ? (
          <div className="quick-connect-submenu" key={option.value ?? option.label}>
            <button aria-haspopup="menu" role="menuitem" type="button">
              <Terminal size={15} />
              <span>{option.label}</span>
              <ChevronDown size={13} />
            </button>
            <div className="quick-connect-submenu-panel" role="menu">
              <button onClick={() => onOpenLocalShell(option)} role="menuitem" type="button">
                Normal
              </button>
              <button onClick={() => onOpenElevatedShell(option)} role="menuitem" type="button">
                Admin
              </button>
            </div>
          </div>
        ) : (
          <button
            key={option.value ?? option.label}
            onClick={() => onOpenLocalShell(option)}
            role="menuitem"
            type="button"
          >
            <Terminal size={15} />
            <span>{option.label}</span>
          </button>
        ),
      )}
      <div className="quick-connect-menu-separator" role="separator" />
      {recentConnections.length > 0 ? (
        recentConnections.map((connection) => (
          <button
            key={connection.id}
            onClick={() => onOpenConnection(connection)}
            role="menuitem"
            type="button"
          >
            <ConnectionGlyph size={15} type={connection.type} />
            <span className="connection-main">
              <strong>{connection.name}</strong>
              <small>{connectionSubtitle(connection)}</small>
            </span>
            <span className={`status-dot ${connection.status}`} />
          </button>
        ))
      ) : (
        <button disabled role="menuitem" type="button">
          <Server size={15} />
          <span>No recent connections</span>
        </button>
      )}
    </div>
  );
}

const CONNECTION_TYPE_TILES: Array<{
  type: ConnectionTileType;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    type: "ssh",
    title: "SSH",
    description: "Secure shell",
    accent: "#374151",
  },
  {
    type: "local",
    title: "Terminal",
    description: "Local shell",
    accent: "#13a085",
  },
  {
    type: "url",
    title: "URL",
    description: "Embedded web app",
    accent: "#0ea5e9",
  },
  {
    type: "rdp",
    title: "Remote Desktop",
    description: "Windows RDP",
    accent: "#1d4ed8",
  },
  {
    type: "vnc",
    title: "VNC",
    description: "Screen control",
    accent: "#c026d3",
  },
];

const CONNECTION_ICON_FILLS: Record<Exclude<ConnectionTileType, "url">, string[]> = {
  ssh: ["#1f2937", "#f3f4f6", "#111827", "#6b7280"],
  local: ["#047857", "#d1fae5", "#065f46", "#34d399"],
  rdp: ["#1e3a8a", "#dbeafe", "#172554", "#60a5fa"],
  vnc: ["#a21caf", "#fae8ff", "#86198f", "#e879f9"],
};

function ConnectionTypeGlyph({
  className,
  size = 16,
  type,
}: {
  className?: string;
  size?: number;
  type: ConnectionTileType;
}) {
  if (type === "url") {
    return <Globe2 className={className} size={size} />;
  }

  const iconProps = {
    className,
    fill: CONNECTION_ICON_FILLS[type],
    size,
    strokeWidth: 3,
    theme: "multi-color" as const,
  };

  switch (type) {
    case "local":
      return <IconParkTerminal {...iconProps} />;
    case "rdp":
      return <IconParkDataScreen {...iconProps} />;
    case "vnc":
      return <IconParkLaptopComputer {...iconProps} />;
    case "ssh":
      return <IconParkServer {...iconProps} />;
  }
}

function ConnectionGlyph({
  className,
  size = 16,
  type,
}: {
  className?: string;
  size?: number;
  type: ConnectionType;
}) {
  if (type === "url") {
    return <Globe2 className={className} size={size} />;
  }
  return <ConnectionTypeGlyph className={className} size={size} type={type} />;
}

function ConnectionDialog({
  error,
  initialConnection,
  initialFolderId,
  tree,
  mode,
  sshSettings,
  onCancel,
  onSubmit,
}: {
  error: string;
  initialConnection?: Connection;
  initialFolderId?: string;
  tree: ConnectionTree;
  mode: "save" | "quick" | "edit";
  sshSettings: SshSettings;
  onCancel: () => void;
  onSubmit: (request: ConnectionDialogRequest) => void | Promise<void>;
}) {
  const [connectionType, setConnectionType] = useState<ConnectionType | "">(
    initialConnection?.type ?? "",
  );
  const [authMethod, setAuthMethod] = useState<"keyFile" | "password" | "agent">(
    initialConnection?.authMethod ?? "keyFile",
  );
  const [keyPath, setKeyPath] = useState(
    initialConnection?.keyPath ?? sshSettings.defaultKeyPath ?? "",
  );
  const usesSshDefaults = connectionType === "ssh";
  const usesRemoteDesktopFields = connectionType
    ? isRemoteDesktopConnectionType(connectionType)
    : false;
  const folderOptions = useMemo(() => flattenFolders(tree.folders), [tree.folders]);
  const localShellOptions = useMemo(() => localShellOptionsForPlatform(), []);
  const isEditMode = mode === "edit";
  const isUrlConnection = connectionType === "url";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connectionType) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const selectedLocalShell = String(
      form.get("localShell") ??
        initialConnection?.localShell ??
        localShellOptions[0]?.value ??
        "",
    );
    const selectedLocalShellLabel =
      localShellOptions.find((option) => (option.value ?? "") === selectedLocalShell)?.label ??
      "Local terminal";
    const rawUrl = String(form.get("url") ?? "").trim();
    const host =
      connectionType === "local"
        ? "localhost"
        : connectionType === "url"
          ? rawUrl
          : String(form.get("host") ?? "").trim();
    const requestedName = String(form.get("name") ?? "").trim();
    const name =
      connectionType === "local"
        ? requestedName || selectedLocalShellLabel
        : requestedName || host;
    const portValue = String(form.get("port") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const keyPath = String(form.get("keyPath") ?? "").trim();
    const proxyJump = String(form.get("proxyJump") ?? "").trim();
    const useTmuxSessions = form.get("useTmuxSessions") === "on";

    void onSubmit({
      name,
      host,
      user:
        connectionType === "local"
          ? "local"
          : connectionType === "url"
            ? initialConnection?.user ?? "web"
            : String(form.get("user") ?? "").trim(),
      type: connectionType,
      folderId: String(form.get("folderId") ?? "").trim() || undefined,
      port: portValue ? Number(portValue) : undefined,
      keyPath: usesSshDefaults && authMethod === "keyFile" ? keyPath || undefined : undefined,
      proxyJump: proxyJump || undefined,
      authMethod: usesSshDefaults ? authMethod : undefined,
      useTmuxSessions: usesSshDefaults ? useTmuxSessions : undefined,
      localShell: connectionType === "local" ? selectedLocalShell || undefined : undefined,
      url: connectionType === "url" ? rawUrl : undefined,
      dataPartition:
        connectionType === "url"
          ? String(form.get("dataPartition") ?? "").trim() || undefined
          : undefined,
      password:
        usesSshDefaults && authMethod === "password"
          ? password
          : usesRemoteDesktopFields
            ? password || undefined
            : undefined,
      urlCredentialUsername:
        connectionType === "url"
          ? String(form.get("urlCredentialUsername") ?? "").trim() || undefined
          : undefined,
      urlPassword: connectionType === "url" ? String(form.get("urlPassword") ?? "") || undefined : undefined,
    });
  }

  async function handleBrowseKeyFile() {
    const selectedPath = await selectKeyFile(keyPath || sshSettings.defaultKeyPath);
    if (selectedPath) {
      setKeyPath(selectedPath);
    }
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <form className="connection-dialog" onSubmit={handleSubmit}>
        <header
          className={mode === "quick" ? "connection-dialog-header" : "connection-dialog-header compact"}
        >
          <div>
            <p className="panel-label">
              {mode === "edit" ? "Connection properties" : mode === "save" ? "New connection" : "Quick connect"}
            </p>
            {mode === "quick" ? <h2>Open one-off session</h2> : null}
          </div>
          {mode === "quick" ? (
            <button className="icon-button" type="button" aria-label="Close" onClick={onCancel}>
              <X size={15} />
            </button>
          ) : null}
        </header>

        {isEditMode && initialConnection ? (
          <div className="connection-type-summary">
            <ConnectionGlyph size={20} type={initialConnection.type} />
            <span>
              <strong>{connectionTypeLabel(initialConnection.type)}</strong>
              <small>{connectionSubtitle(initialConnection)}</small>
            </span>
          </div>
        ) : (
          <fieldset className="connection-type-picker">
            <legend>Type*</legend>
            <div className="connection-type-grid">
              {CONNECTION_TYPE_TILES.map((tile) => (
                <button
                  aria-pressed={connectionType === tile.type}
                  className={`connection-type-tile ${connectionType === tile.type ? "selected" : ""}`}
                  key={tile.type}
                  onClick={() => setConnectionType(tile.type)}
                  style={{ "--tile-accent": tile.accent } as CSSProperties}
                  type="button"
                >
                  <span className="connection-type-icon">
                    <ConnectionTypeGlyph type={tile.type} size={32} />
                  </span>
                  <span className="connection-type-copy">
                    <strong>{tile.title}</strong>
                    <small>{tile.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {connectionType ? (
          <div className="connection-dialog-fields">
            {mode === "save" || mode === "edit" ? (
              <label>
                <span>Folder</span>
                <select name="folderId" defaultValue={initialFolderId ?? ""}>
                  <option value="">Root</option>
                  {folderOptions.map((option) => (
                    <option value={option.folder.id} key={option.folder.id}>
                      {"  ".repeat(option.level)}
                      {option.folder.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {connectionType === "local" ? (
              <>
                <label>
                  <span>Name(Optional)</span>
                  <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder="Connection name" />
                </label>
                <label>
                  <span>Shell</span>
                  <select
                    name="localShell"
                    defaultValue={initialConnection?.localShell ?? localShellOptions[0]?.value ?? ""}
                  >
                    {localShellOptions.map((option) => (
                      <option value={option.value ?? ""} key={option.value ?? option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : isUrlConnection ? (
              <>
                <label>
                  <span>Name(Optional)</span>
                  <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder="Connection name" />
                </label>
                <label>
                  <span>URL*</span>
                  <input name="url" defaultValue={initialConnection?.url ?? ""} placeholder="https://example.com" required />
                </label>
                <div className="form-grid">
                  <label>
                    <span>Data partition</span>
                    <input
                      name="dataPartition"
                      defaultValue={initialConnection?.dataPartition ?? ""}
                      placeholder="Default"
                    />
                  </label>
                  <label>
                    <span>Credential user</span>
                    <input
                      name="urlCredentialUsername"
                      defaultValue={initialConnection?.urlCredentialUsername ?? ""}
                      placeholder="Optional username"
                    />
                  </label>
                </div>
                <label>
                  <span>Password</span>
                  <input
                    autoComplete="current-password"
                    name="urlPassword"
                    placeholder={isEditMode ? "Leave blank to keep stored password" : "Stored in OS keychain"}
                    type="password"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>Name(Optional)</span>
                  <input name="name" defaultValue={initialConnection?.name ?? ""} placeholder="Connection name" />
                </label>

                <label>
                  <span>Host*</span>
                  <input
                    name="host"
                    defaultValue={initialConnection?.host ?? ""}
                    placeholder="example.internal"
                    required
                  />
                </label>

                <div className="form-grid">
                  <label>
                    <span>{connectionType === "vnc" ? "User" : "User*"}</span>
                    <input
                      key={`user-${connectionType}`}
                      name="user"
                      defaultValue={
                        initialConnection?.user ??
                        (connectionType === "ssh" ? sshSettings.defaultUser : "")
                      }
                      placeholder={
                        connectionType === "rdp"
                          ? "DOMAIN\\admin"
                          : connectionType === "vnc"
                            ? "Optional username"
                            : "admin"
                      }
                      required={connectionType !== "vnc"}
                    />
                  </label>
                  <label>
                    <span>Port</span>
                    <input
                      key={`port-${connectionType}`}
                      name="port"
                      defaultValue={
                        initialConnection?.port ?? defaultPortForConnectionType(connectionType, sshSettings)
                      }
                      inputMode="numeric"
                      min="1"
                      max="65535"
                      type="number"
                      placeholder={String(defaultPortForConnectionType(connectionType, sshSettings))}
                    />
                  </label>
                </div>
              </>
            )}

            {usesRemoteDesktopFields ? (
              <label>
                <span>Password</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  placeholder={isEditMode ? "Leave blank to keep stored password" : "Stored in OS keychain"}
                  type="password"
                />
              </label>
            ) : null}

            {usesSshDefaults ? (
              <>
                <div className="form-grid">
                  <label>
                    <span>Auth*</span>
                    <select
                      name="authMethod"
                      value={authMethod}
                      required
                      onChange={(event) =>
                        setAuthMethod(event.currentTarget.value as "keyFile" | "password" | "agent")
                      }
                    >
                      <option value="keyFile">Key file</option>
                      <option value="password">Password</option>
                      <option value="agent">SSH agent</option>
                    </select>
                  </label>
                  <label>
                    <span>Proxy jump</span>
                    <input
                      name="proxyJump"
                      defaultValue={initialConnection?.proxyJump ?? sshSettings.defaultProxyJump ?? ""}
                      placeholder="jump.internal"
                    />
                  </label>
                </div>

                {authMethod === "password" ? (
                  <label>
                    <span>Password*</span>
                    <input
                      name="password"
                      placeholder={isEditMode ? "Leave blank to keep stored password" : "Stored in OS keychain"}
                      required={!isEditMode}
                      type="password"
                    />
                  </label>
                ) : authMethod === "keyFile" ? (
                  <label>
                    <span>Key path</span>
                    <div className="input-with-button">
                      <input
                        name="keyPath"
                        onChange={(event) => setKeyPath(event.currentTarget.value)}
                        placeholder="C:\\Users\\ryan\\.ssh\\id_ed25519"
                        value={keyPath}
                      />
                      <button className="toolbar-button" onClick={handleBrowseKeyFile} type="button">
                        Browse
                      </button>
                    </div>
                  </label>
                ) : null}
                <label className="checkbox-row">
                  <input
                    name="useTmuxSessions"
                    type="checkbox"
                    defaultChecked={initialConnection?.useTmuxSessions ?? true}
                  />
                  <span>Use tmux sessions</span>
                </label>
              </>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <div className="dialog-actions">
          <button className="approve-button" disabled={!connectionType} type="submit">
            {mode === "quick" ? <Play size={15} /> : <Save size={15} />}
            {mode === "quick" ? "Connect" : "Save"}
          </button>
          <button className="toolbar-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function TreeDragPreview({ preview }: { preview: TreeDragPreview }) {
  const previewRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = previewRef.current;
    if (!node) {
      return;
    }

    node.style.left = `${preview.x - preview.offsetX}px`;
    node.style.top = `${preview.y - preview.offsetY}px`;
    node.style.width = `${preview.width}px`;
  }, [preview.offsetX, preview.offsetY, preview.width, preview.x, preview.y]);

  return (
    <div className={`tree-drag-preview ${preview.kind}`} ref={previewRef}>
      {preview.kind === "folder" ? (
        <Folder size={15} />
      ) : (
        <ConnectionGlyph size={15} type={preview.connectionType ?? "ssh"} />
      )}
      <span className="connection-main">
        <strong>{preview.title}</strong>
        {preview.subtitle ? <small>{preview.subtitle}</small> : null}
      </span>
      {preview.kind === "folder" ? (
        <small className="tree-drag-count">{preview.connectionCount ?? 0}</small>
      ) : preview.connectionStatus ? (
        <span className={`status-dot ${preview.connectionStatus}`} />
      ) : null}
    </div>
  );
}

function ConnectionRow({
  connection,
  connectionIndex,
  dragDisabled,
  folderId,
  isDraggingSource,
  isDropTarget,
  onClickCapture,
  onContextMenu,
  onOpen,
  onPointerDragStart,
}: {
  connection: Connection;
  connectionIndex: number;
  dragDisabled: boolean;
  folderId?: string;
  isDraggingSource: boolean;
  isDropTarget: boolean;
  onClickCapture: (event: ReactMouseEvent) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  onOpen: () => void;
  onPointerDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <div
      className={`connection-row ${dragDisabled ? "" : "can-drag"} ${
        isDropTarget ? "drop-target" : ""
      } ${isDraggingSource ? "dragging-source" : ""
      }`}
      data-connection-id={connection.id}
      data-connection-index={connectionIndex}
      data-folder-id={folderId ?? ""}
      data-tree-drop-kind="connection"
      onClickCapture={onClickCapture}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDragStart}
    >
      <button className="connection-open" onClick={onOpen}>
        <ConnectionGlyph size={16} type={connection.type} />
        <span className="connection-main">
          <strong>{connection.name}</strong>
          <small>{connectionSubtitle(connection)}</small>
        </span>
      </button>
      <span className={`status-dot ${connection.status}`} />
    </div>
  );
}
