import { connectionIconForType, connectionSubtitle, connectionTypeLabel } from "../connections/utils";
import { ScreenshotMenu } from "../workspace/ScreenshotMenu";
import { documentHasWebviewOverlay } from "../workspace/nativeOverlay";
import { Monitor, RotateCcw } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";
import type { WorkspaceTab } from "../types";

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
  const sessionStartedRef = useRef(false);
  const sessionStartingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const displayReadyRef = useRef(false);
  const displaySyncInFlightRef = useRef(false);
  const rdpVisibleRef = useRef(false);
  const rdpControlRef = useRef("");
  const visibilityRef = useRef({ isActive, suppressed: false });
  const markConnectionSessionStarted = useWorkspaceStore(
    (state) => state.markConnectionSessionStarted,
  );
  const markConnectionSessionEnded = useWorkspaceStore((state) => state.markConnectionSessionEnded);
  const [suppressed, setSuppressed] = useState(false);
  const [rdpError, setRdpError] = useState("");
  const [rdpStatus, setRdpStatus] = useState("");
  const [rdpStartKey, setRdpStartKey] = useState(0);
  const canStartRdp = connection?.type === "rdp";

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

  const handleReconnect = () => {
    if (!canStartRdp || !connection || !isTauriRuntime()) {
      return;
    }
    const sessionId = sessionIdRef.current;
    const hadStartedSession = sessionStartedRef.current;
    const ownedSession = sessionStartingRef.current || sessionStartedRef.current;
    resetRdpSessionRefs();
    setRdpError("");
    setRdpStatus("Reconnecting");
    if (ownedSession && sessionId) {
      void invokeCommand("close_rdp_session", { request: { sessionId } });
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
          {canStartRdp ? (
            <button
              aria-label="Reconnect RDP session"
              className="icon-button"
              disabled={!isTauriRuntime()}
              onClick={handleReconnect}
              title="Reconnect"
              type="button"
            >
              <RotateCcw size={13} />
            </button>
          ) : null}
          <ScreenshotMenu targetLabel={`${tab.title} ${typeLabel} view`} targetRef={workspaceRef} />
        </div>
      </div>
      <div className="remote-desktop-workspace" ref={hostRef}>
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
          ) : (
            <small>VNC transport implementation pending for v0.2.</small>
          )}
        </div>
      </div>
    </section>
  );
}
