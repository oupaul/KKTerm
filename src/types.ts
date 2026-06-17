import type { AccentName, DashboardBackground, IconName, WidgetLayoutEnforcement } from "./modules/dashboard/types";

export type ConnectionType =
  | "local"
  | "ssh"
  | "telnet"
  | "serial"
  | "url"
  | "rdp"
  | "vnc"
  | "ftp"
  | "localFiles"
  | "fileView";

/**
 * A named, isolated container of Connections. The first Workspace ("Default")
 * is seeded and permanent; additional Workspaces are user-created. Switching the
 * active Workspace re-scopes the Connection Tree only — open Sessions/Tabs,
 * Dashboard, and Settings remain global.
 */
export interface Workspace {
  id: string;
  name: string;
  icon?: string | null;
  iconColor?: string | null;
  isDefault: boolean;
  sortOrder: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  icon?: string | null;
  iconColor?: string | null;
  importConnectionIds?: string[];
}

export interface RenameWorkspaceRequest {
  id: string;
  name: string;
  icon?: string | null;
  iconColor?: string | null;
}

export interface ReorderWorkspacesRequest {
  orderedIds: string[];
}
export type ConnectionStatus = "connected" | "idle" | "offline";
export type SshAuthMethod = "keyFile" | "password" | "agent";

/** Per-pane File Explorer / SFTP browser view options (item zoom + content-view
 * background), persisted durably on the Connection. */
export interface FileBrowserPaneViewOptions {
  zoom?: number;
  background?: DashboardBackground | null;
}
export interface FileBrowserViewOptions {
  local?: FileBrowserPaneViewOptions;
  remote?: FileBrowserPaneViewOptions;
}

export interface Connection {
  id: string;
  name: string;
  tabTitle?: string | null;
  host: string;
  user: string;
  port?: number;
  keyPath?: string;
  proxyJump?: string;
  sshSocksProxy?: string;
  sshSocksProxyUsername?: string;
  sshSocksProxyInheritDefaults?: boolean;
  authMethod?: SshAuthMethod;
  hasPassword?: boolean;
  localShell?: string;
  localStartupDirectory?: string;
  localStartupScript?: string;
  serialLine?: string;
  serialSpeed?: number;
  url?: string;
  dataPartition?: string;
  useTmuxSessions?: boolean;
  tmuxConnectionId?: string;
  passwordCredentialId?: string | null;
  urlCredentialUsername?: string;
  hasUrlCredential?: boolean;
  iconDataUrl?: string | null;
  iconBackgroundColor?: string | null;
  terminalOpacity?: number | null;
  terminalBackground?: DashboardBackground | null;
  fileBrowserViewOptions?: FileBrowserViewOptions | null;
  rdpOptions?: RdpConnectionOptions;
  vncOptions?: VncConnectionOptions;
  ftpOptions?: FtpConnectionOptions;
  type: ConnectionType;
  status: ConnectionStatus;
}

export interface ConnectionFolder {
  id: string;
  name: string;
  iconDataUrl?: string | null;
  connections: Connection[];
  folders: ConnectionFolder[];
}

export interface ConnectionTree {
  connections: Connection[];
  folders: ConnectionFolder[];
}

export interface CreateConnectionRequest {
  name: string;
  host?: string;
  user?: string;
  type: ConnectionType;
  folderId?: string;
  workspaceId?: string;
  port?: number;
  keyPath?: string;
  proxyJump?: string;
  sshSocksProxy?: string;
  sshSocksProxyUsername?: string;
  sshSocksProxyInheritDefaults?: boolean;
  authMethod?: SshAuthMethod;
  localShell?: string;
  localStartupDirectory?: string;
  localStartupScript?: string;
  serialLine?: string;
  serialSpeed?: number;
  url?: string;
  dataPartition?: string;
  useTmuxSessions?: boolean;
  rdpOptions?: RdpConnectionOptions;
  vncOptions?: VncConnectionOptions;
  ftpOptions?: FtpConnectionOptions;
}

export interface CreateConnectionFolderRequest {
  name: string;
  parentFolderId?: string;
  workspaceId?: string;
  iconDataUrl?: string | null;
}

export interface RenameConnectionFolderRequest {
  id: string;
  name: string;
  iconDataUrl?: string | null;
}

export interface RenameConnectionRequest {
  id: string;
  name: string;
}

export interface UpdateConnectionRequest extends CreateConnectionRequest {
  id: string;
}

export interface DuplicateConnectionRequest {
  id: string;
  name?: string;
}

export interface MoveConnectionFolderRequest {
  id: string;
  parentFolderId?: string;
  targetIndex: number;
}

export interface MoveConnectionRequest {
  id: string;
  folderId?: string;
  targetIndex: number;
}

export interface TerminalPane {
  kind?: "terminal";
  id: string;
  childConnectionId?: string;
  title: string;
  toolbarTitle?: string;
  cwd: string;
  buffer: string;
  connection?: Connection;
  fontSize?: number;
  terminalBackground?: DashboardBackground | null;
  tmuxSessionId?: string;
  tmuxUnavailable?: boolean;
  x11ForwardingStatus?: "disabled" | "enabled" | "rejected";
}

export interface UrlPane {
  kind: "webview";
  id: string;
  childConnectionId?: string;
  title: string;
  toolbarTitle?: string;
  connection: Connection;
  url: string;
  dataPartition?: string;
  sshPortForwardSessionId?: string;
  sshPortForwardRemotePort?: number;
}

export interface RemoteDesktopPane {
  kind: "remoteDesktop";
  id: string;
  childConnectionId?: string;
  title: string;
  toolbarTitle?: string;
  connection: Connection;
}

export interface FileBrowserPane {
  kind: "sftp" | "ftp" | "localFiles";
  id: string;
  childConnectionId?: string;
  title: string;
  toolbarTitle?: string;
  connection: Connection;
}

/**
 * A File Viewer Pane (kind `fileViewer`) renders a single local file in the
 * universal viewer/light-editor surface. The target file path is carried on
 * `connection.localStartupDirectory` (the File Viewer reuses that non-secret
 * local-path slot for its file path), so no separate pane field is needed.
 */
export interface FileViewerPane {
  kind: "fileViewer";
  id: string;
  childConnectionId?: string;
  title: string;
  toolbarTitle?: string;
  connection: Connection;
}

export type WorkspacePane =
  | TerminalPane
  | UrlPane
  | RemoteDesktopPane
  | FileBrowserPane
  | FileViewerPane;

export interface QuickCommand {
  id: string;
  label: string;
  command: string;
  iconName: IconName;
  accentName: AccentName;
  sendEnter: boolean;
  confirm: boolean;
}

export type SplitDirection = "right" | "left" | "down" | "up";
export type SplitOrientation = "horizontal" | "vertical";

export type LayoutNode =
  | { type: "leaf"; paneId: string }
  | { type: "split"; orientation: SplitOrientation; children: LayoutNode[] };

export type StoredLayoutNode =
  | { type: "leaf"; paneIndex: number }
  | {
      type: "split";
      orientation: SplitOrientation;
      children: StoredLayoutNode[];
    };

export interface StoredConnectionLayout {
  paneCount: number;
  layout: StoredLayoutNode;
  panes?: StoredLayoutPane[];
}

export interface StoredLayoutPane {
  kind?: WorkspacePane["kind"];
  connection: Connection;
  title?: string;
  cwd?: string;
  fontSize?: number;
  terminalBackground?: DashboardBackground | null;
  tmuxSessionId?: string;
  url?: string;
  dataPartition?: string;
}

export type TerminalCursorStyle = "block" | "bar" | "underline";

export interface GeneralSettings {
  autoBackupEnabled: boolean;
  autoUpdateChecksEnabled: boolean;
  showConnectedConnectionsInRail: boolean;
  showAllConnectionsInTree: boolean;
  hideTopTabButtons: boolean;
  doubleClickOpensConnection: boolean;
  submitAiAttachmentsDirectly: boolean;
  separateSplitTerminalBackgrounds: boolean;
  showInstallerOnRail: boolean;
  installerCheckIntervalSeconds: number;
  pinnedConnectionIds: string[];
  allowClipboardRead: boolean;
  autoStartWithWindows: boolean;
  minimizeToTray: boolean;
  dontSleepEnabled: boolean;
  dontSleepForegroundOnly: boolean;
  useDirectxScreenCapture: boolean;
  statusBarEnabled: boolean;
  statusBarMonitorEnabled: boolean;
  statusBarMonitorIntervalSeconds: number;
  advancedDebuggingEnabled: boolean;
  rdpWebviewStability: boolean;
  lastBackupAt?: string | null;
}

export type SecretStoreKind = "os" | "file";

export interface CredentialSettings {
  secretStore: SecretStoreKind;
}

export interface ConfigureEncryptedFileSecretStoreRequest {
  password: string;
  createIfMissing: boolean;
}

export interface ConfigureEncryptedFileSecretStoreResult {
  settings: CredentialSettings;
  status: KeychainStatus;
}

export type AppLauncherLaunchMode = "normal" | "admin" | "differentUser" | "openFolder";
export type AppLauncherViewMode = "icons" | "list" | "details";
export type AppLauncherSortField = "name" | "path" | "type" | "size" | "modified";
export type AppLauncherSortDirection = "asc" | "desc";

export interface AppLauncherSortState {
  field: AppLauncherSortField;
  direction: AppLauncherSortDirection;
}

export interface AppLauncherEntry {
  id: string;
  name: string;
  path: string;
  arguments?: string | null;
  workingDirectory?: string | null;
  iconDataUrl?: string | null;
  railPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppLauncherSettings {
  entries: AppLauncherEntry[];
  viewMode: AppLauncherViewMode;
  listSort: AppLauncherSortState;
  detailsSort: AppLauncherSortState;
  showFileExtensions: boolean;
}

export interface DashboardSettings {
  confirmRemove: boolean;
  defaultLandingView: string;
  /**
   * Hard cap on simultaneously active script widgets per renderer. Backed by
   * the same field on the Rust DashboardSettings struct; validated 1..=100 at
   * the storage boundary. See ADR 0006.
   */
  maxActiveScriptWidgets: number;
  /**
   * Global kill-switch for KK.net.* APIs in script widgets. When false, no
   * widget-origin network Tauri commands run regardless of per-widget flags.
   * Has no effect on AI assistant standalone network tools.
   */
  allowWidgetNetworkTools: boolean;
  /**
   * When true, newly-created Dashboard Views automatically start with a random
   * local dynamic background. Existing Views are unchanged.
   */
  useRandomDynamicBackground: boolean;
  /**
   * How strictly the script-widget iframe forces AI-created layout to fill its
   * frame. Applied live at render time inside the iframe (`buildSrcdoc`), so
   * changing it re-lays-out existing widgets without regenerating them.
   * - `strict`  — #root acts as the widget shell: its outermost content is
   *   forced to fill the surface, neutralizing centered mini-cards and
   *   shrink-to-content wrappers (the dominant "messy layout" failure mode).
   * - `moderate` — the historical behavior; the widget owns its own fill.
   * - `low`     — maximum authoring freedom; content may size to its natural
   *   box and overflow the frame.
   */
  widgetLayoutEnforcement: WidgetLayoutEnforcement;
}

export interface PreparedAppLauncherEntry {
  name: string;
  path: string;
  exists: boolean;
  runnable: boolean;
  iconDataUrl?: string | null;
  fileKind: "file" | "folder" | "missing";
  extension?: string | null;
  sizeBytes?: number | null;
  modifiedAtUnixMs?: number | null;
}

export interface DatabaseBackupInfo {
  path: string;
  filename: string;
  createdAt: string;
}

export interface ImportedDatabaseSnapshot {
  generalSettings: GeneralSettings;
  credentialSettings: CredentialSettings;
  terminalSettings: TerminalSettings;
  appearanceSettings: AppearanceSettings;
  appLauncherSettings: AppLauncherSettings;
  dashboardSettings: DashboardSettings;
  sshSettings: SshSettings;
  sftpSettings: SftpSettings;
  urlSettings: UrlSettings;
  rdpSettings: RdpSettings;
  vncSettings: VncSettings;
  screenshotSettings: ScreenshotSettings;
  aiProviderSettings: AiProviderSettings;
  connectionTree: ConnectionTree;
  backup: DatabaseBackupInfo;
}

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: TerminalCursorStyle;
  scrollbackLines: number;
  defaultTransparency: number;
  useRandomDynamicBackground: boolean;
  copyOnSelect: boolean;
  allowOsc52Clipboard: boolean;
  confirmMultilinePaste: boolean;
  defaultShell: string;
}

export type ColorScheme =
  | "default"
  | "dark"
  | "light"
  | "match-os"
  | "mac"
  | "orange"
  | "purple"
  | "pink"
  | "green-kuai-kuai"
  | "blue-see"
  | "blue-green-white"
  | "confetti"
  | "bubble-tea"
  | "semiconductor";

export interface AppearanceSettings {
  appFontFamily: string;
  colorScheme: ColorScheme;
  customFontPath?: string;
}

export interface SystemAccentColor {
  accent: string;
}

export interface CustomFont {
  name: string;
  path: string;
  extension: string;
}

export interface SshSettings {
  defaultUser: string;
  defaultPort: number;
  defaultKeyPath?: string;
  defaultProxyJump?: string;
  defaultSshSocksProxy?: string;
  defaultSshSocksProxyUsername?: string;
  bufferLines: number;
  defaultTransparency: number;
  defaultUseTmuxSessions: boolean;
  useRandomDynamicBackground: boolean;
  hideCommonPortRedirects: boolean;
  allowOsc52Clipboard: boolean;
  managedXServerEnabled: boolean;
  xServerPath?: string;
  xServerDisplay: number;
  xServerArgs: string;
}

export type SftpOverwriteBehavior = "fail" | "overwrite";
export type FileExplorerOpenMode = "external" | "inlineEditor";

export interface SftpSettings {
  overwriteBehavior: SftpOverwriteBehavior;
  fileExplorerOpenMode: FileExplorerOpenMode;
}

export interface UrlSettings {
  ignoreCertificateErrors: boolean;
}

export type RdpPerformanceProfile = "balanced" | "quality" | "speed";
export type RdpColorDepth = 15 | 16 | 24 | 32;

export type RemoteDesktopViewMode = "fit" | "stretch" | "actualSize" | "fitWidth" | "fitHeight";

export type RdpRemoteResolutionMode = "automatic" | "smartSizing" | "dpiZoom";
export type RdpRemoteResolutionFixed =
  | "1440x900"
  | "1400x1050"
  | "1600x1024"
  | "1600x1200"
  | "1600x1280"
  | "1680x1050"
  | "1900x1200"
  | "1920x1080"
  | "1920x1200"
  | "2048x1536"
  | "2560x2048"
  | "3200x2400"
  | "3840x2400";
export type RdpRemoteResolution = RdpRemoteResolutionMode | RdpRemoteResolutionFixed;

export const RDP_REMOTE_RESOLUTION_FIXED: readonly RdpRemoteResolutionFixed[] = [
  "1440x900",
  "1400x1050",
  "1600x1024",
  "1600x1200",
  "1600x1280",
  "1680x1050",
  "1900x1200",
  "1920x1080",
  "1920x1200",
  "2048x1536",
  "2560x2048",
  "3200x2400",
  "3840x2400",
] as const;

export interface RdpSettings {
  colorDepth: RdpColorDepth;
  redirectClipboard: boolean;
  redirectDrives: boolean;
  bitmapCache: boolean;
  performanceProfile: RdpPerformanceProfile;
  remoteResolution: RdpRemoteResolution;
  viewMode: RemoteDesktopViewMode;
}

export interface RdpConnectionOptions {
  inheritDefaults: boolean;
  colorDepth?: RdpColorDepth;
  redirectClipboard?: boolean;
  redirectDrives?: boolean;
  bitmapCache?: boolean;
  performanceProfile?: RdpPerformanceProfile;
  remoteResolution?: RdpRemoteResolution;
  viewMode?: RemoteDesktopViewMode;
}

export type VncColorLevel = "full" | "256" | "64" | "8";
export type VncPreferredEncoding = "tight" | "zrle" | "raw";

export interface VncSettings {
  sharedSession: boolean;
  viewOnly: boolean;
  colorLevel: VncColorLevel;
  preferredEncoding: VncPreferredEncoding;
  viewMode: RemoteDesktopViewMode;
}

export interface VncConnectionOptions {
  inheritDefaults: boolean;
  sharedSession?: boolean;
  viewOnly?: boolean;
  colorLevel?: VncColorLevel;
  preferredEncoding?: VncPreferredEncoding;
  viewMode?: RemoteDesktopViewMode;
}

export type FtpProtocol = "sftp" | "ftp" | "ftps";
export type FtpTlsMode = "explicit" | "implicit";
export type FtpConnectionMode = "passive" | "active";
export type FtpTransferType = "binary" | "ascii";

export interface FtpConnectionOptions {
  protocol: FtpProtocol;
  mode: FtpConnectionMode;
  tlsMode?: FtpTlsMode;
  transferType: FtpTransferType;
  utf8: boolean;
  showHidden: boolean;
  connectTimeoutSecs?: number;
  ignoreCertErrors: boolean;
  keepaliveSecs?: number;
}

export interface ScreenshotSettings {
  folderPath: string;
}

export type AiProviderKind =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "deepseek"
  | "gemini"
  | "grok"
  | "azure-openai"
  | "litellm"
  | "github-copilot"
  | "ollama"
  | "nvidia"
  | "opencode"
  | "openai-compatible";

export type AiReasoningEffort = "default" | "low" | "medium" | "high" | "max";
export type AiOpenAiApiMode = "chatCompletions" | "responses";
export type AiToolPermissionMode = "prompt" | "allowAll";

export type AiAssistantToolId =
  | "webSearch"
  | "webFetch"
  | "shellCommand"
  | "appDataFileSearch"
  | "appDataFileRead"
  | "currentTime"
  | "performanceCounters"
  | "email"
  | "dashboard"
  | "connections"
  | "sessions"
  | "tutorial"
  | "manual"
  | "network"
  | "watchdog"
  | "memory";

export type AiAssistantToolSettings = Record<AiAssistantToolId, boolean>;

export type SearchProvider = "scraper" | "brave" | "tavily" | "searxng";
export type EmailProvider = "resend" | "sendgrid" | "mailgun" | "postmark" | "smtp";
export type SmtpSecurity = "starttls" | "none";

export interface AiProviderSettings {
  providerKind: AiProviderKind;
  baseUrl: string;
  model: string;
  reasoningEffort: AiReasoningEffort;
  outputLanguage: string;
  customInstructions: string;
  apiMode: AiOpenAiApiMode;
  extraHeaders: string;
  allowInsecureTls: boolean;
  allowInsecureMcpHttp: boolean;
  showAllModels: boolean;
  cliExecutionPolicy: "suggestOnly";
  toolPermissionMode: AiToolPermissionMode;
  builtInMcpServerEnabled: boolean;
  builtInMcpAllowAllDangerous: boolean;
  useCodexCli: boolean;
  useClaudeCli: boolean;
  claudeCliPath?: string;
  codexCliPath?: string;
  disabledSkillNames: string[];
  customSkillsEnabled: boolean;
  tools: AiAssistantToolSettings;
  searchProvider: SearchProvider;
  searxngUrl: string;
  emailProvider: EmailProvider;
  emailFrom: string;
  mailgunDomain: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpSecurity: SmtpSecurity;
}

export interface WorkspaceTab {
  id: string;
  workspaceId?: string;
  childConnectionId?: string;
  childConnectionGroupParentId?: string;
  title: string;
  displayTitle?: string | null;
  toolbarTitle?: string;
  subtitle: string;
  kind: "terminal" | "sftp" | "webview" | "remoteDesktop" | "ftp" | "localFiles" | "fileViewer";
  panes: WorkspacePane[];
  layout?: LayoutNode;
  focusedPaneId?: string;
  maximizedPaneId?: string;
  quickCommandBarVisible?: boolean;
  connection?: Connection;
  url?: string;
  dataPartition?: string;
  sshPortForwardSessionId?: string;
  sshPortForwardRemotePort?: number;
}

export interface WorkspaceChildConnection {
  id: string;
  workspaceId?: string;
  parentConnectionId: string;
  name: string;
  tmuxSessionId?: string;
  cwd?: string;
  fontSize?: number;
  terminalOpacity?: number | null;
  terminalBackground?: DashboardBackground | null;
  iconDataUrl?: string | null;
  iconBackgroundColor?: string | null;
}

export interface FileEntry {
  name: string;
  kind: "file" | "folder" | "symlink" | "other";
  size: string;
  sizeBytes?: number;
  modified: string;
  modifiedTimestamp?: number;
  accessedTimestamp?: number;
  permissions?: number;
  mode?: string;
  uid?: number;
  user?: string;
  gid?: number;
  group?: string;
}

export interface AppBootstrap {
  productName: string;
  version: string;
  logStatus: string;
  storageStatus: string;
  keychainStatus: KeychainStatus;
}

export interface PerformanceSnapshot {
  uptimeMs: number;
  workingSetBytes?: number;
  memorySource: string;
  lastSshTerminalReadyMs?: number;
  lastSshTerminalReadyAtUnixSeconds?: number;
}

export interface HostUsageSnapshot {
  cpuPercent?: number;
  ramPercent?: number;
  networkDownstreamBytesPerSecond?: number;
  networkUpstreamBytesPerSecond?: number;
  sampledAtUnixSeconds: number;
  source: string;
}

export interface SystemPerformanceCountersSnapshot {
  cpuPercent?: number;
  logicalProcessorCount?: number;
  ramPercent?: number;
  ramTotalBytes?: number;
  ramAvailableBytes?: number;
  commitPercent?: number;
  commitTotalBytes?: number;
  commitLimitBytes?: number;
  systemCacheBytes?: number;
  handleCount?: number;
  processCount?: number;
  threadCount?: number;
  networkDownstreamBytesPerSecond?: number;
  networkUpstreamBytesPerSecond?: number;
  appWorkingSetBytes?: number;
  appPrivateBytes?: number;
  appPagefileBytes?: number;
  appReadBytesPerSecond?: number;
  appWriteBytesPerSecond?: number;
  appOtherBytesPerSecond?: number;
  systemUptimeSeconds?: number;
  systemDriveTotalBytes?: number;
  systemDriveFreeBytes?: number;
  systemDriveFreePercent?: number;
  sampledAtUnixSeconds: number;
  source: string;
}

export interface TerminalStartMetric {
  kind: "local" | "ssh" | "telnet" | "serial";
  title: string;
  durationMs: number;
  recordedAt: string;
}

export interface PerformanceMetrics {
  frontendLaunchMs?: number;
  backendUptimeMs?: number;
  workingSetBytes?: number;
  memorySource?: string;
  hostUsage?: HostUsageSnapshot;
  lastTerminalStart?: TerminalStartMetric;
  lastLocalTerminalStart?: TerminalStartMetric;
  lastSshTerminalStart?: TerminalStartMetric;
}

export interface StatusBarNotice {
  id: number;
  message: string;
  tone: "success" | "info" | "warning" | "error";
  durationMs: number;
  expiresAt: number | null;
}

export type SecretKind =
  | "connectionPassword"
  | "connectionPassphrase"
  | "sshSocksProxyPassword"
  | "urlPassword"
  | "aiApiKey"
  | "braveSearchApiKey"
  | "tavilySearchApiKey"
  | "emailApiKey"
  | "emailSmtpPassword"
  | "widgetSecret";

export interface KeychainStatus {
  available: boolean;
  service: string;
  backend: string;
  selectedStore: SecretStoreKind;
  availableStores: SecretStoreKind[];
}

export interface UrlCredentialSummary {
  connectionId: string;
  connectionName: string;
  url?: string;
  pageUrl?: string;
  username: string;
  usernameSelector?: string;
  passwordSelector?: string;
  fieldValues?: string;
  updatedAt: string;
}

export interface UrlDataPartitionSummary {
  name: string;
  connectionCount: number;
}

export interface SecretReferenceRequest {
  kind: SecretKind;
  ownerId: string;
}

export interface StoreSecretRequest extends SecretReferenceRequest {
  secret: string;
}

export interface SecretPresence {
  exists: boolean;
}

export type StoredCredentialKind =
  | "connectionPassword"
  | "urlPassword"
  | "aiApiKey"
  | "emailApiKey"
  | "emailSmtpPassword"
  | "widgetSecret";

export interface StoredCredentialSummary {
  id: string;
  kind: StoredCredentialKind;
  secretKind: SecretKind;
  ownerId: string;
  label: string;
  detail?: string;
  connectionType?: ConnectionType;
  host?: string;
  username?: string;
  updatedAt?: string;
  metadataSource: string;
  exists: boolean;
}

export interface ConnectionPasswordCredentialSummary {
  id: string;
  connectionType: ConnectionType;
  host: string;
  username: string;
  label: string;
  createdFromConnectionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteStoredCredentialRequest {
  kind: StoredCredentialKind;
  ownerId: string;
}

export type AssistantContextSnippet =
  | {
      id: string;
      kind: "text";
      sourceLabel: string;
      text: string;
      capturedAt: string;
    }
  | {
      id: string;
      kind: "screenshot";
      sourceLabel: string;
      imageDataUrl: string;
      width: number;
      height: number;
      capturedAt: string;
    };

export interface AssistantDirectSubmitRequest {
  id: string;
  prompt: string;
  snippet: AssistantContextSnippet;
}
