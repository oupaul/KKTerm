import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import type { AppearanceSettings, ColorScheme, SystemAccentColor } from "../types";
import type { PanelLayoutState } from "./workspaceChromeLayout";

type AppliedColorScheme = "dark" | "light" | Exclude<ColorScheme, "match-os">;

export function resolveAppliedColorScheme(colorScheme: ColorScheme): AppliedColorScheme {
  if (colorScheme !== "match-os") {
    return colorScheme;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function useAppliedColorScheme(colorScheme: ColorScheme) {
  const [appliedColorScheme, setAppliedColorScheme] = useState<AppliedColorScheme>(() =>
    resolveAppliedColorScheme(colorScheme),
  );

  useEffect(() => {
    setAppliedColorScheme(resolveAppliedColorScheme(colorScheme));
  }, [colorScheme]);

  return appliedColorScheme;
}

function accentSoftColor(accent: string, appliedColorScheme: AppliedColorScheme) {
  const match = accent.match(/^#(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})$/i);
  if (!match?.groups) {
    return undefined;
  }
  const red = Number.parseInt(match.groups.red, 16);
  const green = Number.parseInt(match.groups.green, 16);
  const blue = Number.parseInt(match.groups.blue, 16);
  const alpha = appliedColorScheme === "dark" ? 0.24 : 0.16;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function applySystemAccentColor(
  node: HTMLElement,
  accentColor: SystemAccentColor | null,
  appliedColorScheme: AppliedColorScheme,
) {
  if (!accentColor) {
    clearSystemAccentColor(node);
    return;
  }
  node.style.setProperty("--accent", accentColor.accent);
  node.style.setProperty("--nav-toolbar-accent", accentColor.accent);
  const accentSoft = accentSoftColor(accentColor.accent, appliedColorScheme);
  if (accentSoft) {
    node.style.setProperty("--accent-soft", accentSoft);
  }
}

function clearSystemAccentColor(node: HTMLElement) {
  node.style.removeProperty("--accent");
  node.style.removeProperty("--accent-soft");
  node.style.removeProperty("--nav-toolbar-accent");
}

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
  aiPanelAnimating,
  appliedColorScheme,
  appShellRef,
  appearanceSettings,
  connectionPanelLayout,
  connectionPanelAnimating,
}: {
  aiPanelLayout: PanelLayoutState;
  aiPanelAnimating: boolean;
  appliedColorScheme: AppliedColorScheme;
  appShellRef: RefObject<HTMLDivElement | null>;
  appearanceSettings: AppearanceSettings;
  connectionPanelLayout: PanelLayoutState;
  connectionPanelAnimating: boolean;
}) {
  useEffect(() => {
    const node = document.documentElement;
    if (appearanceSettings.colorScheme !== "match-os") {
      clearSystemAccentColor(node);
      return;
    }
    if (!isTauriRuntime()) {
      clearSystemAccentColor(node);
      return;
    }

    let disposed = false;
    void invokeCommand("get_system_accent_color")
      .then((accentColor) => {
        if (!disposed) {
          applySystemAccentColor(node, accentColor, appliedColorScheme);
        }
      })
      .catch(() => {
        if (!disposed) {
          clearSystemAccentColor(node);
        }
      });

    return () => {
      disposed = true;
    };
  }, [appearanceSettings.colorScheme, appliedColorScheme]);

  useLayoutEffect(() => {
    const node = appShellRef.current;
    if (!node) {
      return;
    }

    const aiPanelVisibleForLayout = !aiPanelLayout.collapsed || aiPanelAnimating;
    const connectionPanelVisibleForLayout = !connectionPanelLayout.collapsed || connectionPanelAnimating;

    node.style.setProperty(
      "--connection-panel-width",
      connectionPanelVisibleForLayout ? `${connectionPanelLayout.width}px` : "0px",
    );
    node.style.setProperty("--connection-resize-width", connectionPanelVisibleForLayout ? "3px" : "0px");
    node.style.setProperty("--ai-panel-width", aiPanelVisibleForLayout ? `${aiPanelLayout.width}px` : "0px");
    node.style.setProperty("--ai-resize-width", aiPanelLayout.collapsed ? "0px" : "3px");
    node.style.removeProperty("--app-ui-font-family");
    document.documentElement.style.setProperty("--app-ui-font-family", appearanceSettings.appFontFamily);
    node.setAttribute("data-color-scheme", appliedColorScheme);
    document.documentElement.setAttribute("data-color-scheme", appliedColorScheme);
    document.documentElement.setAttribute("data-selected-color-scheme", appearanceSettings.colorScheme);
  }, [
    aiPanelLayout.collapsed,
    aiPanelLayout.width,
    aiPanelAnimating,
    appliedColorScheme,
    appShellRef,
    appearanceSettings.appFontFamily,
    appearanceSettings.colorScheme,
    connectionPanelLayout.collapsed,
    connectionPanelLayout.width,
    connectionPanelAnimating,
  ]);
}
