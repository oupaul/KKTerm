import { useEffect, useLayoutEffect } from "react";
import type { RefObject } from "react";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import type { AppearanceSettings } from "../types";
import type { PanelLayoutState } from "./workspaceChromeLayout";

export function useFrontendLaunchTimestamp() {
  const setFrontendLaunchMs = useWorkspaceStore((state) => state.setFrontendLaunchMs);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFrontendLaunchMs(Math.round(performance.now()));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [setFrontendLaunchMs]);
}

export function useDebugFrontendHeartbeat() {
  const advancedDebuggingEnabled = useWorkspaceStore(
    (state) => state.generalSettings.advancedDebuggingEnabled,
  );

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let intervalId = 0;
    let animationFrameId = 0;
    let lastAnimationFrameMs = performance.now();
    let lastPointerMs: number | null = null;
    let lastKeyMs: number | null = null;
    let lastFocusMs: number | null = null;
    let lastBlurMs: number | null = null;
    const age = (timestamp: number | null) =>
      timestamp === null ? null : Math.max(0, Math.round(performance.now() - timestamp));
    const recordAnimationFrame = () => {
      lastAnimationFrameMs = performance.now();
      animationFrameId = window.requestAnimationFrame(recordAnimationFrame);
    };
    const recordPointer = () => {
      lastPointerMs = performance.now();
    };
    const recordKey = () => {
      lastKeyMs = performance.now();
    };
    const recordFocus = () => {
      lastFocusMs = performance.now();
    };
    const recordBlur = () => {
      lastBlurMs = performance.now();
    };
    const sendHeartbeat = () => {
      void invokeCommand("debug_frontend_heartbeat", {
        heartbeat: {
          documentHasFocus: document.hasFocus(),
          visibilityState: document.visibilityState,
          rafAgeMs: age(lastAnimationFrameMs),
          pointerAgeMs: age(lastPointerMs),
          keyAgeMs: age(lastKeyMs),
          windowFocusAgeMs: age(lastFocusMs),
          windowBlurAgeMs: age(lastBlurMs),
        },
      }).catch(() => undefined);
    };

    void invokeCommand("is_debug_build").then((debugBuild) => {
      if (disposed || (!debugBuild && !advancedDebuggingEnabled)) {
        return;
      }
      animationFrameId = window.requestAnimationFrame(recordAnimationFrame);
      window.addEventListener("pointerdown", recordPointer, { capture: true });
      window.addEventListener("pointermove", recordPointer, { capture: true });
      window.addEventListener("keydown", recordKey, { capture: true });
      window.addEventListener("focus", recordFocus);
      window.addEventListener("blur", recordBlur);
      sendHeartbeat();
      intervalId = window.setInterval(sendHeartbeat, 2_000);
    });

    return () => {
      disposed = true;
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("pointerdown", recordPointer, { capture: true });
      window.removeEventListener("pointermove", recordPointer, { capture: true });
      window.removeEventListener("keydown", recordKey, { capture: true });
      window.removeEventListener("focus", recordFocus);
      window.removeEventListener("blur", recordBlur);
    };
  }, [advancedDebuggingEnabled]);
}

export function useHostUsagePolling() {
  const statusBarEnabled = useWorkspaceStore(
    (state) => state.generalSettings.statusBarEnabled,
  );
  const statusBarMonitorEnabled = useWorkspaceStore(
    (state) => state.generalSettings.statusBarMonitorEnabled,
  );
  const statusBarMonitorIntervalSeconds = useWorkspaceStore(
    (state) => state.generalSettings.statusBarMonitorIntervalSeconds,
  );
  const setHostUsageSnapshot = useWorkspaceStore((state) => state.setHostUsageSnapshot);

  useEffect(() => {
    if (!isTauriRuntime() || !statusBarEnabled || !statusBarMonitorEnabled) {
      return;
    }

    let disposed = false;
    let refreshing = false;
    async function refreshHostUsageSnapshot() {
      if (refreshing) {
        return;
      }
      refreshing = true;
      try {
        const snapshot = await invokeCommand("get_host_usage_snapshot");
        if (!disposed) {
          setHostUsageSnapshot(snapshot);
        }
      } catch {
        // Host usage is informational only.
      } finally {
        refreshing = false;
      }
    }

    void refreshHostUsageSnapshot();
    const intervalMs = statusBarMonitorIntervalSeconds * 1_000;
    const interval = window.setInterval(() => void refreshHostUsageSnapshot(), intervalMs);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [
    setHostUsageSnapshot,
    statusBarEnabled,
    statusBarMonitorEnabled,
    statusBarMonitorIntervalSeconds,
  ]);
}

export function useGlobalContextMenuSuppression() {
  useEffect(() => {
    const preventDefaultContextMenu = (event: globalThis.MouseEvent) => {
      if (isEditableContextMenuTarget(event.target)) {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("contextmenu", preventDefaultContextMenu, { capture: true });
    return () => {
      window.removeEventListener("contextmenu", preventDefaultContextMenu, { capture: true });
    };
  }, []);
}

const TEXT_INPUT_TYPES = new Set([
  "",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function isEditableContextMenuTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  const editable = target.closest("input, textarea, [contenteditable]");
  if (editable instanceof HTMLTextAreaElement) {
    return true;
  }
  if (editable instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(editable.type);
  }
  if (editable instanceof HTMLElement) {
    return editable.isContentEditable;
  }
  return false;
}

export function useAppShellAppearance({
  aiPanelLayout,
  appShellRef,
  appearanceSettings,
  connectionPanelLayout,
}: {
  aiPanelLayout: PanelLayoutState;
  appShellRef: RefObject<HTMLDivElement | null>;
  appearanceSettings: AppearanceSettings;
  connectionPanelLayout: PanelLayoutState;
}) {
  useLayoutEffect(() => {
    const node = appShellRef.current;
    if (!node) {
      return;
    }

    node.style.setProperty(
      "--connection-panel-width",
      connectionPanelLayout.collapsed ? "0px" : `${connectionPanelLayout.width}px`,
    );
    node.style.setProperty("--connection-resize-width", "3px");
    node.style.setProperty("--ai-panel-width", aiPanelLayout.collapsed ? "0px" : `${aiPanelLayout.width}px`);
    node.style.setProperty("--ai-resize-width", aiPanelLayout.collapsed ? "34px" : "3px");
    node.style.setProperty("--app-ui-font-family", appearanceSettings.appFontFamily);
    node.setAttribute("data-color-scheme", appearanceSettings.colorScheme);
    document.documentElement.setAttribute("data-color-scheme", appearanceSettings.colorScheme);
  }, [
    aiPanelLayout.collapsed,
    aiPanelLayout.width,
    appShellRef,
    appearanceSettings.appFontFamily,
    appearanceSettings.colorScheme,
    connectionPanelLayout.collapsed,
    connectionPanelLayout.width,
  ]);
}
