import { ChevronLeft, ChevronRight } from "../lib/reicon";
import { useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type PanelLayoutState = {
  collapsed: boolean;
  width: number;
};

const CONNECTION_PANEL_DEFAULT_WIDTH = 292;
const CONNECTION_PANEL_MIN_WIDTH = 220;
const CONNECTION_PANEL_MAX_WIDTH = 1560;

const AI_PANEL_DEFAULT_WIDTH = 334;
const AI_PANEL_MIN_WIDTH = 260;
const AI_PANEL_MAX_WIDTH = 1860;

const CONNECTION_PANEL_LAYOUT_KEY = "kkterm.layout.connectionsPanel.v1";
const AI_PANEL_LAYOUT_KEY = "kkterm.layout.aiAssistPanel.v2";
const PANEL_ANIMATION_MS = 180;
type AnimatingPanel = "connection" | "ai";

const defaultConnectionPanelLayout: PanelLayoutState = {
  collapsed: false,
  width: CONNECTION_PANEL_DEFAULT_WIDTH,
};

const defaultAiPanelLayout: PanelLayoutState = {
  collapsed: false,
  width: AI_PANEL_DEFAULT_WIDTH,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadPanelLayout(
  key: string,
  fallback: PanelLayoutState,
  minWidth: number,
  maxWidth: number,
): PanelLayoutState {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as Partial<PanelLayoutState> | null;
    if (!parsed) {
      return fallback;
    }
    return {
      collapsed: typeof parsed.collapsed === "boolean" ? parsed.collapsed : fallback.collapsed,
      width:
        typeof parsed.width === "number" && Number.isFinite(parsed.width)
          ? clamp(Math.round(parsed.width), minWidth, maxWidth)
          : fallback.width,
    };
  } catch {
    return fallback;
  }
}

function persistPanelLayout(key: string, layout: PanelLayoutState) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function removeLayoutStorageKeys() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("kkterm.layout.")) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
}

function beginDragResize(
  event: ReactPointerEvent<HTMLButtonElement>,
  onMove: (event: PointerEvent) => void,
) {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing-layout");

  const stop = () => {
    document.body.classList.remove("is-resizing-layout");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

export function useWorkspaceChromeLayout(
  resetAllLayouts: () => void,
  forceConnectionPanelExpandedOnInitialLoad = false,
) {
  const [connectionPanelLayout, setConnectionPanelLayout] = useState(() => {
    const storedLayout = loadPanelLayout(
      CONNECTION_PANEL_LAYOUT_KEY,
      defaultConnectionPanelLayout,
      CONNECTION_PANEL_MIN_WIDTH,
      CONNECTION_PANEL_MAX_WIDTH,
    );
    return {
      ...storedLayout,
      collapsed: forceConnectionPanelExpandedOnInitialLoad
        ? false
        : storedLayout.collapsed,
    };
  });
  const [aiPanelLayout, setAiPanelLayout] = useState(() =>
    loadPanelLayout(
      AI_PANEL_LAYOUT_KEY,
      defaultAiPanelLayout,
      AI_PANEL_MIN_WIDTH,
      AI_PANEL_MAX_WIDTH,
    ),
  );
  const [animatingPanel, setAnimatingPanel] = useState<AnimatingPanel | null>(null);
  const prefersReducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    persistPanelLayout(CONNECTION_PANEL_LAYOUT_KEY, connectionPanelLayout);
  }, [connectionPanelLayout]);

  useEffect(() => {
    persistPanelLayout(AI_PANEL_LAYOUT_KEY, aiPanelLayout);
  }, [aiPanelLayout]);

  useEffect(() => {
    if (!animatingPanel) {
      return;
    }
    const timer = setTimeout(() => setAnimatingPanel(null), PANEL_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [animatingPanel]);

  function beginPanelAnimation(panel: AnimatingPanel) {
    if (!prefersReducedMotion) {
      setAnimatingPanel(panel);
    }
  }

  function toggleConnectionPanel() {
    beginPanelAnimation("connection");
    setConnectionPanelLayout((layout) => ({ ...layout, collapsed: !layout.collapsed }));
  }

  function expandConnectionPanel() {
    beginPanelAnimation("connection");
    setConnectionPanelLayout((layout) => ({ ...layout, collapsed: false }));
  }

  function toggleAiPanel() {
    beginPanelAnimation("ai");
    setAiPanelLayout((layout) => ({ ...layout, collapsed: !layout.collapsed }));
  }

  function expandAiPanel() {
    beginPanelAnimation("ai");
    setAiPanelLayout((layout) => ({ ...layout, collapsed: false }));
  }

  function handleConnectionPanelResize(event: ReactPointerEvent<HTMLButtonElement>) {
    setAnimatingPanel(null);
    const startX = event.clientX;
    const startWidth = connectionPanelLayout.collapsed
      ? 0
      : connectionPanelLayout.width;

    beginDragResize(event, (pointerEvent) => {
      const nextWidth = clamp(
        startWidth + pointerEvent.clientX - startX,
        CONNECTION_PANEL_MIN_WIDTH,
        CONNECTION_PANEL_MAX_WIDTH,
      );
      setConnectionPanelLayout({
        collapsed: false,
        width: nextWidth,
      });
    });
  }

  function handleAiPanelResize(event: ReactPointerEvent<HTMLButtonElement>) {
    setAnimatingPanel(null);
    const startX = event.clientX;
    const startWidth = aiPanelLayout.collapsed ? 0 : aiPanelLayout.width;

    beginDragResize(event, (pointerEvent) => {
      const nextWidth = clamp(
        startWidth + startX - pointerEvent.clientX,
        AI_PANEL_MIN_WIDTH,
        AI_PANEL_MAX_WIDTH,
      );
      setAiPanelLayout({
        collapsed: false,
        width: nextWidth,
      });
    });
  }

  function resetWorkspaceChromeLayout() {
    removeLayoutStorageKeys();
    resetAllLayouts();
    setConnectionPanelLayout(defaultConnectionPanelLayout);
    setAiPanelLayout(defaultAiPanelLayout);
  }

  return {
    aiPanelLayout,
    aiPanelAnimating: animatingPanel === "ai",
    connectionPanelLayout,
    connectionPanelAnimating: animatingPanel === "connection",
    expandConnectionPanel,
    expandAiPanel,
    handleAiPanelResize,
    handleConnectionPanelResize,
    panelAnimating: animatingPanel !== null,
    resetWorkspaceChromeLayout,
    toggleAiPanel,
    toggleConnectionPanel,
  };
}

export function PanelResizeHandle({
  ariaLabel,
  collapsed,
  collapsedLabel,
  dataTutorialId,
  onClick,
  showCollapsedTab = true,
  side,
  onPointerDown,
}: {
  ariaLabel: string;
  collapsed?: boolean;
  collapsedLabel?: string;
  dataTutorialId?: string;
  onClick?: () => void;
  showCollapsedTab?: boolean;
  side: "left" | "right";
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const renderCollapsedTab = collapsed && showCollapsedTab;

  if (collapsed && !showCollapsedTab) {
    return (
      <div
        aria-hidden="true"
        className={`panel-resize-handle panel-resize-handle-${side} panel-resize-handle-collapsed panel-resize-handle-tabless`}
      />
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      className={`panel-resize-handle panel-resize-handle-${side} ${
        collapsed ? "panel-resize-handle-collapsed" : ""
      }`}
      data-tutorial-id={dataTutorialId}
      onClick={onClick}
      onPointerDown={collapsed ? undefined : onPointerDown}
      title={ariaLabel}
      type="button"
    >
      {renderCollapsedTab ? (
        <span className="panel-collapsed-tab">
          <span>{collapsedLabel}</span>
          {side === "left" ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </span>
      ) : null}
    </button>
  );
}
