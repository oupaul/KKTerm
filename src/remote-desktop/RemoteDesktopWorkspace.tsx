import { connectionIconForType, connectionSubtitle, connectionTypeLabel } from "../connections/utils";
import { ScreenshotMenu } from "../workspace/ScreenshotMenu";
import { documentHasWebviewOverlay } from "../workspace/nativeOverlay";
import { Monitor, RotateCcw } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import type { WorkspaceTab } from "../types";

type VncSessionEvent =
  | { kind: "connected"; sessionId: string; name: string }
  | { kind: "resolution"; sessionId: string; width: number; height: number }
  | {
      kind: "rawImage";
      sessionId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rgba: string;
    }
  | {
      kind: "copy";
      sessionId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      sourceX: number;
      sourceY: number;
    }
  | { kind: "bell"; sessionId: string }
  | { kind: "clipboardText"; sessionId: string; text: string }
  | { kind: "error"; sessionId: string; message: string }
  | { kind: "disconnected"; sessionId: string };

export function RemoteDesktopWorkspace({
  isActive,
  tab,
}: {
  isActive: boolean;
  tab: WorkspaceTab;
}) {
  const connection = tab.connection;
  const typeLabel = connection ? connectionTypeLabel(connection.type) : "Remote desktop";
  const Icon = connection ? connectionIconForType(connection.type) : Monitor;
  const workspaceRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionStartedRef = useRef(false);
  const sessionStartingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const displayReadyRef = useRef(false);
  const displaySyncInFlightRef = useRef(false);
  const rdpVisibleRef = useRef(false);
  const rdpControlRef = useRef("");
  const vncButtonMaskRef = useRef(0);
  const visibilityRef = useRef({ isActive, suppressed: false });
  const markConnectionSessionStarted = useWorkspaceStore(
    (state) => state.markConnectionSessionStarted,
  );
  const markConnectionSessionEnded = useWorkspaceStore((state) => state.markConnectionSessionEnded);
  const [suppressed, setSuppressed] = useState(false);
  const [rdpError, setRdpError] = useState("");
  const [rdpStatus, setRdpStatus] = useState("");
  const [rdpStartKey, setRdpStartKey] = useState(0);
  const [vncHasDisplay, setVncHasDisplay] = useState(false);
  const canStartRdp = connection?.type === "rdp";
  const canStartVnc = connection?.type === "vnc";

  const computeBounds = () => {
    const node = hostRef.current;
    if (!node) {
      return null;
    }
    const rect = node.getBoundingClientRect();
    return {
      x: Math.max(0, Math.round(rect.left)),
      y: Math.max(0, Math.round(rect.top)),
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
  };

  const boundsEqual = (
    first: { x: number; y: number; width: number; height: number },
    second: { x: number; y: number; width: number; height: number },
  ) =>
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height;

  const readSettledBounds = () =>
    new Promise<{ x: number; y: number; width: number; height: number } | null>((resolve) => {
      let previous = computeBounds();
      let stableFrames = 0;
      let attempts = 0;
      const tick = () => {
        const next = computeBounds();
        attempts += 1;
        if (!next) {
          if (attempts >= 8) {
            resolve(null);
            return;
          }
          window.requestAnimationFrame(tick);
          return;
        }
        if (previous && boundsEqual(previous, next)) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
        }
        previous = next;
        if (stableFrames >= 2 || attempts >= 10) {
          resolve(next);
          return;
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });

  const pushRdpVisibility = () => {
    const sessionId = sessionIdRef.current;
    if (!sessionStartedRef.current || !sessionId) {
      return;
    }
    const wantsVisible = visibilityRef.current.isActive && !visibilityRef.current.suppressed;
    const visible = wantsVisible && displayReadyRef.current;
    const bounds = wantsVisible ? computeBounds() : lastBoundsRef.current ?? computeBounds();
    if (!bounds) {
      return;
    }
    const previous = lastBoundsRef.current;
    const boundsChanged = !previous || !boundsEqual(previous, bounds);
    if (wantsVisible && displayReadyRef.current && boundsChanged) {
      displayReadyRef.current = false;
      rdpVisibleRef.current = false;
      setRdpStatus("Preparing display");
      void invokeCommand("set_rdp_visibility", {
        request: { sessionId, visible: false, ...(previous ?? bounds) },
      }).catch((error) => {
        setRdpError(error instanceof Error ? error.message : String(error));
      });
      attemptRdpDisplaySync();
      return;
    }
    void invokeCommand("set_rdp_visibility", {
      request: { sessionId, visible, ...bounds },
    })
      .then(() => {
        rdpVisibleRef.current = visible;
      })
      .catch((error) => {
        setRdpError(error instanceof Error ? error.message : String(error));
      });
    if (!visible) {
      if (wantsVisible) {
        attemptRdpDisplaySync();
      }
      return;
    }
    if (boundsChanged) {
      lastBoundsRef.current = bounds;
      void invokeCommand("update_rdp_bounds", {
        request: { sessionId, ...bounds },
      }).catch((error) => {
        setRdpError(error instanceof Error ? error.message : String(error));
      });
    }
  };

  const attemptRdpDisplaySync = () => {
    const sessionId = sessionIdRef.current;
    if (
      !sessionStartedRef.current ||
      !sessionId ||
      !visibilityRef.current.isActive ||
      visibilityRef.current.suppressed ||
      displayReadyRef.current ||
      displaySyncInFlightRef.current
    ) {
      return;
    }
    const bounds = computeBounds() ?? lastBoundsRef.current;
    if (!bounds) {
      return;
    }
    displaySyncInFlightRef.current = true;
    void invokeCommand("sync_rdp_display_size", {
      request: { sessionId, ...bounds },
    })
      .then((result) => {
        if (sessionIdRef.current !== result.sessionId) {
          return;
        }
        if (result.displaySynced) {
          displayReadyRef.current = true;
          lastBoundsRef.current = bounds;
          setRdpStatus("Connected");
          pushRdpVisibility();
        } else if (result.connected) {
          setRdpStatus("Preparing display");
        }
      })
      .catch((error) => {
        setRdpError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        displaySyncInFlightRef.current = false;
      });
  };

  const resetRdpSessionRefs = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    sessionStartedRef.current = false;
    sessionStartingRef.current = false;
    sessionIdRef.current = null;
    lastBoundsRef.current = null;
    displayReadyRef.current = false;
    displaySyncInFlightRef.current = false;
    rdpVisibleRef.current = false;
    rdpControlRef.current = "";
  };

  const resetVncSessionRefs = () => {
    sessionStartedRef.current = false;
    sessionStartingRef.current = false;
    sessionIdRef.current = null;
    vncButtonMaskRef.current = 0;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setVncHasDisplay(false);
  };

  const handleReconnect = () => {
    if ((!canStartRdp && !canStartVnc) || !connection || !isTauriRuntime()) {
      return;
    }
    const sessionId = sessionIdRef.current;
    const hadStartedSession = sessionStartedRef.current;
    const ownedSession = sessionStartingRef.current || sessionStartedRef.current;
    if (canStartVnc) {
      resetVncSessionRefs();
    } else {
      resetRdpSessionRefs();
    }
    setRdpError("");
    setRdpStatus("Reconnecting");
    if (ownedSession && sessionId) {
      void invokeCommand(canStartVnc ? "close_vnc_session" : "close_rdp_session", {
        request: { sessionId },
      });
    }
    if (hadStartedSession) {
      markConnectionSessionEnded(connection.id);
    }
    setRdpStartKey((key) => key + 1);
  };

  const scheduleBoundsPush = () => {
    if (!sessionStartedRef.current) {
      return;
    }
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        return;
      }
      if (!visibilityRef.current.isActive || visibilityRef.current.suppressed) {
        const bounds = lastBoundsRef.current ?? computeBounds();
        if (!bounds) {
          return;
        }
        void invokeCommand("set_rdp_visibility", {
          request: { sessionId, visible: false, ...bounds },
        })
          .then(() => {
            rdpVisibleRef.current = false;
          })
          .catch((error) => {
            setRdpError(error instanceof Error ? error.message : String(error));
          });
        return;
      }
      const bounds = computeBounds();
      if (!bounds) {
        return;
      }
      if (!displayReadyRef.current) {
        lastBoundsRef.current = bounds;
        attemptRdpDisplaySync();
        return;
      }
      const previous = lastBoundsRef.current;
      if (
        previous &&
        boundsEqual(previous, bounds)
      ) {
        return;
      }
      if (!rdpVisibleRef.current) {
        displayReadyRef.current = false;
        setRdpStatus("Preparing display");
        attemptRdpDisplaySync();
        return;
      }
      lastBoundsRef.current = bounds;
      void invokeCommand("update_rdp_bounds", {
        request: { sessionId, ...bounds },
      }).catch((error) => {
        setRdpError(error instanceof Error ? error.message : String(error));
      });
    });
  };

  useEffect(() => {
    if (!canStartRdp || !connection || !isTauriRuntime() || sessionStartedRef.current || sessionStartingRef.current) {
      return;
    }
    let disposed = false;
    let sessionId = "";
    void readSettledBounds().then((bounds) => {
      if (disposed || !bounds) {
        return;
      }
      sessionId = `rdp-${tab.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionIdRef.current = sessionId;
      sessionStartingRef.current = true;
      displayReadyRef.current = false;
      displaySyncInFlightRef.current = false;
      rdpVisibleRef.current = false;
      lastBoundsRef.current = bounds;
      rdpControlRef.current = "";
      setRdpStatus((current) => (current === "Reconnecting" ? current : "Connecting"));
      void invokeCommand("start_rdp_session", {
        request: {
          sessionId,
          host: connection.host,
          user: connection.user,
          port: connection.port,
          secretOwnerId: connection.id,
          ...bounds,
        },
      })
        .then((started) => {
          sessionStartingRef.current = false;
          if (disposed) {
            void invokeCommand("close_rdp_session", { request: { sessionId: started.sessionId } });
            return;
          }
          sessionStartedRef.current = true;
          rdpControlRef.current = started.control;
          setRdpStatus("Preparing display");
          markConnectionSessionStarted(connection.id);
          attemptRdpDisplaySync();
        })
        .catch((error) => {
          sessionStartingRef.current = false;
          sessionStartedRef.current = false;
          if (!disposed) {
            setRdpStatus("");
            setRdpError(error instanceof Error ? error.message : String(error));
          }
        });
    });

    return () => {
      disposed = true;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const ownsSession = sessionStartingRef.current || sessionStartedRef.current;
      sessionStartingRef.current = false;
      const started = sessionStartedRef.current;
      sessionStartedRef.current = false;
      displayReadyRef.current = false;
      displaySyncInFlightRef.current = false;
      rdpVisibleRef.current = false;
      if (sessionIdRef.current === sessionId) {
        sessionIdRef.current = null;
      }
      if (ownsSession) {
        void invokeCommand("close_rdp_session", { request: { sessionId } });
      }
      if (started) {
        markConnectionSessionEnded(connection.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdpStartKey]);

  useEffect(() => {
    if (!canStartVnc || !connection || !isTauriRuntime() || sessionStartedRef.current || sessionStartingRef.current) {
      return;
    }
    let disposed = false;
    const sessionId = `vnc-${tab.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionIdRef.current = sessionId;
    sessionStartingRef.current = true;
    setRdpStatus((current) => (current === "Reconnecting" ? current : "Connecting"));
    setRdpError("");

    void invokeCommand("start_vnc_session", {
      request: {
        sessionId,
        host: connection.host,
        port: connection.port,
        secretOwnerId: connection.id,
      },
    })
      .then((started) => {
        sessionStartingRef.current = false;
        if (disposed) {
          void invokeCommand("close_vnc_session", { request: { sessionId: started.sessionId } });
          return;
        }
        sessionStartedRef.current = true;
        setRdpStatus("Connected");
        markConnectionSessionStarted(connection.id);
      })
      .catch((error) => {
        sessionStartingRef.current = false;
        sessionStartedRef.current = false;
        if (!disposed) {
          setRdpStatus("");
          setRdpError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      disposed = true;
      const ownsSession = sessionStartingRef.current || sessionStartedRef.current;
      sessionStartingRef.current = false;
      const started = sessionStartedRef.current;
      sessionStartedRef.current = false;
      if (sessionIdRef.current === sessionId) {
        sessionIdRef.current = null;
      }
      if (ownsSession) {
        void invokeCommand("close_vnc_session", { request: { sessionId } });
      }
      if (started) {
        markConnectionSessionEnded(connection.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdpStartKey, canStartVnc]);

  useEffect(() => {
    visibilityRef.current = { isActive, suppressed };
  }, [isActive, suppressed]);

  useEffect(() => {
    if (!canStartRdp || !isTauriRuntime()) {
      return;
    }
    const node = hostRef.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(() => scheduleBoundsPush());
    observer.observe(node);
    window.addEventListener("resize", scheduleBoundsPush);
    window.addEventListener("scroll", scheduleBoundsPush, true);
    const repushOnNativeMove = () => {
      lastBoundsRef.current = null;
      scheduleBoundsPush();
    };
    const moveUnlisten = listen("tauri://move", repushOnNativeMove).catch(() => null);
    const resizeUnlisten = listen("tauri://resize", repushOnNativeMove).catch(() => null);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleBoundsPush);
      window.removeEventListener("scroll", scheduleBoundsPush, true);
      void moveUnlisten.then((dispose) => dispose?.());
      void resizeUnlisten.then((dispose) => dispose?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStartRdp]);

  useEffect(() => {
    if (!canStartRdp || !isTauriRuntime()) {
      return;
    }
    const updateSuppression = () => {
      setSuppressed(documentHasWebviewOverlay());
    };
    updateSuppression();
    const observer = new MutationObserver(updateSuppression);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
    };
  }, [canStartRdp]);

  useEffect(() => {
    if (!canStartRdp || !isTauriRuntime() || !sessionStartedRef.current) {
      return;
    }
    pushRdpVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStartRdp, isActive, suppressed]);

  useEffect(() => {
    if (!canStartRdp || !isTauriRuntime()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const sessionId = sessionIdRef.current;
      if (!sessionStartedRef.current || !sessionId) {
        return;
      }

      void invokeCommand("get_rdp_session_status", {
        request: { sessionId },
      })
        .then((status) => {
          if (!displayReadyRef.current) {
            attemptRdpDisplaySync();
          }
          if (!status.connected && sessionIdRef.current === status.sessionId) {
            displayReadyRef.current = false;
            rdpVisibleRef.current = false;
            setRdpStatus("Disconnected");
          }
        })
        .catch((error) => {
          setRdpError(error instanceof Error ? error.message : String(error));
        });
    }, displayReadyRef.current ? 1000 : 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canStartRdp]);

  useEffect(() => {
    if (!canStartVnc || !isTauriRuntime()) {
      return;
    }
    let disposed = false;
    let dispose: (() => void) | undefined;
    void listen<VncSessionEvent>("vnc-session-event", (event) => {
      if (disposed || event.payload.sessionId !== sessionIdRef.current) {
        return;
      }
      handleVncSessionEvent(event.payload);
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }
      dispose = unlisten;
    });
    return () => {
      disposed = true;
      dispose?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStartVnc]);

  useEffect(() => {
    if (!canStartVnc || !isTauriRuntime()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const sessionId = sessionIdRef.current;
      if (!sessionStartedRef.current || !sessionId) {
        return;
      }

      void invokeCommand("get_vnc_session_status", {
        request: { sessionId },
      })
        .then((status) => {
          if (!status.connected && sessionIdRef.current === status.sessionId) {
            setRdpStatus("Disconnected");
          }
        })
        .catch((error) => {
          setRdpError(error instanceof Error ? error.message : String(error));
        });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canStartVnc]);

  const handleVncSessionEvent = (event: VncSessionEvent) => {
    if (event.kind === "resolution") {
      resizeVncCanvas(event.width, event.height);
      setVncHasDisplay(true);
      setRdpStatus("Connected");
      return;
    }
    if (event.kind === "rawImage") {
      setVncHasDisplay(true);
      drawVncImage(event);
      return;
    }
    if (event.kind === "copy") {
      copyVncImage(event);
      return;
    }
    if (event.kind === "error") {
      setRdpError(event.message);
      setRdpStatus("Disconnected");
      return;
    }
    if (event.kind === "disconnected") {
      setRdpStatus("Disconnected");
    }
  };

  const resizeVncCanvas = (width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) {
      return;
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  const drawVncImage = (event: Extract<VncSessionEvent, { kind: "rawImage" }>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    if (canvas.width < event.x + event.width || canvas.height < event.y + event.height) {
      resizeVncCanvas(
        Math.max(canvas.width, event.x + event.width),
        Math.max(canvas.height, event.y + event.height),
      );
    }
    const imageData = new ImageData(
      new Uint8ClampedArray(decodeBase64Bytes(event.rgba)),
      event.width,
      event.height,
    );
    context.putImageData(imageData, event.x, event.y);
  };

  const copyVncImage = (event: Extract<VncSessionEvent, { kind: "copy" }>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || event.width <= 0 || event.height <= 0) {
      return;
    }
    const imageData = context.getImageData(event.sourceX, event.sourceY, event.width, event.height);
    context.putImageData(imageData, event.x, event.y);
  };

  const vncPointForEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: Math.max(0, Math.min(canvas.width - 1, Math.round((event.clientX - rect.left) * scaleX))),
      y: Math.max(0, Math.min(canvas.height - 1, Math.round((event.clientY - rect.top) * scaleY))),
    };
  };

  const sendVncPointer = (event: ReactPointerEvent<HTMLCanvasElement>, buttonMask?: number) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !sessionStartedRef.current) {
      return;
    }
    const point = vncPointForEvent(event);
    void invokeCommand("send_vnc_pointer_event", {
      request: {
        sessionId,
        x: point.x,
        y: point.y,
        buttonMask: buttonMask ?? vncButtonMaskRef.current,
      },
    }).catch((error) => {
      setRdpError(error instanceof Error ? error.message : String(error));
    });
  };

  const handleVncPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    vncButtonMaskRef.current = pointerButtonMask(event.button);
    sendVncPointer(event, vncButtonMaskRef.current);
  };

  const handleVncPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    vncButtonMaskRef.current = 0;
    sendVncPointer(event, 0);
  };

  const handleVncWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const pointerEvent = event as unknown as ReactPointerEvent<HTMLCanvasElement>;
    const wheelMask = event.deltaY < 0 ? 8 : 16;
    sendVncPointer(pointerEvent, wheelMask);
    window.setTimeout(() => sendVncPointer(pointerEvent, 0), 20);
  };

  const handleVncKey = (event: ReactKeyboardEvent<HTMLCanvasElement>, down: boolean) => {
    const key = vncKeysymForEvent(event);
    const sessionId = sessionIdRef.current;
    if (!sessionId || !key || !sessionStartedRef.current) {
      return;
    }
    event.preventDefault();
    void invokeCommand("send_vnc_key_event", {
      request: { sessionId, key, down },
    }).catch((error) => {
      setRdpError(error instanceof Error ? error.message : String(error));
    });
  };

  return (
    <section
      className={isActive ? "terminal-workspace active" : "terminal-workspace"}
      ref={workspaceRef}
    >
      <div className="workspace-toolbar">
        <div>
          <strong>{tab.title}</strong>
          <span>{tab.subtitle}</span>
        </div>
        <div className="toolbar-cluster">
          {rdpStatus ? <span className="webview-toolbar-status">{rdpStatus}</span> : null}
          {canStartRdp || canStartVnc ? (
            <button
              aria-label={`Reconnect ${typeLabel} session`}
              className="icon-button"
              disabled={!isTauriRuntime()}
              onClick={handleReconnect}
              title="Reconnect"
              type="button"
            >
              <RotateCcw size={13} />
            </button>
          ) : null}
          <ScreenshotMenu
            directClipboardCapture={connection?.type === "rdp"}
            targetLabel={`${tab.title} ${typeLabel} view`}
            targetRef={connection?.type === "rdp" || connection?.type === "vnc" ? hostRef : workspaceRef}
          />
        </div>
      </div>
      <div className="remote-desktop-workspace" ref={hostRef}>
        {connection?.type === "vnc" ? (
          <canvas
            aria-label={`${tab.title} VNC display`}
            className={vncHasDisplay ? "vnc-display ready" : "vnc-display"}
            onKeyDown={(event) => handleVncKey(event, true)}
            onKeyUp={(event) => handleVncKey(event, false)}
            onPointerDown={handleVncPointerDown}
            onPointerMove={sendVncPointer}
            onPointerUp={handleVncPointerUp}
            onWheel={handleVncWheel}
            ref={canvasRef}
            tabIndex={0}
          />
        ) : null}
        <div className="remote-desktop-placeholder">
          <Icon size={34} />
          <h2>{connection?.name ?? typeLabel}</h2>
          <p>{connection ? `${typeLabel} ${connectionSubtitle(connection)}` : typeLabel}</p>
          {connection?.type === "rdp" ? (
            !isTauriRuntime() ? (
              <small>RDP uses the Windows desktop runtime.</small>
            ) : rdpError ? (
              <small className="form-error">{rdpError}</small>
            ) : (
              <small>Microsoft RDP ActiveX host is running in this workspace.</small>
            )
          ) : connection?.type === "vnc" ? (
            !isTauriRuntime() ? (
              <small>VNC uses the desktop runtime.</small>
            ) : rdpError ? (
              <small className="form-error">{rdpError}</small>
            ) : (
              <small>VNC framebuffer is running in this workspace.</small>
            )
          ) : (
            <small>Remote desktop transport unavailable.</small>
          )}
        </div>
      </div>
    </section>
  );
}

function decodeBase64Bytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function pointerButtonMask(button: number) {
  if (button === 1) {
    return 2;
  }
  if (button === 2) {
    return 4;
  }
  return 1;
}

function vncKeysymForEvent(event: ReactKeyboardEvent<HTMLCanvasElement>) {
  if (event.key.length === 1) {
    return event.key.charCodeAt(0);
  }
  const specialKeys: Record<string, number> = {
    Backspace: 0xff08,
    Tab: 0xff09,
    Enter: 0xff0d,
    Escape: 0xff1b,
    Delete: 0xffff,
    Home: 0xff50,
    ArrowLeft: 0xff51,
    ArrowUp: 0xff52,
    ArrowRight: 0xff53,
    ArrowDown: 0xff54,
    PageUp: 0xff55,
    PageDown: 0xff56,
    End: 0xff57,
    Insert: 0xff63,
    Shift: 0xffe1,
    Control: 0xffe3,
    Alt: 0xffe9,
    Meta: 0xffe7,
  };
  return specialKeys[event.key] ?? 0;
}
