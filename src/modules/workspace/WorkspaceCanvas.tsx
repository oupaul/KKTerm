import { connectionTypeForTab } from "./connections/utils";
import {
  dispatchConnectionTabContextMenu,
  isConnectionTabContextMenuConnection,
} from "./connections/connectionTabContextMenu";
import { ftpBrowserCommands, localBrowserCommands } from "../../lib/fileBrowserCommands";
import { RemoteDesktopWorkspace } from "./connections/remote-desktop/RemoteDesktopWorkspace";
import { SftpWorkspace } from "./connections/sftp/SftpWorkspace";
import { FileViewerWorkspace } from "./connections/file-viewer/FileViewerWorkspace";
import { TerminalWorkspace } from "./connections/terminal/TerminalWorkspace";
import { WebViewWorkspace } from "./connections/webview/WebViewWorkspace";
import { GitBrowser } from "../git/GitBrowser";
import { CompareViewer } from "../compare/CompareViewer";
import { FolderCompareView } from "../compare/FolderCompareView";
import { ConnectionIcon } from "./connections/ConnectionIcon";
import { ChevronLeft, ChevronRight, Terminal, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  FormEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_WORKSPACE_ID, useWorkspaceStore } from "../../store";
import type { WorkspaceTab } from "../../types";

function tabDisplayTitle(tab: WorkspaceTab) {
  return tab.displayTitle?.trim() || tab.title;
}

function tabWorkspaceId(tab: WorkspaceTab) {
  return tab.workspaceId ?? DEFAULT_WORKSPACE_ID;
}

function DockableWorkspaceTab({
  children,
  isActive,
  tab,
}: {
  children: ReactNode;
  isActive: boolean;
  tab: WorkspaceTab;
}) {
  return (
    <div
      className={isActive ? "workspace-dockable-tab active" : "workspace-dockable-tab"}
      data-dock-pane-id={tab.panes[0]?.id ?? tab.id}
      data-dock-tab-id={tab.id}
    >
      {children}
    </div>
  );
}

export function TabStrip() {
  const { t } = useTranslation();
  const tabs = useWorkspaceStore((state) => state.tabs);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const activateTab = useWorkspaceStore((state) => state.activateTab);
  const renameTab = useWorkspaceStore((state) => state.renameTab);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameCanceledRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const visibleTabs = tabs.filter((tab) => tabWorkspaceId(tab) === activeWorkspaceId);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    updateScroll();
    const observer = new ResizeObserver(updateScroll);
    observer.observe(el);
    el.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateScroll);
    };
  }, [visibleTabs.length, updateScroll]);

  useEffect(() => {
    if (!editingTabId) {
      return;
    }
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [editingTabId]);

  function scrollLeft() {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    el.scrollBy({ left: -200, behavior: "smooth" });
  }

  function scrollRight() {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    el.scrollBy({ left: 200, behavior: "smooth" });
  }

  function handleTabContextMenu(tab: (typeof tabs)[number], event: ReactMouseEvent<HTMLElement>) {
    if (!isConnectionTabContextMenuConnection(tab.connection) || tab.sshPortForwardSessionId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activateTab(tab.id);
    dispatchConnectionTabContextMenu({
      connection: tab.connection,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function startRenamingTab(tab: WorkspaceTab) {
    renameCanceledRef.current = false;
    activateTab(tab.id);
    setEditingTabId(tab.id);
    setRenameDraft(tabDisplayTitle(tab));
  }

  function finishRenamingTab(tabId: string) {
    if (renameCanceledRef.current) {
      renameCanceledRef.current = false;
      return;
    }
    const nextTitle = renameDraft.trim();
    if (nextTitle) {
      void renameTab(tabId, nextTitle);
    }
    setEditingTabId(null);
    setRenameDraft("");
  }

  function cancelRenamingTab() {
    renameCanceledRef.current = true;
    setEditingTabId(null);
    setRenameDraft("");
  }

  function handleRenameSubmit(tabId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    finishRenamingTab(tabId);
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelRenamingTab();
    }
  }

  function handleTabMouseDown(event: ReactMouseEvent<HTMLElement>) {
    if (event.button !== 1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function handleTabAuxClick(tabId: string, event: ReactMouseEvent<HTMLElement>) {
    if (event.button !== 1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    closeTab(tabId);
  }

  return (
    <div className="tab-strip" aria-label={t("workspace.tabs")} data-tutorial-id="workspace.tabStrip">
      {canScrollLeft ? (
        <button
          aria-label={t("workspace.scrollTabsLeft")}
          className="tab-scroll-arrow tab-scroll-left"
          onClick={scrollLeft}
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
      ) : null}
      <div className="tab-scroll-container" ref={scrollRef}>
        {visibleTabs.map((tab) => {
          const displayTitle = tabDisplayTitle(tab);
          const isRenaming = editingTabId === tab.id;
          return (
            <div
              className={tab.id === activeTabId ? "tab active" : "tab"}
              key={tab.id}
              onAuxClick={(event) => handleTabAuxClick(tab.id, event)}
              onContextMenu={(event) => handleTabContextMenu(tab, event)}
              onMouseDown={handleTabMouseDown}
            >
              {isRenaming ? (
                <form
                  className="tab-rename-form"
                  onSubmit={(event) => handleRenameSubmit(tab.id, event)}
                >
                  <ConnectionIcon
                    iconBackgroundColor={connectionTypeForTab(tab).iconBackgroundColor}
                    iconDataUrl={connectionTypeForTab(tab).iconDataUrl}
                    localShell={connectionTypeForTab(tab).localShell}
                    size={14}
                    type={connectionTypeForTab(tab).type}
                  />
                  <input
                    aria-label={t("workspace.renameTab", { title: displayTitle })}
                    className="tab-rename-input"
                    onBlur={() => finishRenamingTab(tab.id)}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    ref={renameInputRef}
                    value={renameDraft}
                  />
                </form>
              ) : (
                <button
                  className="tab-button"
                  onClick={() => activateTab(tab.id)}
                  onDoubleClick={() => startRenamingTab(tab)}
                  type="button"
                >
                  <ConnectionIcon
                    iconBackgroundColor={connectionTypeForTab(tab).iconBackgroundColor}
                    iconDataUrl={connectionTypeForTab(tab).iconDataUrl}
                    localShell={connectionTypeForTab(tab).localShell}
                    size={14}
                    type={connectionTypeForTab(tab).type}
                  />
                  <span>{displayTitle}</span>
                </button>
              )}
              <button
                aria-label={t("workspace.closeTab", { title: displayTitle })}
                className="tab-close-button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
                title={t("workspace.closeTab", { title: displayTitle })}
                type="button"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      {canScrollRight ? (
        <button
          aria-label={t("workspace.scrollTabsRight")}
          className="tab-scroll-arrow tab-scroll-right"
          onClick={scrollRight}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function WorkspaceCanvas({
  onOpenAssistant = () => undefined,
  workspaceActive = true,
}: {
  onOpenAssistant?: () => void;
  workspaceActive?: boolean;
} = {}) {
  const { t } = useTranslation();
  const tabs = useWorkspaceStore((state) => state.tabs);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const localTerminalPopup = useWorkspaceStore((state) => state.localTerminalPopup);
  const closeLocalTerminalPopup = useWorkspaceStore((state) => state.closeLocalTerminalPopup);
  const gitBrowser = useWorkspaceStore((state) => state.gitBrowser);
  const closeGitBrowser = useWorkspaceStore((state) => state.closeGitBrowser);
  const compareView = useWorkspaceStore((state) => state.compareView);
  const closeCompareView = useWorkspaceStore((state) => state.closeCompareView);
  const folderCompareView = useWorkspaceStore((state) => state.folderCompareView);
  const closeFolderCompareView = useWorkspaceStore((state) => state.closeFolderCompareView);
  // The toolbar close button only earns its place when the tab strip is hidden;
  // otherwise the tab strip's own close button already covers it.
  const hideTopTabButtons = useWorkspaceStore((state) => state.generalSettings.hideTopTabButtons);
  const visibleTabs = tabs.filter((tab) => tabWorkspaceId(tab) === activeWorkspaceId);
  const showEmptyState = tabs.length === 0 || (!hideTopTabButtons && visibleTabs.length === 0);

  useEffect(() => {
    if (!localTerminalPopup) {
      return;
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLocalTerminalPopup();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeLocalTerminalPopup, localTerminalPopup]);

  const terminalPopup = localTerminalPopup
    ? createPortal(
        <div
          className="dialog-backdrop connection-dialog-backdrop sftp-popup-dialog-backdrop"
          role="presentation"
        >
          <section
            aria-label={localTerminalPopup.title}
            aria-modal="true"
            className="connection-dialog sftp-popup-dialog local-terminal-popup-dialog"
            role="dialog"
          >
            <div className="sftp-popup-dialog-body local-terminal-popup-dialog-body">
              <TerminalWorkspace
                allowPaneLayoutControls={false}
                isActive={true}
                onClose={closeLocalTerminalPopup}
                showSftpButton={false}
                trackConnectionSession={false}
                tab={localTerminalPopup}
              />
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  // The Git Browser is an app-window overlay (portalled to document.body) so it
  // floats above workspace chrome and native surfaces, per the overlay rule.
  const gitBrowserOverlay = gitBrowser
    ? createPortal(
        <GitBrowser target={gitBrowser} onClose={closeGitBrowser} />,
        document.body,
      )
    : null;

  // The File Compare overlay floats above workspace chrome and native surfaces,
  // same as the Git Browser, per the overlay rule.
  const compareOverlay = compareView
    ? createPortal(
        <CompareViewer view={compareView} onClose={closeCompareView} />,
        document.body,
      )
    : null;

  // The Folder Compare overlay (Beyond Compare-style directory diff) floats
  // above workspace chrome the same way, per the overlay rule.
  const folderCompareOverlay = folderCompareView
    ? createPortal(
        <FolderCompareView view={folderCompareView} onClose={closeFolderCompareView} />,
        document.body,
      )
    : null;

  if (tabs.length === 0) {
    return (
      <>
        <div className="workspace-canvas" data-dock-empty-canvas data-tutorial-id="workspace.canvas">
          <section className="empty-workspace" data-tutorial-id="workspace.emptyState">
            <Terminal size={28} />
            <h2>{t("workspace.noActiveSession")}</h2>
            <p>{t("workspace.openFromTree")}</p>
          </section>
        </div>
        {terminalPopup}
        {gitBrowserOverlay}
        {compareOverlay}
        {folderCompareOverlay}
      </>
    );
  }

  return (
    <>
      <div
        className="workspace-canvas"
        data-dock-empty-canvas={showEmptyState ? "" : undefined}
        data-tutorial-id="workspace.canvas"
      >
      {showEmptyState ? (
        <section className="empty-workspace" data-tutorial-id="workspace.emptyState">
          <Terminal size={28} />
          <h2>{t("workspace.noActiveSession")}</h2>
          <p>{t("workspace.openFromTree")}</p>
        </section>
      ) : null}
      {tabs.map((tab) => {
        const tabIsActive = workspaceActive && tab.id === activeTabId;
        if (tab.kind === "sftp") {
          return (
            <DockableWorkspaceTab isActive={tabIsActive} key={tab.id} tab={tab}>
              <SftpWorkspace
                isActive={tabIsActive}
                onClose={hideTopTabButtons ? () => closeTab(tab.id) : undefined}
                tab={tab}
              />
            </DockableWorkspaceTab>
          );
        }
        if (tab.kind === "ftp") {
          const connection = tab.connection;
          const ftpOptions = connection?.ftpOptions ?? {
            protocol: "ftp" as const,
            mode: "passive" as const,
            transferType: "binary" as const,
            utf8: true,
            showHidden: false,
            ignoreCertErrors: false,
          };
          // Route plain FTP / FTPS through the same SftpWorkspace, parameterized
          // with the FTP transport adapter so the UI is identical to the
          // SSH-launched SFTP browser. The adapter disables features the FTP
          // protocol can't support (e.g. POSIX permissions editor).
          const commands = connection
            ? ftpBrowserCommands(connection, ftpOptions)
            : undefined;
          return (
            <DockableWorkspaceTab isActive={tabIsActive} key={tab.id} tab={tab}>
              <SftpWorkspace
                commands={commands}
                isActive={tabIsActive}
                onClose={hideTopTabButtons ? () => closeTab(tab.id) : undefined}
                tab={tab}
              />
            </DockableWorkspaceTab>
          );
        }
        if (tab.kind === "localFiles") {
          // Local File Explorer reuses the SFTP browser surface driven by the
          // local-filesystem adapter (no network session).
          return (
            <DockableWorkspaceTab isActive={tabIsActive} key={tab.id} tab={tab}>
              <SftpWorkspace
                commands={localBrowserCommands()}
                isActive={tabIsActive}
                onClose={hideTopTabButtons ? () => closeTab(tab.id) : undefined}
                tab={tab}
              />
            </DockableWorkspaceTab>
          );
        }
        if (tab.kind === "fileViewer") {
          // Document Connection: open a single local file in the universal
          // viewer / light editor (no network session).
          return (
            <DockableWorkspaceTab isActive={tabIsActive} key={tab.id} tab={tab}>
              <FileViewerWorkspace
                isActive={tabIsActive}
                onClose={hideTopTabButtons ? () => closeTab(tab.id) : undefined}
                tab={tab}
              />
            </DockableWorkspaceTab>
          );
        }
        if (tab.kind === "webview") {
          return (
            <DockableWorkspaceTab isActive={tabIsActive} key={tab.id} tab={tab}>
              <WebViewWorkspace
                isActive={tabIsActive}
                onClose={hideTopTabButtons ? () => closeTab(tab.id) : undefined}
                onOpenAssistant={onOpenAssistant}
                tab={tab}
              />
            </DockableWorkspaceTab>
          );
        }
        if (tab.kind === "remoteDesktop") {
          return (
            <DockableWorkspaceTab isActive={tabIsActive} key={tab.id} tab={tab}>
              <RemoteDesktopWorkspace
                isActive={tabIsActive}
                onOpenAssistant={onOpenAssistant}
                tab={tab}
              />
            </DockableWorkspaceTab>
          );
        }
        return (
          <TerminalWorkspace
            isActive={tabIsActive}
            key={tab.id}
            onOpenAssistant={onOpenAssistant}
            tab={tab}
          />
        );
        })}
      </div>
      {terminalPopup}
      {gitBrowserOverlay}
      {compareOverlay}
      {folderCompareOverlay}
    </>
  );
}
