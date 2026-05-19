import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AssistantPanel } from "./ai/AssistantPanel";
import type { AssistantPageContext } from "./ai/AssistantPanel";
import { ActivityRail } from "./app/ActivityRail";
import type { ActivePage } from "./app/ActivityRail";
import { AppUpdatePrompt } from "./app/AppUpdatePrompt";
import {
  findTutorialTargetElement,
  TutorialOverlay,
  type TutorialHighlightRequest,
} from "./app/TutorialOverlay";
import {
  useAppShellAppearance,
  useFrontendLaunchTimestamp,
  useGlobalContextMenuSuppression,
  useHostUsagePolling,
} from "./app/appShellEffects";
import {
  PanelResizeHandle,
  useWorkspaceChromeLayout,
} from "./app/workspaceChromeLayout";
import { ConnectionSidebar } from "./connections/ConnectionSidebar";
import { DashboardPage } from "./dashboard/DashboardPage";
import { useDashboardStore } from "./dashboard/state/dashboardStore";
import { useDashboardBackendInvalidation } from "./dashboard/state/invalidation";
import { ariaHidden } from "./lib/aria";
import { useBootstrapSettings } from "./lib/settings";
import { SettingsPage } from "./settings/SettingsPage";
import type { SettingsAssistantContext } from "./settings/settingsAssistantContext";
import { useWorkspaceStore } from "./store";
import { StatusBar } from "./workspace/StatusBar";
import { TabStrip, WorkspaceCanvas } from "./workspace/WorkspaceCanvas";
import "@xterm/xterm/css/xterm.css";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState<ActivePage>("workspace");
  const [dashboardMounted, setDashboardMounted] = useState(false);
  const previousBasePageRef = useRef<"workspace" | "dashboard">("workspace");

  function isOverlayPage(page: ActivePage): page is "settings" {
    return page === "settings";
  }

  function navigateToPage(page: ActivePage) {
    if (page === "dashboard") {
      setDashboardMounted(true);
    }
    if (isOverlayPage(page) && !isOverlayPage(activePage)) {
      previousBasePageRef.current = activePage as "workspace" | "dashboard";
    }
    setActivePage(page);
  }

  function openAssistantPanel() {
    expandAiPanel();
  }

  function openDashboardView(viewId: string) {
    useDashboardStore.getState().setActiveView(viewId);
    navigateToPage("dashboard");
  }

  const [dashboardAssistantContext, setDashboardAssistantContext] =
    useState<AssistantPageContext>();
  const [settingsAssistantContext, setSettingsAssistantContext] =
    useState<SettingsAssistantContext>();
  const [tutorialHighlightRequest, setTutorialHighlightRequest] =
    useState<TutorialHighlightRequest>();
  const appearanceSettings = useWorkspaceStore((state) => state.appearanceSettings);
  const resetAllLayouts = useWorkspaceStore((state) => state.resetAllLayouts);
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const {
    aiPanelLayout,
    connectionPanelLayout,
    expandAiPanel,
    handleAiPanelResize,
    handleConnectionPanelResize,
    panelAnimating,
    resetWorkspaceChromeLayout,
    toggleAiPanel,
    toggleConnectionPanel,
  } = useWorkspaceChromeLayout(resetAllLayouts);

  const { generalSettingsReady } = useBootstrapSettings();
  useDashboardBackendInvalidation();
  useFrontendLaunchTimestamp();
  useHostUsagePolling();
  useGlobalContextMenuSuppression();
  useAppShellAppearance({
    aiPanelLayout,
    appShellRef,
    appearanceSettings,
    connectionPanelLayout,
  });

  function assistantPageContext() {
    if (activePage === "dashboard") {
      return dashboardAssistantContext;
    }
    if (activePage === "settings") {
      return settingsAssistantContext;
    }
    return undefined;
  }

  function handleTutorialRequest(request: TutorialHighlightRequest) {
    if (!findTutorialTargetElement(request.targetId)) {
      return { ok: false, error: t("ai.tutorialTargetNotFound") };
    }
    setTutorialHighlightRequest(request);
    return { ok: true };
  }

  return (
    <div
      ref={appShellRef}
      className={`app-shell ${panelAnimating ? "panel-animating" : ""} ${
        activePage === "settings" ? "settings-mode" : ""
      } ${
        connectionPanelLayout.collapsed ? "connections-collapsed" : ""
      } ${aiPanelLayout.collapsed ? "ai-assist-collapsed" : ""}`}
    >
      <ActivityRail
        key="activity-rail"
        activePage={activePage}
        connectionsCollapsed={connectionPanelLayout.collapsed}
        onConnectionsToggle={toggleConnectionPanel}
        onNavigate={navigateToPage}
      />
      <div key="workspace-page" className="workspace-page" {...ariaHidden(activePage !== "workspace")}>
        <ConnectionSidebar
          collapsed={connectionPanelLayout.collapsed}
          onToggleCollapsed={toggleConnectionPanel}
        />
        {connectionPanelLayout.collapsed ? (
          <div className="connection-collapsed-separator" aria-hidden="true" />
        ) : (
          <PanelResizeHandle
            ariaLabel={t("app.resizeConnections")}
            side="left"
            onPointerDown={handleConnectionPanelResize}
          />
        )}
        <main className="workspace">
          <TabStrip />
          <WorkspaceCanvas workspaceActive={activePage === "workspace"} />
        </main>
      </div>
      <PanelResizeHandle
        key="ai-resize-handle"
        ariaLabel={t("app.resizeAiAssistant")}
        side="right"
        collapsed={aiPanelLayout.collapsed}
        collapsedLabel={t("app.aiAssistant")}
        onClick={aiPanelLayout.collapsed ? expandAiPanel : undefined}
        onPointerDown={handleAiPanelResize}
      />
      <AssistantPanel
        key="assistant-panel"
        collapsed={aiPanelLayout.collapsed}
        onOpenSettings={() => navigateToPage("settings")}
        onTutorialRequest={handleTutorialRequest}
        onToggleCollapsed={toggleAiPanel}
        pageContext={assistantPageContext()}
      />
      {activePage === "settings" ? (
        <SettingsPage
          key="settings-page"
          onBack={() => setActivePage(previousBasePageRef.current)}
          onAssistantContextChange={setSettingsAssistantContext}
          onResetLayout={resetWorkspaceChromeLayout}
        />
      ) : null}
      {dashboardMounted ? (
        <DashboardPage
          key="dashboard-page"
          dashboardActive={activePage === "dashboard"}
          onAssistantContextChange={setDashboardAssistantContext}
        />
      ) : null}
      <TutorialOverlay
        key="tutorial-overlay"
        onDismiss={() => setTutorialHighlightRequest(undefined)}
        request={tutorialHighlightRequest}
      />
      <StatusBar
        key="status-bar"
        onOpenAssistant={openAssistantPanel}
        onOpenDashboardView={openDashboardView}
      />
      <AppUpdatePrompt key="app-update-prompt" settingsReady={generalSettingsReady} />
    </div>
  );
}

export default App;
