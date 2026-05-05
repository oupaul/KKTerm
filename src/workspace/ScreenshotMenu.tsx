import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { invokeCommand, isTauriRuntime, type CaptureScreenshotRequest } from "../lib/tauri";
import { useWorkspaceStore } from "../store";

type ScreenshotRect = CaptureScreenshotRequest;

type ScreenshotRegionState = {
  bounds: DOMRect;
  destination: "assistant" | "clipboard";
  pointerId?: number;
  start?: { x: number; y: number };
  current?: { x: number; y: number };
};

export function ScreenshotMenu({
  buttonClassName = "icon-button",
  targetRef,
  targetLabel = "Workspace surface",
}: {
  buttonClassName?: string;
  targetRef: RefObject<HTMLElement | null>;
  targetLabel?: string;
}) {
  const setAssistantContextSnippet = useWorkspaceStore(
    (state) => state.setAssistantContextSnippet,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [regionState, setRegionState] = useState<ScreenshotRegionState | null>(null);
  const [copiedStatus, setCopiedStatus] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  async function captureRect(rect: ScreenshotRect, destination: "assistant" | "clipboard") {
    if (!isTauriRuntime()) {
      window.alert("Screenshots require the Tauri desktop runtime.");
      return;
    }

    try {
      await waitForScreenshotSurface();
      if (destination === "assistant") {
        const screenshot = await invokeCommand("capture_screenshot_for_assistant", {
          request: rect,
        });
        setAssistantContextSnippet({
          id: `screenshot-${Date.now()}`,
          kind: "screenshot",
          sourceLabel: `${targetLabel} screenshot`,
          imageDataUrl: screenshot.dataUrl,
          width: screenshot.width,
          height: screenshot.height,
          capturedAt: new Date().toISOString(),
        });
        setCopiedStatus("Sent to AI");
      } else {
        await invokeCommand("capture_screenshot_to_clipboard", { request: rect });
        setCopiedStatus("Copied");
      }
      window.setTimeout(() => setCopiedStatus(""), 1600);
    } catch (error) {
      window.alert(
        `Could not capture screenshot: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  function targetBounds() {
    const target = targetRef.current;
    if (!target) {
      return null;
    }
    const bounds = target.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }
    return bounds;
  }

  function handleEntirePanel(destination: "assistant" | "clipboard") {
    setMenuOpen(false);
    const bounds = targetBounds();
    if (!bounds) {
      return;
    }
    void captureRect(rectFromBounds(bounds), destination);
  }

  function handleRegion(destination: "assistant" | "clipboard") {
    setMenuOpen(false);
    const bounds = targetBounds();
    if (!bounds) {
      return;
    }
    setRegionState({ bounds, destination });
  }

  function handleRegionPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!regionState || !pointInBounds(event.clientX, event.clientY, regionState.bounds)) {
      return;
    }
    const point = clampPointToBounds(event.clientX, event.clientY, regionState.bounds);
    event.currentTarget.setPointerCapture(event.pointerId);
    setRegionState({
      ...regionState,
      pointerId: event.pointerId,
      start: point,
      current: point,
    });
  }

  function handleRegionPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!regionState?.start || regionState.pointerId !== event.pointerId) {
      return;
    }
    setRegionState({
      ...regionState,
      current: clampPointToBounds(event.clientX, event.clientY, regionState.bounds),
    });
  }

  function handleRegionPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!regionState?.start || regionState.pointerId !== event.pointerId) {
      return;
    }
    const current = clampPointToBounds(event.clientX, event.clientY, regionState.bounds);
    const rect = rectFromPoints(regionState.start, current);
    setRegionState(null);

    if (rect.width < 4 || rect.height < 4) {
      return;
    }
    void captureRect(rect, regionState.destination);
  }

  function handleRegionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setRegionState(null);
    }
  }

  const selectionRect =
    regionState?.start && regionState.current
      ? rectFromPoints(regionState.start, regionState.current)
      : null;

  return (
    <>
      <div className="terminal-menu-wrapper screenshot-menu-wrapper" ref={menuRef}>
        <button
          aria-label="Take screenshot"
          aria-haspopup="menu"
          aria-expanded={menuOpen ? "true" : "false"}
          className={buttonClassName}
          onClick={() => setMenuOpen((open) => !open)}
          title={copiedStatus || "Take screenshot"}
          type="button"
        >
          <Camera size={13} />
        </button>
        {menuOpen ? (
          <div className="terminal-menu screenshot-menu" role="menu">
            <button
              className="terminal-menu-item"
              onClick={() => handleRegion("clipboard")}
              role="menuitem"
              type="button"
            >
              Copy Region
            </button>
            <button
              className="terminal-menu-item"
              onClick={() => handleEntirePanel("clipboard")}
              role="menuitem"
              type="button"
            >
              Copy Entire Window/Panel
            </button>
            <button
              className="terminal-menu-item"
              onClick={() => handleRegion("assistant")}
              role="menuitem"
              type="button"
            >
              Send Region to AI Assistant
            </button>
            <button
              className="terminal-menu-item"
              onClick={() => handleEntirePanel("assistant")}
              role="menuitem"
              type="button"
            >
              Send Entire Window/Panel to AI Assistant
            </button>
          </div>
        ) : null}
      </div>
      {regionState ? (
        <div
          aria-label="Select screenshot region"
          className="screenshot-region-overlay"
          onKeyDown={handleRegionKeyDown}
          onPointerDown={handleRegionPointerDown}
          onPointerMove={handleRegionPointerMove}
          onPointerUp={handleRegionPointerUp}
          role="application"
          tabIndex={-1}
        >
          <div
            className="screenshot-region-target"
            style={{
              height: regionState.bounds.height,
              left: regionState.bounds.left,
              top: regionState.bounds.top,
              width: regionState.bounds.width,
            }}
          />
          {selectionRect ? (
            <div
              className="screenshot-region-selection"
              style={{
                height: selectionRect.height,
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
              }}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function rectFromBounds(bounds: DOMRect): ScreenshotRect {
  return {
    x: Math.max(0, Math.round(bounds.left)),
    y: Math.max(0, Math.round(bounds.top)),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  };
}

function rectFromPoints(
  start: { x: number; y: number },
  current: { x: number; y: number },
): ScreenshotRect {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    width: Math.max(1, Math.round(Math.abs(current.x - start.x))),
    height: Math.max(1, Math.round(Math.abs(current.y - start.y))),
  };
}

function pointInBounds(x: number, y: number, bounds: DOMRect) {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

function clampPointToBounds(x: number, y: number, bounds: DOMRect) {
  return {
    x: Math.min(Math.max(x, bounds.left), bounds.right),
    y: Math.min(Math.max(y, bounds.top), bounds.bottom),
  };
}

async function waitForScreenshotSurface() {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.setTimeout(resolve, 90));
}
