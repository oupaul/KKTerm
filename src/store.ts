import { create } from "zustand";
import {
  defaultAppearanceSettings,
  defaultAiProviderSettings,
  defaultRdpSettings,
  defaultSftpSettings,
  defaultSshSettings,
  defaultUrlSettings,
  defaultVncSettings,
  defaultGeneralSettings,
  defaultDashboardSettings,
  defaultTerminalSettings,
  initialTabs,
} from "./app-defaults";
import {
  defaultLayoutFor,
  ensureLayout,
  hydrateLayout,
  leafOrder,
  serializeLayout,
  splitLayout,
} from "./modules/workspace/layout";
import type {
  AppearanceSettings,
  AiProviderSettings,
  AssistantContextSnippet,
  Connection,
  PerformanceMetrics,
  PerformanceSnapshot,
  HostUsageSnapshot,
  RdpSettings,
  SftpSettings,
  SplitDirection,
  UrlSettings,
  VncSettings,
  SshSettings,
  StoredConnectionLayout,
  TerminalPane,
  GeneralSettings,
  DashboardSettings,
  QuickCommand,
  TerminalSettings,
  TerminalStartMetric,
  LayoutNode,
  WorkspacePane,
  StatusBarNotice,
  WorkspaceChildConnection,
  WorkspaceTab,
} from "./types";
import i18next from "./i18n/config";
import { invokeCommand } from "./lib/tauri";
import { elevatedLocalShellAction } from "./modules/workspace/connections/quickConnectMenuModel";
import type { LocalShellOption } from "./modules/workspace/connections/utils";
import { markPanesForRuntimeMove } from "./modules/workspace/paneRegistry";

const LAYOUT_STORAGE_PREFIX = "kkterm.layout.";
const TMUX_SESSION_STORAGE_PREFIX = "kkterm.tmuxSessions.";
const QUICK_COMMAND_BAR_STORAGE_PREFIX = "kkterm.quickCommandBar.";
const QUICK_COMMANDS_STORAGE_PREFIX = "kkterm.quickCommands.";
const TMUX_SESSION_ID_PATTERN = /^[^\s:;]+$/u;
export const CHILD_CONNECTION_CLOSED_EVENT = "kkterm:workspace-child-connection-closed";
let statusBarNoticeSequence = 0;
// English fallback names used only when the active locale has no tmux-safe
// ai.tmuxSessionLabels pool. Locales own their pool; names do not map by index.
const TMUX_SESSION_NAMES = [
  "airlock",
  "andromeda",
  "antimatter",
  "asteroid",
  "astronaut",
  "atmosphere",
  "aurora",
  "binary",
  "biosphere",
  "blackhole",
  "blazar",
  "capsule",
  "celestial",
  "chromosphere",
  "chronos",
  "cluster",
  "comet",
  "constellation",
  "corona",
  "cosmos",
  "crater",
  "cryo",
  "cyber",
  "datasphere",
  "deepspace",
  "docking",
  "domeshield",
  "drift",
  "dwarfstar",
  "eclipse",
  "electromag",
  "equinox",
  "event",
  "exoplanet",
  "exosphere",
  "filament",
  "flyby",
  "fusion",
  "galaxy",
  "gateway",
  "geodesic",
  "gluon",
  "gravity",
  "hangar",
  "helix",
  "holodeck",
  "horizon",
  "hydrogen",
  "hypernova",
  "hyperspace",
  "ignition",
  "impulse",
  "inertia",
  "infrared",
  "iondrive",
  "ionosphere",
  "jetstream",
  "jumpgate",
  "jupiter",
  "kepler",
  "launchpad",
  "lightyear",
  "lithium",
  "lodestar",
  "mainframe",
  "mars",
  "mercury",
  "meteor",
  "mission",
  "moonbase",
  "moonshot",
  "nebula",
  "neptune",
  "netrunner",
  "neutron",
  "nextgen",
  "nova",
  "observatory",
  "orbit",
  "orion",
  "parsec",
  "payload",
  "photon",
  "planetoid",
  "plasma",
  "polaris",
  "probe",
  "pulsar",
  "quantum",
  "quasar",
  "redshift",
  "rover",
  "satellite",
  "singularity",
  "solarwind",
  "spacelab",
  "stardust",
  "starship",
  "sunspot",
  "supernova",
];

export function forgetTmuxSessionId(connectionId: string, sessionId: string) {
  const sessionIds = loadStoredTmuxSessionIds(connectionId).filter((entry) => entry !== sessionId);
  persistTmuxSessionIds(connectionId, sessionIds);
}

function replaceTmuxSessionId(connectionId: string, previousSessionId: string, nextSessionId: string) {
  const sessionIds = loadStoredTmuxSessionIds(connectionId);
  const nextSessionIds = sessionIds.map((entry) => (entry === previousSessionId ? nextSessionId : entry));
  if (!nextSessionIds.includes(nextSessionId)) {
    nextSessionIds.push(nextSessionId);
  }
  persistTmuxSessionIds(connectionId, Array.from(new Set(nextSessionIds)));
}

function loadStoredLayout(
  connectionId: string,
): StoredConnectionLayout | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(
      `${LAYOUT_STORAGE_PREFIX}${connectionId}`,
    );
    return raw ? (JSON.parse(raw) as StoredConnectionLayout) : undefined;
  } catch {
    return undefined;
  }
}

function persistLayout(
  connectionId: string,
  stored: StoredConnectionLayout | undefined,
) {
  if (typeof window === "undefined") {
    return;
  }
  const key = `${LAYOUT_STORAGE_PREFIX}${connectionId}`;
  try {
    if (!stored) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function clearStoredLayouts() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(LAYOUT_STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function loadStoredTmuxSessionIds(connectionId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(
      `${TMUX_SESSION_STORAGE_PREFIX}${connectionId}`,
    );
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter(isCurrentTmuxSessionId) : [];
  } catch {
    return [];
  }
}

function persistTmuxSessionIds(connectionId: string, sessionIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      `${TMUX_SESSION_STORAGE_PREFIX}${connectionId}`,
      JSON.stringify(sessionIds),
    );
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function loadStoredQuickCommandBarVisible(connectionId: string | undefined) {
  if (!connectionId || typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(`${QUICK_COMMAND_BAR_STORAGE_PREFIX}${connectionId}`) === "true";
  } catch {
    return false;
  }
}

function persistQuickCommandBarVisible(connectionId: string | undefined, visible: boolean) {
  if (!connectionId || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(`${QUICK_COMMAND_BAR_STORAGE_PREFIX}${connectionId}`, visible ? "true" : "false");
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function loadStoredQuickCommands(connectionId: string | undefined): QuickCommand[] {
  if (!connectionId || typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(`${QUICK_COMMANDS_STORAGE_PREFIX}${connectionId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter(isQuickCommand) : [];
  } catch {
    return [];
  }
}

function persistQuickCommands(connectionId: string | undefined, commands: QuickCommand[]) {
  if (!connectionId || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(`${QUICK_COMMANDS_STORAGE_PREFIX}${connectionId}`, JSON.stringify(commands));
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function isQuickCommand(value: unknown): value is QuickCommand {
  if (!value || typeof value !== "object") {
    return false;
  }
  const command = value as Partial<QuickCommand>;
  return (
    typeof command.id === "string" &&
    typeof command.label === "string" &&
    typeof command.command === "string" &&
    typeof command.iconName === "string" &&
    typeof command.accentName === "string" &&
    typeof command.sendEnter === "boolean" &&
    typeof command.confirm === "boolean"
  );
}

function connectionUsesTmux(connection: Connection) {
  return connection.type === "ssh" && connection.useTmuxSessions !== false;
}

function isRemoteDesktopConnection(connection: Connection) {
  return connection.type === "rdp" || connection.type === "vnc";
}

export function tmuxSessionIdsForConnection(connection: Connection, count: number) {
  if (!connectionUsesTmux(connection)) {
    return [];
  }
  const sessionIds = loadStoredTmuxSessionIds(connection.id).slice(0, count);
  while (sessionIds.length < count) {
    sessionIds.push(generateTmuxSessionId(sessionIds));
  }
  persistTmuxSessionIds(connection.id, sessionIds);
  return sessionIds;
}

export function appendTmuxSessionId(connection: Connection) {
  if (!connectionUsesTmux(connection)) {
    return undefined;
  }
  const sessionIds = loadStoredTmuxSessionIds(connection.id);
  const sessionId = generateTmuxSessionId(sessionIds);
  sessionIds.push(sessionId);
  persistTmuxSessionIds(connection.id, sessionIds);
  return sessionId;
}

function generateTmuxSessionId(existingSessionIds: string[]) {
  const existing = new Set(existingSessionIds);
  const namePool = tmuxSessionNamePool();

  for (let attempt = 0; attempt < namePool.length * 2; attempt += 1) {
    const candidate = randomTmuxName(namePool);
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    for (let attempt = 0; attempt < namePool.length; attempt += 1) {
      const candidate = `${randomTmuxName(namePool)}${formatTmuxSessionNumber(suffix)}`;
      if (!existing.has(candidate)) {
        return candidate;
      }
    }
  }

  return `${randomTmuxName(namePool)}${formatTmuxSessionNumber((Date.now() % 98) + 2)}`;
}

function isCurrentTmuxSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    TMUX_SESSION_ID_PATTERN.test(value) &&
    !Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  );
}

function tmuxSessionNamePool() {
  try {
    const labels = i18next.t("ai.tmuxSessionLabels", { returnObjects: true });
    if (Array.isArray(labels)) {
      const names = labels.filter((label): label is string => isCurrentTmuxSessionId(label));
      if (names.length > 0) {
        return names;
      }
    }
  } catch {
    // Fall back below.
  }
  return TMUX_SESSION_NAMES;
}

function randomTmuxName(namePool: string[]) {
  const index = randomTmuxIndex(namePool.length);
  return namePool[index] ?? "airlock";
}

function randomTmuxIndex(max: number) {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return (bytes[0] ?? 0) % max;
  }
  return Math.floor(Math.random() * max);
}

function formatTmuxSessionNumber(value: number) {
  return String(Math.max(2, value)).padStart(2, "0");
}

function buildPanesForConnection(
  connection: Connection,
  count: number,
): TerminalPane[] {
  const baseId = connection.id;
  const baseTitle = terminalPaneTitleForConnection(connection);
  const baseCwd = defaultTerminalCwdForConnection(connection);
  const tmuxSessionIds = tmuxSessionIdsForConnection(connection, count);
  const panes: TerminalPane[] = [];
  for (let index = 0; index < count; index += 1) {
    panes.push({
      id:
        index === 0
          ? `pane-${baseId}`
          : createPaneId(baseId),
      title: index === 0 ? baseTitle : `${baseTitle} ${index + 1}`,
      toolbarTitle: toolbarTitleForConnection(connection),
      cwd: baseCwd,
      buffer: "",
      connection,
      tmuxSessionId: tmuxSessionIds[index],
    });
  }
  return panes;
}

function buildPanesFromStoredLayout(
  connection: Connection,
  stored?: StoredConnectionLayout,
): WorkspacePane[] {
  const paneCount = Math.max(1, stored?.paneCount ?? 1);
  const fallback =
    connection.type === "url" || isRemoteDesktopConnection(connection)
      ? Array.from({ length: paneCount }, () => {
          const pane = buildPaneForConnection(connection);
          return pane ? { ...pane, id: createPaneId(connection.id) } : null;
        }).filter((pane): pane is WorkspacePane => Boolean(pane))
      : buildPanesForConnection(connection, paneCount);
  if (!stored?.panes?.length) {
    return fallback;
  }
  return Array.from({ length: paneCount }, (_, index) => {
    const fallbackPane = fallback[index] ?? buildPaneForConnection(connection);
    const storedPane = stored.panes?.[index];
    const pane = storedPane?.connection
      ? buildPaneFromStoredLayoutPane(storedPane, index)
      : fallbackPane;
    return pane ?? fallbackPane;
  }).filter((pane): pane is WorkspacePane => Boolean(pane));
}

function buildPaneFromStoredLayoutPane(
  storedPane: NonNullable<StoredConnectionLayout["panes"]>[number],
  _index: number,
): WorkspacePane | null {
  const connection = storedPane.connection;
  const id = createPaneId(connection.id);
  const title = storedPane.title?.trim() || titleForConnectionPane(connection);
  const toolbarTitle = toolbarTitleForConnection(connection);
  if (connection.type === "url") {
    if (!connection.url) {
      return null;
    }
    return {
      kind: "webview",
      id,
      title,
      toolbarTitle,
      connection,
      url: storedPane.url?.trim() || connection.url,
      dataPartition: storedPane.dataPartition ?? connection.dataPartition,
    };
  }
  if (isRemoteDesktopConnection(connection)) {
    return {
      kind: "remoteDesktop",
      id,
      title,
      toolbarTitle,
      connection,
    };
  }
  return {
    kind: "terminal",
    id,
    title,
    toolbarTitle,
    cwd: storedPane.cwd?.trim() || defaultTerminalCwdForConnection(connection),
    buffer: "",
    connection,
    tmuxSessionId: storedPane.tmuxSessionId,
  };
}

function titleForConnectionPane(connection: Connection) {
  if (connection.type === "url") {
    return connection.name;
  }
  if (isRemoteDesktopConnection(connection)) {
    return connection.name;
  }
  return terminalPaneTitleForConnection(connection);
}

function toolbarTitleForConnection(connection: Connection) {
  if (connection.type === "url") {
    return connection.name;
  }
  if (connection.type === "serial") {
    return connection.serialLine?.trim() || connection.host || connection.name;
  }
  if (connection.type === "local") {
    return localTerminalToolbarTitle(connection);
  }
  return formatConnectionAddress(connection);
}

function localTerminalToolbarTitle(connection: Connection) {
  const shell = connection.localShell?.trim();
  const normalizedShell = shell?.toLowerCase() ?? "";
  if (normalizedShell.endsWith("cmd.exe") || normalizedShell === "cmd") {
    return i18next.t("settings.commandPrompt");
  }
  if (
    normalizedShell.endsWith("powershell.exe") ||
    normalizedShell === "powershell" ||
    normalizedShell.endsWith("pwsh.exe") ||
    normalizedShell === "pwsh"
  ) {
    return i18next.t("settings.powerShell");
  }
  if (normalizedShell.endsWith("wsl.exe") || normalizedShell === "wsl") {
    return i18next.t("settings.wsl");
  }
  return shell || connection.name;
}

function terminalPaneTitleForConnection(connection: Connection) {
  switch (connection.type) {
    case "local":
      return connection.name;
    case "telnet":
      return "telnet";
    case "serial":
      return "serial";
    case "ssh":
    default:
      return "ssh";
  }
}

function buildPaneForConnection(
  connection: Connection,
  focusedPane?: WorkspacePane,
  options?: {
    childConnectionId?: string;
    cwd?: string;
    title?: string;
    toolbarTitle?: string;
    tmuxSessionId?: string;
  },
): WorkspacePane | null {
  if (connection.type === "url") {
    if (!connection.url) {
      return null;
    }
    return {
      kind: "webview",
      id: createPaneId(connection.id),
      childConnectionId: options?.childConnectionId,
      title: titleForConnectionPane(connection),
      toolbarTitle: options?.toolbarTitle ?? toolbarTitleForConnection(connection),
      connection,
      url: connection.url,
      dataPartition: connection.dataPartition,
    };
  }

  if (isRemoteDesktopConnection(connection)) {
    return {
      kind: "remoteDesktop",
      id: createPaneId(connection.id),
      childConnectionId: options?.childConnectionId,
      title: titleForConnectionPane(connection),
      toolbarTitle: options?.toolbarTitle ?? toolbarTitleForConnection(connection),
      connection,
    };
  }

  return {
    kind: "terminal",
    id: createPaneId(connection.id),
    childConnectionId: options?.childConnectionId,
    title: options?.title ?? titleForConnectionPane(connection),
    toolbarTitle: options?.toolbarTitle ?? toolbarTitleForConnection(connection),
    cwd: options?.cwd?.trim() || inheritedTerminalCwdForConnection(connection, focusedPane),
    buffer: "",
    connection,
    tmuxSessionId: options?.tmuxSessionId ?? appendTmuxSessionId(connection),
  };
}

function connectionForChild(connection: Connection, child: WorkspaceChildConnection): Connection {
  return {
    ...connection,
    iconBackgroundColor: child.iconBackgroundColor ?? connection.iconBackgroundColor,
    iconDataUrl: child.iconDataUrl ?? connection.iconDataUrl,
  };
}

function layoutForChildPanes(panes: WorkspacePane[]): LayoutNode | undefined {
  if (panes.length <= 2) {
    return defaultLayoutFor(panes);
  }
  const leaf = (pane: WorkspacePane): LayoutNode => ({ type: "leaf", paneId: pane.id });
  if (panes.length === 3) {
    return {
      type: "split",
      orientation: "vertical",
      children: [
        {
          type: "split",
          orientation: "horizontal",
          children: [leaf(panes[0]!), leaf(panes[1]!)],
        },
        leaf(panes[2]!),
      ],
    };
  }
  const columns = Math.ceil(Math.sqrt(panes.length));
  const rows: LayoutNode[] = [];
  for (let index = 0; index < panes.length; index += columns) {
    const rowPanes = panes.slice(index, index + columns);
    rows.push(
      rowPanes.length === 1
        ? leaf(rowPanes[0]!)
        : {
            type: "split",
            orientation: "horizontal",
            children: rowPanes.map(leaf),
          },
    );
  }
  return rows.length === 1
    ? rows[0]
    : { type: "split", orientation: "vertical", children: rows };
}

function createPaneId(connectionId: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `pane-${connectionId}-${suffix}`;
}

function createConnectionTabId(connectionId: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `tab-${connectionId}-${suffix}`;
}

function defaultTerminalCwdForConnection(connection: Connection) {
  if (connection.type === "local") {
    return connection.localStartupDirectory?.trim() || ".";
  }
  return "~";
}

function inheritedTerminalCwdForConnection(
  connection: Connection,
  focusedPane?: WorkspacePane,
) {
  if (
    focusedPane &&
    "cwd" in focusedPane &&
    focusedPane.connection?.id === connection.id
  ) {
    return focusedPane.cwd;
  }

  return defaultTerminalCwdForConnection(connection);
}

function isTerminalPane(pane: WorkspacePane): pane is TerminalPane {
  return pane.kind === undefined || pane.kind === "terminal";
}

function urlConnectionIdsForTab(tab: WorkspaceTab) {
  return tab.panes.flatMap((pane) =>
    pane.kind === "webview" && pane.connection.type === "url"
      ? [pane.connection.id]
      : [],
  );
}

function incrementActiveSessionCounts(
  activeSessionCounts: Record<string, number>,
  connectionIds: string[],
) {
  if (connectionIds.length === 0) {
    return activeSessionCounts;
  }
  const nextCounts = { ...activeSessionCounts };
  connectionIds.forEach((connectionId) => {
    nextCounts[connectionId] = (nextCounts[connectionId] ?? 0) + 1;
  });
  return nextCounts;
}

function decrementActiveSessionCounts(
  activeSessionCounts: Record<string, number>,
  connectionIds: string[],
) {
  if (connectionIds.length === 0) {
    return activeSessionCounts;
  }
  const nextCounts = { ...activeSessionCounts };
  connectionIds.forEach((connectionId) => {
    const currentCount = nextCounts[connectionId] ?? 0;
    if (currentCount <= 1) {
      delete nextCounts[connectionId];
      return;
    }
    nextCounts[connectionId] = currentCount - 1;
  });
  return nextCounts;
}

function emitChildConnectionClosed(childConnectionId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(CHILD_CONNECTION_CLOSED_EVENT, {
      detail: { childConnectionId },
    }),
  );
}

interface WorkspaceState {
  query: string;
  tabs: WorkspaceTab[];
  activeTabId: string;
  generalSettings: GeneralSettings;
  dashboardSettings: DashboardSettings;
  terminalSettings: TerminalSettings;
  appearanceSettings: AppearanceSettings;
  sshSettings: SshSettings;
  sftpSettings: SftpSettings;
  urlSettings: UrlSettings;
  rdpSettings: RdpSettings;
  vncSettings: VncSettings;
  aiProviderSettings: AiProviderSettings;
  aiProviderHasApiKey: boolean;
  assistantWorking: boolean;
  assistantContextSnippet?: AssistantContextSnippet;
  rdpPreCaptureSignal: number;
  activeSessionCounts: Record<string, number>;
  performanceMetrics: PerformanceMetrics;
  statusBarNotice?: StatusBarNotice;
  quickCommandsByConnection: Record<string, QuickCommand[]>;
  setQuery: (query: string) => void;
  setGeneralSettings: (settings: GeneralSettings) => void;
  setDashboardSettings: (settings: DashboardSettings) => void;
  setTerminalSettings: (settings: TerminalSettings) => void;
  setAppearanceSettings: (settings: AppearanceSettings) => void;
  setSshSettings: (settings: SshSettings) => void;
  setSftpSettings: (settings: SftpSettings) => void;
  setUrlSettings: (settings: UrlSettings) => void;
  setRdpSettings: (settings: RdpSettings) => void;
  setVncSettings: (settings: VncSettings) => void;
  setAiProviderSettings: (settings: AiProviderSettings) => void;
  setAiProviderHasApiKey: (hasApiKey: boolean) => void;
  setAssistantWorking: (assistantWorking: boolean) => void;
  setAssistantContextSnippet: (snippet: AssistantContextSnippet) => void;
  clearAssistantContextSnippet: () => void;
  requestRdpPreCapture: () => void;
  setFrontendLaunchMs: (frontendLaunchMs: number) => void;
  setPerformanceSnapshot: (snapshot: PerformanceSnapshot) => void;
  setHostUsageSnapshot: (snapshot: HostUsageSnapshot) => void;
  recordTerminalStartMetric: (metric: TerminalStartMetric) => void;
  clearTerminalStartMetric: (kind: TerminalStartMetric["kind"]) => void;
  showStatusBarNotice: (
    message: string,
    options?: { tone?: StatusBarNotice["tone"]; durationMs?: number },
  ) => void;
  clearStatusBarNotice: (id: number) => void;
  activateTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  openConnection: (connection: Connection) => void;
  openConnectionInNewTab: (
    connection: Connection,
    options?: {
      childConnectionId?: string;
      cwd?: string;
      iconBackgroundColor?: string | null;
      iconDataUrl?: string | null;
      title?: string;
      toolbarTitle?: string;
      tmuxSessionId?: string;
    },
  ) => void;
  openChildConnectionInNewTab: (
    connection: Connection,
    child: WorkspaceChildConnection,
  ) => void;
  openChildConnectionLayout: (
    connection: Connection,
    children: WorkspaceChildConnection[],
  ) => void;
  updateOpenChildConnectionMetadata: (child: WorkspaceChildConnection) => void;
  openUrlConnection: (connection: Connection) => void;
  openSshPortForwardBrowser: (
    sourceConnection: Connection,
    forward: { forwardId: string; localPort: number; remotePort: number; url: string },
  ) => void;
  openRemoteDesktopConnection: (connection: Connection) => void;
  openSftpBrowser: (connection: Connection) => void;
  openSftpBrowserInNewTab: (connection: Connection) => void;
  openFtpBrowser: (connection: Connection) => void;
  openTerminalHere: (connection: Connection, remotePath: string) => void;
  openLocalTerminal: (options?: { name?: string; shell?: string }) => void;
  openElevatedLocalTerminal: (option: LocalShellOption) => Promise<void>;
  splitTerminalPane: (tabId: string) => void;
  splitTerminalPaneDirected: (tabId: string, direction: SplitDirection) => void;
  addConnectionToTerminalPane: (
    tabId: string,
    connection: Connection,
    direction: SplitDirection,
  ) => void;
  closePane: (tabId: string, paneId: string) => void;
  closeChildConnection: (childConnectionId: string) => void;
  maximizeChildConnectionPane: (tabId: string, paneId: string) => void;
  updatePaneCwd: (tabId: string, paneId: string, cwd: string) => void;
  setQuickCommandBarVisible: (tabId: string, visible: boolean) => void;
  ensureQuickCommandsLoaded: (connectionId: string | undefined) => void;
  addQuickCommand: (connectionId: string | undefined, command: QuickCommand) => void;
  updateQuickCommand: (connectionId: string | undefined, command: QuickCommand) => void;
  moveQuickCommand: (connectionId: string | undefined, commandId: string, direction: -1 | 1) => void;
  reorderQuickCommand: (
    connectionId: string | undefined,
    commandId: string,
    targetCommandId: string,
  ) => void;
  removeQuickCommand: (connectionId: string | undefined, commandId: string) => void;
  openTmuxSessionInPane: (
    tabId: string,
    connection: Connection,
    tmuxSessionId: string,
    direction: SplitDirection,
  ) => void;
  renameTmuxSessionInOpenPanes: (
    connectionId: string,
    previousSessionId: string,
    nextSessionId: string,
  ) => void;
  setFocusedPane: (tabId: string, paneId: string) => void;
  saveTabLayout: (tabId: string) => void;
  resetTabLayout: (tabId: string) => void;
  saveConnectionLayout: (connectionId: string) => void;
  resetConnectionLayout: (connectionId: string) => void;
  resetAllLayouts: () => void;
  updateWebviewTabMetadata: (
    tabId: string,
    metadata: { title?: string; subtitle?: string; url?: string },
  ) => void;
  refreshOpenConnectionMetadata: (connection: Connection) => void;
  markConnectionSessionStarted: (connectionId: string) => void;
  markConnectionSessionEnded: (connectionId: string) => void;
  closeAllTabs: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  query: "",
  tabs: initialTabs,
  activeTabId: initialTabs[0]?.id ?? "",
  generalSettings: defaultGeneralSettings,
  dashboardSettings: defaultDashboardSettings,
  terminalSettings: defaultTerminalSettings,
  appearanceSettings: defaultAppearanceSettings,
  sshSettings: defaultSshSettings,
  sftpSettings: defaultSftpSettings,
  urlSettings: defaultUrlSettings,
  rdpSettings: defaultRdpSettings,
  vncSettings: defaultVncSettings,
  aiProviderSettings: defaultAiProviderSettings,
  aiProviderHasApiKey: false,
  assistantWorking: false,
  assistantContextSnippet: undefined,
  rdpPreCaptureSignal: 0,
  activeSessionCounts: {},
  performanceMetrics: {},
  statusBarNotice: undefined,
  quickCommandsByConnection: {},
  setQuery: (query) => set({ query }),
  setGeneralSettings: (generalSettings) => set({ generalSettings }),
  setDashboardSettings: (dashboardSettings) => set({ dashboardSettings }),
  setTerminalSettings: (terminalSettings) => set({ terminalSettings }),
  setAppearanceSettings: (appearanceSettings) => set({ appearanceSettings }),
  setSshSettings: (sshSettings) => set({ sshSettings }),
  setSftpSettings: (sftpSettings) => set({ sftpSettings }),
  setUrlSettings: (urlSettings) => set({ urlSettings }),
  setRdpSettings: (rdpSettings) => set({ rdpSettings }),
  setVncSettings: (vncSettings) => set({ vncSettings }),
  setAiProviderSettings: (aiProviderSettings) => set({ aiProviderSettings }),
  setAiProviderHasApiKey: (aiProviderHasApiKey) => set({ aiProviderHasApiKey }),
  setAssistantWorking: (assistantWorking) => set({ assistantWorking }),
  setAssistantContextSnippet: (assistantContextSnippet) =>
    set({ assistantContextSnippet }),
  clearAssistantContextSnippet: () =>
    set({ assistantContextSnippet: undefined }),
  requestRdpPreCapture: () =>
    set((state) => ({ rdpPreCaptureSignal: state.rdpPreCaptureSignal + 1 })),
  setFrontendLaunchMs: (frontendLaunchMs) =>
    set((state) => ({
      performanceMetrics: {
        ...state.performanceMetrics,
        frontendLaunchMs,
      },
    })),
  setPerformanceSnapshot: (snapshot) =>
    set((state) => ({
      performanceMetrics: {
        ...state.performanceMetrics,
        backendUptimeMs: snapshot.uptimeMs,
        workingSetBytes: snapshot.workingSetBytes,
        memorySource: snapshot.memorySource,
        ...(snapshot.lastSshTerminalReadyMs === undefined
          ? {}
          : {
              lastSshTerminalStart: {
                kind: "ssh",
                title: "Native SSH terminal",
                durationMs: snapshot.lastSshTerminalReadyMs,
                recordedAt: snapshot.lastSshTerminalReadyAtUnixSeconds
                  ? new Date(
                      snapshot.lastSshTerminalReadyAtUnixSeconds * 1000,
                    ).toISOString()
                  : new Date().toISOString(),
              },
            }),
      },
    })),
  setHostUsageSnapshot: (snapshot) =>
    set((state) => ({
      performanceMetrics: {
        ...state.performanceMetrics,
        hostUsage: snapshot,
      },
    })),
  recordTerminalStartMetric: (lastTerminalStart) =>
    set((state) => ({
      performanceMetrics: {
        ...state.performanceMetrics,
        lastTerminalStart,
        ...(lastTerminalStart.kind === "local"
          ? { lastLocalTerminalStart: lastTerminalStart }
          : {}),
        ...(lastTerminalStart.kind === "ssh"
          ? { lastSshTerminalStart: lastTerminalStart }
          : {}),
      },
    })),
  clearTerminalStartMetric: (kind) =>
    set((state) => ({
      performanceMetrics: {
        ...state.performanceMetrics,
        ...(kind === "local" ? { lastLocalTerminalStart: undefined } : {}),
        ...(kind === "ssh" ? { lastSshTerminalStart: undefined } : {}),
      },
    })),
  showStatusBarNotice: (message, options) => {
    const durationMs = options?.durationMs ?? 5_000;
    const now = Date.now();
    set({
      statusBarNotice: {
        id: (statusBarNoticeSequence += 1),
        message,
        tone: options?.tone ?? "info",
        expiresAt: now + durationMs,
      },
    });
  },
  clearStatusBarNotice: (id) =>
    set((state) =>
      state.statusBarNotice?.id === id
        ? { statusBarNotice: undefined }
        : {},
    ),
  activateTab: (tabId) => set({ activeTabId: tabId }),
  renameTab: async (tabId, title) => {
    const displayTitle = title.trim();
    if (!displayTitle) {
      return;
    }
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, displayTitle } : tab,
      ),
    }));
  },
  closeAllTabs: () => {
    const urlConnectionIds = get().tabs.flatMap(urlConnectionIdsForTab);
    set((state) => ({
      tabs: [],
      activeTabId: "",
      activeSessionCounts: decrementActiveSessionCounts(
        state.activeSessionCounts,
        urlConnectionIds,
      ),
    }));
  },
  closeTab: (tabId) => {
    const closingTab = get().tabs.find((tab) => tab.id === tabId);
    const remainingTabs = get().tabs.filter((tab) => tab.id !== tabId);
    set({
      tabs: remainingTabs,
      activeTabId:
        get().activeTabId === tabId
          ? (remainingTabs[0]?.id ?? "")
          : get().activeTabId,
      activeSessionCounts: decrementActiveSessionCounts(
        get().activeSessionCounts,
        closingTab ? urlConnectionIdsForTab(closingTab) : [],
      ),
    });
  },
  openConnection: (connection) => {
    if (connection.type === "url") {
      get().openUrlConnection(connection);
      return;
    }
    if (isRemoteDesktopConnection(connection)) {
      get().openRemoteDesktopConnection(connection);
      return;
    }
    if (connection.type === "ftp") {
      get().openFtpBrowser(connection);
      return;
    }

    const existingTab = get().tabs.find(
      (tab) => tab.id === `tab-${connection.id}`,
    );
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const stored = loadStoredLayout(connection.id);
    const panes = buildPanesFromStoredLayout(connection, stored);
    const paneIds = panes.map((pane) => pane.id);
    const layout =
      (stored ? hydrateLayout(stored.layout, paneIds) : undefined) ??
      defaultLayoutFor(panes);

    const tab: WorkspaceTab = {
      id: `tab-${connection.id}`,
      title: connection.name,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle: terminalConnectionSubtitle(connection),
      kind: "terminal",
      panes,
      layout,
      focusedPaneId: panes[0]?.id,
      quickCommandBarVisible: loadStoredQuickCommandBarVisible(connection.id),
      connection,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  openConnectionInNewTab: (connection, options) => {
    if (connection.type === "ftp") {
      if (connection.ftpOptions?.protocol === "sftp") {
        const sshConnection: Connection = {
          ...connection,
          type: "ssh",
          authMethod: "password",
          port: connection.port ?? 22,
          keyPath: undefined,
          proxyJump: undefined,
          ftpOptions: undefined,
        };
        get().openSftpBrowserInNewTab(sshConnection);
        return;
      }

      const tabId = createConnectionTabId(`${connection.id}-ftp`);
      const protocolLabel =
        connection.ftpOptions?.protocol?.toUpperCase() ?? "FTP";
      const tab: WorkspaceTab = {
        id: tabId,
        title: `${connection.name} ${protocolLabel}`,
        toolbarTitle: toolbarTitleForConnection(connection),
        subtitle: `${connection.user || "anonymous"}@${connection.host}`,
        kind: "ftp",
        panes: [],
        connection,
      };

      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
      return;
    }

    const paneConnection =
      options?.iconDataUrl !== undefined || options?.iconBackgroundColor !== undefined
        ? {
            ...connection,
            iconBackgroundColor: options.iconBackgroundColor ?? connection.iconBackgroundColor,
            iconDataUrl: options.iconDataUrl ?? connection.iconDataUrl,
          }
        : connection;
    const pane = buildPaneForConnection(paneConnection, undefined, {
      childConnectionId: options?.childConnectionId,
      cwd: options?.cwd,
      title: options?.tmuxSessionId ?? options?.title,
      toolbarTitle: options?.toolbarTitle,
      tmuxSessionId: options?.tmuxSessionId,
    });
    if (!pane) {
      return;
    }

    const tabId = createConnectionTabId(connection.id);
    const subtitle =
      connection.type === "url"
        ? urlConnectionSubtitle(connection)
        : isRemoteDesktopConnection(connection)
          ? remoteDesktopSubtitle(connection)
          : terminalConnectionSubtitle(connection);
    const tab: WorkspaceTab = {
      id: tabId,
      childConnectionId: options?.childConnectionId,
      title: options?.title ?? connection.name,
      toolbarTitle: options?.toolbarTitle ?? toolbarTitleForConnection(connection),
      subtitle,
      kind: "terminal",
      panes: [pane],
      layout: defaultLayoutFor([pane]),
      focusedPaneId: pane.id,
      quickCommandBarVisible: loadStoredQuickCommandBarVisible(connection.id),
      connection: paneConnection,
      url: connection.url,
      dataPartition: connection.dataPartition,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
      activeSessionCounts: incrementActiveSessionCounts(
        state.activeSessionCounts,
        urlConnectionIdsForTab(tab),
      ),
    }));
  },
  openChildConnectionInNewTab: (connection, child) => {
    get().openConnectionInNewTab(connection, {
      childConnectionId: child.id,
      cwd: child.cwd,
      iconBackgroundColor: child.iconBackgroundColor,
      iconDataUrl: child.iconDataUrl,
      title: child.name,
      toolbarTitle: child.name,
      tmuxSessionId: child.tmuxSessionId,
    });
  },
  openChildConnectionLayout: (connection, children) => {
    const state = get();
    const existingGroupTab = state.tabs.find(
      (tab) => tab.childConnectionGroupParentId === connection.id,
    );

    const uniqueChildren = children.filter(
      (child, index, all) => all.findIndex((entry) => entry.id === child.id) === index,
    );
    const childIds = new Set(uniqueChildren.map((child) => child.id));
    const groupPaneByChildId = new Map<string, WorkspacePane>();
    if (existingGroupTab) {
      for (const pane of existingGroupTab.panes) {
        if (pane.childConnectionId && childIds.has(pane.childConnectionId)) {
          groupPaneByChildId.set(pane.childConnectionId, pane);
        }
      }
    }

    const externalPaneByChildId = new Map<
      string,
      { pane: WorkspacePane; tab: WorkspaceTab }
    >();
    for (const tab of state.tabs) {
      if (tab.id === existingGroupTab?.id) {
        continue;
      }
      for (const pane of tab.panes) {
        if (
          pane.childConnectionId &&
          childIds.has(pane.childConnectionId) &&
          !externalPaneByChildId.has(pane.childConnectionId)
        ) {
          externalPaneByChildId.set(pane.childConnectionId, { pane, tab });
        }
      }
    }
    const movedPaneIds = new Set<string>();
    const newPanes: WorkspacePane[] = [];
    const childPanes = uniqueChildren
      .map((child) => {
        const groupPane = groupPaneByChildId.get(child.id);
        if (groupPane) {
          return {
            ...groupPane,
            childConnectionId: child.id,
            connection: connectionForChild(connection, child),
            title: child.tmuxSessionId ?? child.name,
            toolbarTitle: child.name,
          };
        }
        const existing = externalPaneByChildId.get(child.id);
        if (existing) {
          movedPaneIds.add(existing.pane.id);
          return {
            ...existing.pane,
            childConnectionId: child.id,
            connection: connectionForChild(connection, child),
            title: child.tmuxSessionId ?? child.name,
            toolbarTitle: child.name,
          };
        }
        const childConnection = connectionForChild(connection, child);
        const pane = buildPaneForConnection(childConnection, undefined, {
          childConnectionId: child.id,
          cwd: child.cwd,
          title: child.tmuxSessionId ?? child.name,
          toolbarTitle: child.name,
          tmuxSessionId: child.tmuxSessionId,
        });
        if (pane) {
          newPanes.push(pane);
        }
        return pane;
      })
      .filter((pane): pane is WorkspacePane => Boolean(pane));
    if (childPanes.length === 0) {
      get().openConnection(connection);
      return;
    }
    const tabId = existingGroupTab?.id ?? createConnectionTabId(`${connection.id}-children`);
    const tab: WorkspaceTab = {
      ...existingGroupTab,
      id: tabId,
      childConnectionGroupParentId: connection.id,
      title: connection.name,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle: terminalConnectionSubtitle(connection),
      kind: "terminal",
      panes: childPanes,
      layout: layoutForChildPanes(childPanes),
      focusedPaneId: undefined,
      maximizedPaneId: undefined,
      quickCommandBarVisible: false,
      connection,
    };
    const terminalPaneIdsToMove = childPanes
      .filter((pane) => movedPaneIds.has(pane.id) && isTerminalPane(pane))
      .map((pane) => pane.id);
    markPanesForRuntimeMove(terminalPaneIdsToMove);
    set((state) => ({
      tabs: [
        ...state.tabs.flatMap((entry) => {
          if (entry.id === tab.id) {
            return [tab];
          }
          const movedPaneIdsInTab = entry.panes
            .filter((pane) => movedPaneIds.has(pane.id))
            .map((pane) => pane.id);
          if (movedPaneIdsInTab.length === 0) {
            return [entry];
          }
          const nextPanes = entry.panes.filter((pane) => !movedPaneIds.has(pane.id));
          if (nextPanes.length === 0) {
            return [];
          }
          const nextLayout = ensureLayout(entry.layout, nextPanes);
          return [
            {
              ...entry,
              childConnectionId:
                entry.childConnectionId && childIds.has(entry.childConnectionId)
                  ? undefined
                  : entry.childConnectionId,
              panes: nextPanes,
              layout: nextLayout,
              focusedPaneId:
                entry.focusedPaneId && movedPaneIds.has(entry.focusedPaneId)
                  ? leafOrder(nextLayout)[0] ?? nextPanes[0]?.id
                  : entry.focusedPaneId,
            },
          ];
        }),
        ...(existingGroupTab ? [] : [tab]),
      ],
      activeTabId: tab.id,
      activeSessionCounts: incrementActiveSessionCounts(
        state.activeSessionCounts,
        newPanes.flatMap((pane) =>
          pane.kind === "webview" && pane.connection.type === "url"
            ? [pane.connection.id]
            : [],
        ),
      ),
    }));
  },
  updateOpenChildConnectionMetadata: (child) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        const tabMatches = tab.childConnectionId === child.id;
        let panesChanged = false;
        const panes = tab.panes.map((pane) => {
          if (pane.childConnectionId !== child.id || !pane.connection) {
            return pane;
          }
          panesChanged = true;
          const connection = pane.connection;
          const nextIconBackgroundColor = child.iconBackgroundColor ?? connection.iconBackgroundColor;
          const nextIconDataUrl = child.iconDataUrl ?? connection.iconDataUrl;
          const nextConnection =
            nextIconBackgroundColor === connection.iconBackgroundColor &&
            nextIconDataUrl === connection.iconDataUrl
              ? connection
              : {
                  ...connection,
                  iconBackgroundColor: nextIconBackgroundColor,
                  iconDataUrl: nextIconDataUrl,
                };
          return {
            ...pane,
            toolbarTitle: child.name,
            connection: nextConnection,
          };
        });
        if (!tabMatches && !panesChanged) {
          return tab;
        }
        const tabConnection = tab.connection;
        const nextTabConnection =
          tabMatches && tabConnection
            ? (() => {
                const nextIconBackgroundColor = child.iconBackgroundColor ?? tabConnection.iconBackgroundColor;
                const nextIconDataUrl = child.iconDataUrl ?? tabConnection.iconDataUrl;
                return nextIconBackgroundColor === tabConnection.iconBackgroundColor &&
                  nextIconDataUrl === tabConnection.iconDataUrl
                  ? tabConnection
                  : {
                      ...tabConnection,
                      iconBackgroundColor: nextIconBackgroundColor,
                      iconDataUrl: nextIconDataUrl,
                    };
              })()
            : tabConnection;
        return tabMatches
          ? {
              ...tab,
              title: child.name,
              toolbarTitle: child.name,
              panes,
              connection: nextTabConnection,
            }
          : { ...tab, panes };
      }),
    }));
  },
  openRemoteDesktopConnection: (connection) => {
    if (!isRemoteDesktopConnection(connection)) {
      return;
    }

    const existingTab = get().tabs.find(
      (tab) => tab.id === `tab-${connection.id}`,
    );
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const pane = buildPaneForConnection(connection);
    if (!pane) {
      return;
    }
    const tab: WorkspaceTab = {
      id: `tab-${connection.id}`,
      title: connection.name,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle: remoteDesktopSubtitle(connection),
      kind: "terminal",
      panes: [pane],
      layout: defaultLayoutFor([pane]),
      focusedPaneId: pane.id,
      quickCommandBarVisible: loadStoredQuickCommandBarVisible(connection.id),
      connection,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  openUrlConnection: (connection) => {
    if (connection.type !== "url" || !connection.url) {
      return;
    }

    const existingTab = get().tabs.find(
      (tab) => tab.id === `tab-${connection.id}`,
    );
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const stored = loadStoredLayout(connection.id);
    const panes = buildPanesFromStoredLayout(connection, stored);
    if (panes.length === 0) {
      return;
    }
    const paneIds = panes.map((pane) => pane.id);
    const layout =
      (stored ? hydrateLayout(stored.layout, paneIds) : undefined) ??
      defaultLayoutFor(panes);

    const subtitle = urlConnectionSubtitle(connection);

    const tab: WorkspaceTab = {
      id: `tab-${connection.id}`,
      title: connection.name,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle,
      kind: "terminal",
      panes,
      layout,
      focusedPaneId: panes[0]?.id,
      quickCommandBarVisible: loadStoredQuickCommandBarVisible(connection.id),
      connection,
      url: connection.url,
      dataPartition: connection.dataPartition,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
      activeSessionCounts: incrementActiveSessionCounts(
        state.activeSessionCounts,
        urlConnectionIdsForTab(tab),
      ),
    }));
  },
  openSshPortForwardBrowser: (sourceConnection, forward) => {
    if (sourceConnection.type !== "ssh") {
      return;
    }

    const tabId = `tab-${forward.forwardId}`;
    const title = `${sourceConnection.name} :${forward.remotePort}`;
    const connection: Connection = {
      id: forward.forwardId,
      name: title,
      host: "127.0.0.1",
      user: sourceConnection.user,
      type: "url",
      status: "idle",
      url: forward.url,
    };
    const pane = {
      kind: "webview" as const,
      id: tabId,
      title,
      toolbarTitle: title,
      connection,
      url: forward.url,
      sshPortForwardSessionId: forward.forwardId,
      sshPortForwardRemotePort: forward.remotePort,
    };
    const tab: WorkspaceTab = {
      id: tabId,
      title,
      toolbarTitle: title,
      subtitle: `127.0.0.1:${forward.localPort} -> ${sourceConnection.host}:${forward.remotePort}`,
      kind: "terminal",
      panes: [pane],
      layout: defaultLayoutFor([pane]),
      focusedPaneId: pane.id,
      quickCommandBarVisible: loadStoredQuickCommandBarVisible(connection.id),
      connection,
      url: forward.url,
      sshPortForwardSessionId: forward.forwardId,
      sshPortForwardRemotePort: forward.remotePort,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  openSftpBrowser: (connection) => {
    if (connection.type !== "ssh") {
      return;
    }

    const tabId = `tab-${connection.id}-sftp`;
    const existingTab = get().tabs.find((tab) => tab.id === tabId);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const tab: WorkspaceTab = {
      id: tabId,
      title: `${connection.name} SFTP`,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle: `${connection.user}@${connection.host}`,
      kind: "sftp",
      panes: [],
      connection,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  openSftpBrowserInNewTab: (connection) => {
    if (connection.type !== "ssh") {
      return;
    }

    const tabId = createConnectionTabId(`${connection.id}-sftp`);
    const tab: WorkspaceTab = {
      id: tabId,
      title: `${connection.name} SFTP`,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle: `${connection.user}@${connection.host}`,
      kind: "sftp",
      panes: [],
      connection,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  openFtpBrowser: (connection) => {
    if (connection.type !== "ftp") {
      return;
    }

    // SFTP sub-protocol shares the existing SSH-launched SFTP code path:
    // derive an SSH-shaped Connection from the FTP Connection's host/user/
    // port and hand it to openSftpBrowser. Same SftpWorkspace component,
    // same sftp_* Tauri commands, same SftpSessionManager.
    if (connection.ftpOptions?.protocol === "sftp") {
      const sshConnection: Connection = {
        ...connection,
        type: "ssh",
        authMethod: "password",
        port: connection.port ?? 22,
        keyPath: undefined,
        proxyJump: undefined,
        ftpOptions: undefined,
      };
      get().openSftpBrowser(sshConnection);
      return;
    }

    const tabId = `tab-${connection.id}-ftp`;
    const existingTab = get().tabs.find((tab) => tab.id === tabId);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const protocolLabel =
      connection.ftpOptions?.protocol?.toUpperCase() ?? "FTP";
    const tab: WorkspaceTab = {
      id: tabId,
      title: `${connection.name} ${protocolLabel}`,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle: `${connection.user || "anonymous"}@${connection.host}`,
      kind: "ftp",
      panes: [],
      connection,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  openTerminalHere: (connection, remotePath) => {
    const normalizedPath = remotePath.trim() || ".";
    const tabId = `tab-${connection.id}-terminal-${Date.now()}`;
    const tab: WorkspaceTab = {
      id: tabId,
      title: `${connection.name} terminal`,
      toolbarTitle: toolbarTitleForConnection(connection),
      subtitle: `${connection.user}@${connection.host}:${normalizedPath}`,
      kind: "terminal",
      panes: [
        {
          id: createPaneId(`${connection.id}-terminal`),
          title: "ssh",
          toolbarTitle: toolbarTitleForConnection(connection),
          cwd: normalizedPath,
          buffer: "",
          connection,
          tmuxSessionId: appendTmuxSessionId(connection),
        },
      ],
      quickCommandBarVisible: loadStoredQuickCommandBarVisible(connection.id),
      connection,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  openLocalTerminal: (options) => {
    const id = `local-${Date.now()}`;
    const shell = options?.shell ?? get().terminalSettings.defaultShell;
    get().openConnection({
      id,
      name: options?.name ?? shell,
      host: "localhost",
      user: "local",
      localShell: shell,
      type: "local",
      status: "idle",
    });
  },
  openElevatedLocalTerminal: async (option) => {
    const isAppElevated = await invokeCommand("is_app_elevated", undefined).catch(() => false);
    const action = elevatedLocalShellAction({
      adminLabel: i18next.t("connections.admin"),
      isAppElevated,
      option,
    });

    if (action.mode === "embedded") {
      get().openLocalTerminal({ name: action.name, shell: action.shell });
      return;
    }

    await invokeCommand("launch_elevated_terminal", {
      request: { shell: action.shell },
    });
  },
  splitTerminalPane: (tabId) => {
    get().splitTerminalPaneDirected(tabId, "right");
  },
  splitTerminalPaneDirected: (tabId, direction) => {
    set((state) => {
      const openedUrlConnectionIds: string[] = [];
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.kind !== "terminal") {
          return tab;
        }

        const focusedPane =
          tab.panes.find((pane) => pane.id === tab.focusedPaneId) ??
          tab.panes[0];
        const connection = focusedPane?.connection;
        if (!focusedPane || !connection) {
          return tab;
        }

        const newPane = buildPaneForConnection(connection, focusedPane);
        if (!newPane) {
          return tab;
        }
        newPane.title = `${focusedPane.title} ${tab.panes.length + 1}`;
        if (newPane.kind === "webview") {
          openedUrlConnectionIds.push(newPane.connection.id);
        }

        const nextPanes = [...tab.panes, newPane];
        const baseLayout = ensureLayout(tab.layout, tab.panes);
        const nextLayout = splitLayout(
          baseLayout,
          focusedPane.id,
          direction,
          newPane.id,
          tab.panes.map((pane) => pane.id),
        );

        return {
          ...tab,
          panes: nextPanes,
          layout: nextLayout,
          focusedPaneId: newPane.id,
        };
      });
      return {
        tabs,
        activeSessionCounts: incrementActiveSessionCounts(
          state.activeSessionCounts,
          openedUrlConnectionIds,
        ),
      };
    });
  },
  addConnectionToTerminalPane: (tabId, connection, direction) => {
    set((state) => {
      const openedUrlConnectionIds: string[] = [];
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.kind !== "terminal") {
          return tab;
        }
        const focusedPane =
          tab.panes.find((pane) => pane.id === tab.focusedPaneId) ??
          tab.panes[0];
        if (!focusedPane) {
          return tab;
        }
        const newPane = buildPaneForConnection(connection, focusedPane);
        if (!newPane) {
          return tab;
        }
        if (newPane.kind === "webview") {
          openedUrlConnectionIds.push(newPane.connection.id);
        }
        const nextPanes = [...tab.panes, newPane];
        const baseLayout = ensureLayout(tab.layout, tab.panes);
        const nextLayout = splitLayout(
          baseLayout,
          focusedPane.id,
          direction,
          newPane.id,
          tab.panes.map((pane) => pane.id),
        );
        return {
          ...tab,
          panes: nextPanes,
          layout: nextLayout,
          focusedPaneId: newPane.id,
        };
      });
      return {
        tabs,
        activeSessionCounts: incrementActiveSessionCounts(
          state.activeSessionCounts,
          openedUrlConnectionIds,
        ),
      };
    });
  },
  closePane: (tabId, paneId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab || tab.kind !== "terminal") {
      return;
    }
    const closingPane = tab.panes.find((pane) => pane.id === paneId);
    if (closingPane?.childConnectionId) {
      get().closeChildConnection(closingPane.childConnectionId);
      return;
    }
    if (tab.panes.length <= 1) {
      get().closeTab(tabId);
      return;
    }
    const nextPanes = tab.panes.filter((p) => p.id !== paneId);
    const nextLayout = ensureLayout(tab.layout, nextPanes);
    const nextFocusedPaneId =
      tab.focusedPaneId === paneId
        ? (leafOrder(nextLayout)[0] ?? nextPanes[0]?.id)
        : tab.focusedPaneId;
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id !== tabId
          ? t
          : {
              ...t,
              panes: nextPanes,
              layout: nextLayout,
              focusedPaneId: nextFocusedPaneId,
            },
      ),
      activeSessionCounts:
        closingPane?.kind === "webview"
          ? decrementActiveSessionCounts(s.activeSessionCounts, [closingPane.connection.id])
          : s.activeSessionCounts,
    }));
  },
  closeChildConnection: (childConnectionId) => {
    let removed = false;
    set((state) => {
      const closedUrlConnectionIds: string[] = [];
      const tabs = state.tabs.flatMap((tab) => {
        const tabMatches = tab.childConnectionId === childConnectionId;
        const matchingPanes = tab.panes.filter(
          (pane) => pane.childConnectionId === childConnectionId,
        );
        if (!tabMatches && matchingPanes.length === 0) {
          return [tab];
        }

        removed = true;
        closedUrlConnectionIds.push(
          ...urlConnectionIdsForTab({
            ...tab,
            panes: tabMatches ? tab.panes : matchingPanes,
          }),
        );
        const nextPanes = tab.panes.filter(
          (pane) => pane.childConnectionId !== childConnectionId,
        );
        if (tabMatches || nextPanes.length === 0) {
          return [];
        }

        const nextLayout = ensureLayout(tab.layout, nextPanes);
        const nextFocusedPaneId =
          tab.focusedPaneId && nextPanes.some((pane) => pane.id === tab.focusedPaneId)
            ? tab.focusedPaneId
            : leafOrder(nextLayout)[0] ?? nextPanes[0]?.id;
        const nextMaximizedPaneId =
          tab.maximizedPaneId && nextPanes.some((pane) => pane.id === tab.maximizedPaneId)
            ? tab.maximizedPaneId
            : undefined;
        return [
          {
            ...tab,
            panes: nextPanes,
            layout: nextLayout,
            focusedPaneId: nextFocusedPaneId,
            maximizedPaneId: nextMaximizedPaneId,
          },
        ];
      });
      return {
        tabs,
        activeTabId:
          tabs.some((tab) => tab.id === state.activeTabId)
            ? state.activeTabId
            : tabs[0]?.id ?? "",
        activeSessionCounts: decrementActiveSessionCounts(
          state.activeSessionCounts,
          closedUrlConnectionIds,
        ),
      };
    });
    if (removed) {
      emitChildConnectionClosed(childConnectionId);
    }
  },
  maximizeChildConnectionPane: (tabId, paneId) => {
    set((state) => ({
      activeTabId: tabId,
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && tab.childConnectionGroupParentId
          ? {
              ...tab,
              focusedPaneId: paneId,
              maximizedPaneId: paneId,
            }
          : tab.id === tabId
            ? { ...tab, focusedPaneId: paneId }
            : tab,
      ),
    }));
  },
  updatePaneCwd: (tabId, paneId, cwd) => {
    const nextCwd = cwd.trim();
    if (!nextCwd) {
      return;
    }
    set((state) => {
      // OSC7 fires this on (potentially) every shell prompt. Short-circuit
      // when nothing actually changed so we return the same `tabs` reference
      // and Zustand skips notifying subscribers (sidebar, canvas, rail).
      let changed = false;
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }
        let paneChanged = false;
        const panes = tab.panes.map((pane) => {
          if (pane.id === paneId && isTerminalPane(pane) && pane.cwd !== nextCwd) {
            paneChanged = true;
            return { ...pane, cwd: nextCwd };
          }
          return pane;
        });
        if (!paneChanged) {
          return tab;
        }
        changed = true;
        return { ...tab, panes };
      });
      if (!changed) {
        return state;
      }
      return { tabs };
    });
  },
  setQuickCommandBarVisible: (tabId, visible) => {
    const tab = get().tabs.find((entry) => entry.id === tabId);
    persistQuickCommandBarVisible(tab?.connection?.id, visible);
    set((state) => ({
      tabs: state.tabs.map((entry) =>
        entry.id === tabId ? { ...entry, quickCommandBarVisible: visible } : entry,
      ),
    }));
  },
  ensureQuickCommandsLoaded: (connectionId) => {
    if (!connectionId || get().quickCommandsByConnection[connectionId]) {
      return;
    }
    set((state) => ({
      quickCommandsByConnection: {
        ...state.quickCommandsByConnection,
        [connectionId]: loadStoredQuickCommands(connectionId),
      },
    }));
  },
  addQuickCommand: (connectionId, command) => {
    if (!connectionId) {
      return;
    }
    set((state) => {
      const quickCommands = [
        ...(state.quickCommandsByConnection[connectionId] ?? loadStoredQuickCommands(connectionId)),
        command,
      ];
      persistQuickCommands(connectionId, quickCommands);
      return {
        quickCommandsByConnection: {
          ...state.quickCommandsByConnection,
          [connectionId]: quickCommands,
        },
      };
    });
  },
  updateQuickCommand: (connectionId, command) => {
    if (!connectionId) {
      return;
    }
    set((state) => {
      const existing = state.quickCommandsByConnection[connectionId] ?? loadStoredQuickCommands(connectionId);
      const quickCommands = existing.map((entry) =>
        entry.id === command.id ? command : entry,
      );
      persistQuickCommands(connectionId, quickCommands);
      return {
        quickCommandsByConnection: {
          ...state.quickCommandsByConnection,
          [connectionId]: quickCommands,
        },
      };
    });
  },
  moveQuickCommand: (connectionId, commandId, direction) => {
    if (!connectionId) {
      return;
    }
    set((state) => {
      const existing = state.quickCommandsByConnection[connectionId] ?? loadStoredQuickCommands(connectionId);
      const index = existing.findIndex((entry) => entry.id === commandId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= existing.length) {
        return {};
      }
      const quickCommands = [...existing];
      const [command] = quickCommands.splice(index, 1);
      if (!command) {
        return {};
      }
      quickCommands.splice(nextIndex, 0, command);
      persistQuickCommands(connectionId, quickCommands);
      return {
        quickCommandsByConnection: {
          ...state.quickCommandsByConnection,
          [connectionId]: quickCommands,
        },
      };
    });
  },
  reorderQuickCommand: (connectionId, commandId, targetCommandId) => {
    if (!connectionId || commandId === targetCommandId) {
      return;
    }
    set((state) => {
      const existing = state.quickCommandsByConnection[connectionId] ?? loadStoredQuickCommands(connectionId);
      const index = existing.findIndex((entry) => entry.id === commandId);
      const targetIndex = existing.findIndex((entry) => entry.id === targetCommandId);
      if (index < 0 || targetIndex < 0) {
        return {};
      }
      const quickCommands = [...existing];
      const [command] = quickCommands.splice(index, 1);
      if (!command) {
        return {};
      }
      quickCommands.splice(targetIndex, 0, command);
      persistQuickCommands(connectionId, quickCommands);
      return {
        quickCommandsByConnection: {
          ...state.quickCommandsByConnection,
          [connectionId]: quickCommands,
        },
      };
    });
  },
  removeQuickCommand: (connectionId, commandId) => {
    if (!connectionId) {
      return;
    }
    set((state) => {
      const existing = state.quickCommandsByConnection[connectionId] ?? loadStoredQuickCommands(connectionId);
      const quickCommands = existing.filter((entry) => entry.id !== commandId);
      persistQuickCommands(connectionId, quickCommands);
      return {
        quickCommandsByConnection: {
          ...state.quickCommandsByConnection,
          [connectionId]: quickCommands,
        },
      };
    });
  },
  openTmuxSessionInPane: (tabId, connection, tmuxSessionId, direction) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.kind !== "terminal") {
          return tab;
        }

        const focusedPane =
          tab.panes.find((pane) => pane.id === tab.focusedPaneId) ??
          tab.panes[0];
        if (!focusedPane || !isTerminalPane(focusedPane)) {
          return tab;
        }

        const newPane: TerminalPane = {
          id: createPaneId(connection.id),
          title: tmuxSessionId,
          toolbarTitle: toolbarTitleForConnection(connection),
          cwd: focusedPane.cwd,
          buffer: "",
          connection,
          tmuxSessionId,
        };

        const nextPanes = [...tab.panes, newPane];
        const baseLayout = ensureLayout(tab.layout, tab.panes);
        const nextLayout = splitLayout(
          baseLayout,
          focusedPane.id,
          direction,
          newPane.id,
          tab.panes.map((pane) => pane.id),
        );

        return {
          ...tab,
          panes: nextPanes,
          layout: nextLayout,
          focusedPaneId: newPane.id,
        };
      }),
    }));
  },
  renameTmuxSessionInOpenPanes: (connectionId, previousSessionId, nextSessionId) => {
    const trimmedSessionId = nextSessionId.trim();
    if (!trimmedSessionId || !isCurrentTmuxSessionId(trimmedSessionId)) {
      return;
    }
    replaceTmuxSessionId(connectionId, previousSessionId, trimmedSessionId);
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.kind !== "terminal") {
          return tab;
        }
        const panes = tab.panes.map((pane) => {
          if (!isTerminalPane(pane) || pane.connection?.id !== connectionId || pane.tmuxSessionId !== previousSessionId) {
            return pane;
          }
          return {
            ...pane,
            tmuxSessionId: trimmedSessionId,
            title: pane.title === previousSessionId ? trimmedSessionId : pane.title,
          };
        });
        return panes.some((pane, index) => pane !== tab.panes[index]) ? { ...tab, panes } : tab;
      }),
    }));
  },
  setFocusedPane: (tabId, paneId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.focusedPaneId === paneId) {
          return tab;
        }
        return { ...tab, focusedPaneId: paneId };
      }),
    }));
  },
  saveTabLayout: (tabId) => {
    const tab = get().tabs.find((entry) => entry.id === tabId);
    if (!tab || tab.kind !== "terminal" || !tab.connection) {
      return;
    }
    const layout = ensureLayout(tab.layout, tab.panes);
    if (!layout) {
      return;
    }
    const orderedIds = leafOrder(layout);
    const orderedPanes = orderedIds
      .map((id) => tab.panes.find((pane) => pane.id === id))
      .filter(
        (pane): pane is WorkspacePane =>
          pane !== undefined && Boolean(pane.connection),
      );
    if (orderedPanes.length !== tab.panes.length) {
      return;
    }
    const stored = serializeLayout(layout, orderedPanes);
    persistLayout(tab.connection.id, stored);
  },
  resetTabLayout: (tabId) => {
    const tab = get().tabs.find((entry) => entry.id === tabId);
    if (!tab || tab.kind !== "terminal" || !tab.connection) {
      return;
    }
    persistLayout(tab.connection.id, undefined);
  },
  saveConnectionLayout: (connectionId) => {
    const { activeTabId, tabs } = get();
    const tab =
      tabs.find(
        (entry) =>
          entry.id === activeTabId &&
          entry.kind === "terminal" &&
          entry.connection?.id === connectionId,
      ) ??
      tabs.find(
        (entry) =>
          entry.kind === "terminal" && entry.connection?.id === connectionId,
      );
    if (!tab || tab.kind !== "terminal") {
      return;
    }
    get().saveTabLayout(tab.id);
  },
  resetConnectionLayout: (connectionId) => {
    persistLayout(connectionId, undefined);
  },
  resetAllLayouts: () => {
    clearStoredLayouts();
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.kind !== "terminal"
          ? tab
          : {
              ...tab,
              layout: defaultLayoutFor(tab.panes),
              focusedPaneId: tab.panes[0]?.id,
            },
      ),
    }));
  },
  updateWebviewTabMetadata: (tabId, metadata) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.kind === "terminal") {
          const updatesTab = tab.id === tabId;
          const updatesPane = tab.panes.some(
            (pane) => pane.kind === "webview" && pane.id === tabId,
          );
          if (!updatesTab && !updatesPane) {
            return tab;
          }
          const updatesSinglePaneTab = updatesPane && tab.panes.length === 1;

          return {
            ...tab,
            title:
              updatesTab || updatesSinglePaneTab
                ? (metadata.title ?? tab.title)
                : tab.title,
            subtitle:
              updatesTab || updatesSinglePaneTab
                ? (metadata.subtitle ?? tab.subtitle)
                : tab.subtitle,
            url:
              updatesTab || updatesSinglePaneTab
                ? (metadata.url ?? tab.url)
                : tab.url,
            panes: tab.panes.map((pane) =>
              pane.kind === "webview" && pane.id === tabId
                ? {
                    ...pane,
                    title: metadata.title ?? pane.title,
                    url: metadata.url ?? pane.url,
                  }
                : pane,
            ),
          };
        }

        if (tab.id !== tabId || tab.kind !== "webview") {
          return tab;
        }

        return {
          ...tab,
          title: metadata.title ?? tab.title,
          subtitle: metadata.subtitle ?? tab.subtitle,
          url: metadata.url ?? tab.url,
        };
      }),
    }));
  },
  refreshOpenConnectionMetadata: (connection) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => refreshTabConnectionMetadata(tab, connection)),
    }));
  },
  markConnectionSessionStarted: (connectionId) => {
    set((state) => ({
      activeSessionCounts: {
        ...state.activeSessionCounts,
        [connectionId]: (state.activeSessionCounts[connectionId] ?? 0) + 1,
      },
    }));
  },
  markConnectionSessionEnded: (connectionId) => {
    set((state) => {
      const currentCount = state.activeSessionCounts[connectionId] ?? 0;
      if (currentCount <= 1) {
        const remainingCounts = { ...state.activeSessionCounts };
        delete remainingCounts[connectionId];
        return { activeSessionCounts: remainingCounts };
      }

      return {
        activeSessionCounts: {
          ...state.activeSessionCounts,
          [connectionId]: currentCount - 1,
        },
      };
    });
  },
}));

function refreshTabConnectionMetadata(tab: WorkspaceTab, connection: Connection): WorkspaceTab {
  const tabConnectionMatches = tab.connection?.id === connection.id;
  const toolbarTitle = toolbarTitleForConnection(connection);
  const panes = tab.panes.map((pane) => {
    if (pane.connection?.id !== connection.id) {
      return pane;
    }
    return {
      ...pane,
      connection,
      title: refreshedPaneTitle(pane, connection),
      toolbarTitle,
    };
  });
  const panesChanged = panes.some((pane, index) => pane !== tab.panes[index]);
  if (!tabConnectionMatches && !panesChanged) {
    return tab;
  }

  if (!tabConnectionMatches) {
    return { ...tab, panes };
  }

  return {
    ...tab,
    connection,
    title: refreshedTabTitle(tab, connection),
    toolbarTitle,
    subtitle: refreshedTabSubtitle(tab, connection),
    panes,
  };
}

function refreshedTabTitle(tab: WorkspaceTab, connection: Connection) {
  if (tab.kind === "sftp") {
    return `${connection.name} SFTP`;
  }
  if (tab.id.startsWith(`tab-${connection.id}-terminal-`)) {
    return `${connection.name} terminal`;
  }
  return connection.name;
}

function refreshedTabSubtitle(tab: WorkspaceTab, connection: Connection) {
  if (tab.kind === "sftp") {
    return `${connection.user}@${connection.host}`;
  }
  if (tab.kind === "webview") {
    return tab.subtitle;
  }
  if (tab.id.startsWith(`tab-${connection.id}-terminal-`)) {
    const firstPane = tab.panes.find((pane): pane is TerminalPane => isTerminalPane(pane));
    const path = firstPane?.cwd?.trim() || ".";
    return `${connection.user}@${formatConnectionAddress(connection)}:${path}`;
  }
  if (tab.panes[0]?.kind === "remoteDesktop") {
    return remoteDesktopSubtitle(connection);
  }
  return terminalConnectionSubtitle(connection);
}

function refreshedPaneTitle(pane: WorkspacePane, connection: Connection) {
  if (pane.kind === "webview" || pane.kind === "remoteDesktop") {
    return connection.name;
  }
  return pane.title;
}

function formatConnectionAddress(connection: Connection) {
  return connection.port
    ? `${connection.host}:${connection.port}`
    : connection.host;
}

function remoteDesktopSubtitle(connection: Connection) {
  return connection.user?.trim() || formatConnectionAddress(connection);
}

function urlConnectionSubtitle(connection: Connection) {
  if (!connection.url) {
    return "";
  }
  try {
    return new URL(connection.url).host;
  } catch {
    return connection.url;
  }
}

function terminalConnectionSubtitle(connection: Connection) {
  if (connection.type === "local") {
    return i18next.t("workspace.localTerminalSession");
  }
  if (connection.type === "serial") {
    return `${connection.serialLine ?? connection.host} @ ${connection.serialSpeed ?? 9600}`;
  }
  if (connection.user.trim()) {
    return `${connection.user}@${formatConnectionAddress(connection)}`;
  }
  return formatConnectionAddress(connection);
}
