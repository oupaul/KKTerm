import { ScreenshotMenu } from "../../ScreenshotMenu";
import { documentHasWebviewBlockingOverlay } from "../../nativeOverlay";

import { ArrowLeft, ArrowRight, Bot, ExternalLink, Globe2, KeyRound, Lock, RefreshCw, Save, X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FormEvent } from "react";
import { resolveAppliedColorScheme } from "../../../../app/appShellEffects";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import { invokeCommand, isTauriRuntime, logUrlConnectionDebug, openExternalUrl } from "../../../../lib/tauri";
import type { AssistantScreenshot, WebviewSessionStarted } from "../../../../lib/tauri";
import { useWorkspaceStore } from "../../../../store";
import { urlCredentialSecretOwnerId } from "./urlCredentialKeys";
import { resolveUrlDataPartition, resolveUrlProxy } from "./urlProxy";
import type { WorkspaceTab } from "../../../../types";

type WebviewNavigationEvent = {
  sessionId: string;
  url: string;
};

type WebviewPageLoadEvent = {
  sessionId: string;
  url: string;
  status: "started" | "finished" | "unknown";
};

type WebviewTitleChangedEvent = {
  sessionId: string;
  title: string;
};

type WebviewNewWindowEvent = {
  sessionId: string;
  url: string;
};

type WebviewDownloadEvent = {
  sessionId: string;
  url: string;
  status: "requested" | "finished" | "unknown";
  path?: string;
  success?: boolean;
};

interface WebviewSessionLease {
  promise: Promise<WebviewSessionStarted>;
  refCount: number;
  closeTimer: number | null;
  started: boolean;
  closed: boolean;
}

const webviewSessionLeases = new Map<string, WebviewSessionLease>();
const HIDDEN_WEBVIEW_BOUNDS = { x: 0, y: 0, width: 1, height: 1 };
// The overlay's native window handle is realized asynchronously by the event loop, so the
// very first show after a session starts can race ahead of it and fail with "the underlying
// handle is not available". Retrying the show across a few short delays lets the loop catch up.
const WEBVIEW_HANDLE_NOT_READY_PATTERN = /handle is not available|webview hwnd|failed to realize/i;
const WEBVIEW_SHOW_RETRY_DELAYS_MS = [80, 160, 320, 640, 1000];

function acquireWebviewSession(sessionId: string, start: () => Promise<WebviewSessionStarted>) {
  const current = webviewSessionLeases.get(sessionId);
  if (current && !current.closed) {
    if (current.closeTimer !== null) {
      window.clearTimeout(current.closeTimer);
      current.closeTimer = null;
    }
    current.refCount += 1;
    return current;
  }

  const promise = Promise.resolve()
    .then(start)
    .then((started) => {
      lease.started = true;
      return started;
    });
  const lease: WebviewSessionLease = {
    promise,
    refCount: 1,
    closeTimer: null,
    started: false,
    closed: false,
  };
  promise.catch(() => {
    if (webviewSessionLeases.get(sessionId) === lease) {
      webviewSessionLeases.delete(sessionId);
    }
  });
  webviewSessionLeases.set(sessionId, lease);
  return lease;
}

function releaseLogPayload(sessionId: string, lease?: WebviewSessionLease) {
  return {
    sessionId,
    lease: lease
      ? {
          refCount: lease.refCount,
          started: lease.started,
          closed: lease.closed,
          closeTimerPending: lease.closeTimer !== null,
        }
      : null,
  };
}

function releaseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function releaseWebviewSession(sessionId: string) {
  const lease = webviewSessionLeases.get(sessionId);
  if (!lease) {
    logUrlConnectionDebug("frontend.session.release.missing", releaseLogPayload(sessionId));
    return;
  }
  logUrlConnectionDebug("frontend.session.release.requested", releaseLogPayload(sessionId, lease));
  lease.refCount = Math.max(0, lease.refCount - 1);
  if (lease.refCount > 0) {
    logUrlConnectionDebug("frontend.session.release.deferred", releaseLogPayload(sessionId, lease));
    return;
  }
  if (lease.closeTimer !== null) {
    window.clearTimeout(lease.closeTimer);
  }
  lease.closeTimer = window.setTimeout(() => {
    if (lease.refCount > 0 || webviewSessionLeases.get(sessionId) !== lease) {
      logUrlConnectionDebug("frontend.session.release.cancelled", releaseLogPayload(sessionId, lease));
      return;
    }
    lease.closed = true;
    void lease.promise
      .then(
        () => {
          logUrlConnectionDebug("frontend.session.release.close_request", releaseLogPayload(sessionId, lease));
          return invokeCommand("close_webview_session", {
            request: { sessionId },
          })
            .then(() => {
              logUrlConnectionDebug("frontend.session.release.closed", releaseLogPayload(sessionId, lease));
            })
            .catch((error) => {
              logUrlConnectionDebug("frontend.session.release.close_error", {
                ...releaseLogPayload(sessionId, lease),
                error: releaseErrorMessage(error),
              });
            });
        },
        (error) => {
          logUrlConnectionDebug("frontend.session.release.start_failed", {
            ...releaseLogPayload(sessionId, lease),
            error: releaseErrorMessage(error),
          });
        },
      )
      .finally(() => {
        if (webviewSessionLeases.get(sessionId) === lease) {
          webviewSessionLeases.delete(sessionId);
          logUrlConnectionDebug("frontend.session.release.removed", releaseLogPayload(sessionId, lease));
        }
      });
  }, 50);
}

type CapturedCredentialPayload = {
  ok: boolean;
  nonce?: string;
  reason?: string;
  url?: string;
  username?: string;
  password?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  fieldValues?: unknown;
};

const CREDENTIAL_TITLE_PREFIX = "__KKTERM_URL_CREDENTIAL__";
const EXTERNAL_LINK_TITLE_PREFIX = "__KKTERM_URL_EXTERNAL_LINK__";
const AUTO_REFRESH_INTERVALS_SECONDS = [0, 5, 15, 30, 60, 120] as const;
const WEBVIEW_PRE_CAPTURE_INTERVAL_MS = 1200;
// A speculative pre-capture is only a faithful stand-in for the live surface for a short
// window. Beyond this, fall back to capturing on-open so an unrelated overlay (e.g. a
// connection dialog) never parks the WebView behind a stale frame from an idle hover.
const WEBVIEW_PRE_CAPTURE_MAX_AGE_MS = 1500;
type AutoRefreshIntervalSeconds = (typeof AUTO_REFRESH_INTERVALS_SECONDS)[number];

function createCredentialCaptureNonce() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createWebviewSessionId() {
  return `webview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function webviewBoundsClipElement(node: HTMLElement) {
  return node.closest(".dashboard-connection-pane, .embedded-workspace-pane, .workspace-canvas");
}

type VisibleClientRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type WebviewBoundsDebugSnapshot = {
  placeholderRect: Record<string, number> | null;
  clipRect: Record<string, number> | null;
  visibleRect: Record<string, number> | null;
  bounds: { x: number; y: number; width: number; height: number } | null;
};

function intersectClientRects(rect: DOMRectReadOnly, clipRect: DOMRectReadOnly): VisibleClientRect | null {
  const left = Math.max(rect.left, clipRect.left);
  const top = Math.max(rect.top, clipRect.top);
  const right = Math.min(rect.right, clipRect.right);
  const bottom = Math.min(rect.bottom, clipRect.bottom);
  if (right <= left || bottom <= top) {
    return null;
  }
  return {
    left,
    top,
    right,
    bottom,
  };
}

function boundsFromVisibleRect(rect: VisibleClientRect) {
  const x = Math.max(0, Math.floor(rect.left));
  const y = Math.max(0, Math.floor(rect.top));
  const right = Math.max(x + 1, Math.ceil(rect.right));
  const bottom = Math.max(y + 1, Math.ceil(rect.bottom));
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

function rectDebugSnapshot(rect: DOMRectReadOnly | VisibleClientRect | null): Record<string, number> | null {
  if (!rect) {
    return null;
  }
  const right = rect.right;
  const bottom = rect.bottom;
  return {
    left: rect.left,
    top: rect.top,
    right,
    bottom,
    width: "width" in rect ? rect.width : right - rect.left,
    height: "height" in rect ? rect.height : bottom - rect.top,
  };
}

export function WebViewWorkspace({
  isActive,
  onClose,
  onOpenAssistant = () => undefined,
  tab,
}: {
  isActive: boolean;
  onClose?: () => void;
  onOpenAssistant?: () => void;
  tab: WorkspaceTab;
}) {
  const { t } = useTranslation();
  const appearanceSettings = useWorkspaceStore((state) => state.appearanceSettings);
  const updateWebviewTabMetadata = useWorkspaceStore((state) => state.updateWebviewTabMetadata);
  const openUrlInNewTab = useWorkspaceStore((state) => state.openUrlInNewTab);
  const refreshOpenConnectionMetadata = useWorkspaceStore((state) => state.refreshOpenConnectionMetadata);
  const markConnectionSessionStarted = useWorkspaceStore((state) => state.markConnectionSessionStarted);
  const markConnectionSessionEnded = useWorkspaceStore((state) => state.markConnectionSessionEnded);
  const urlSettings = useWorkspaceStore((state) => state.urlSettings);
  const ignoreCertificateErrors = urlSettings.ignoreCertificateErrors;
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const setAssistantContextSnippet = useWorkspaceStore((state) => state.setAssistantContextSnippet);
  const submitAssistantContextSnippet = useWorkspaceStore((state) => state.submitAssistantContextSnippet);
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const sessionStartedRef = useRef(false);
  const sessionStartingRef = useRef(false);
  const sessionIdRef = useRef<string>(createWebviewSessionId());
  const lastBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const lastBoundsDebugRef = useRef<WebviewBoundsDebugSnapshot | null>(null);
  const rafRef = useRef<number | null>(null);
  const suppressionCaptureInFlightRef = useRef(false);
  const preCaptureInFlightRef = useRef(false);
  const preCachedSnapshotRef = useRef<AssistantScreenshot | null>(null);
  const preCachedAtRef = useRef(0);
  const preCaptureLastRef = useRef(0);
  const visibilityRef = useRef({ isActive, suppressed: false });
  const pendingCaptureNonceRef = useRef<string | null>(null);
  const externalLinkTokenRef = useRef<string | null>(null);
  const faviconUpdatedRef = useRef(false);
  const connectionSessionCountedRef = useRef(false);
  const credentialRef = useRef({ canFillCredential: false });
  const [navError, setNavError] = useState("");
  const [fillStatus, setFillStatus] = useState("");
  const [addressInput, setAddressInput] = useState(tab.url ?? "");
  const [webviewReady, setWebviewReady] = useState(false);
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState<AutoRefreshIntervalSeconds>(0);

  const initialUrl = tab.url ?? "";
  const [hasSavedCredential, setHasSavedCredential] = useState(Boolean(tab.connection?.hasUrlCredential));
  const [webviewSnapshot, setWebviewSnapshot] = useState<AssistantScreenshot | null>(null);
  const canFillCredential = Boolean(hasSavedCredential);

  const markWebviewConnectionStarted = () => {
    if (!tab.connection || connectionSessionCountedRef.current) {
      return;
    }
    connectionSessionCountedRef.current = true;
    markConnectionSessionStarted(tab.connection.id);
  };

  const markWebviewConnectionEnded = () => {
    if (!tab.connection || !connectionSessionCountedRef.current) {
      return;
    }
    connectionSessionCountedRef.current = false;
    markConnectionSessionEnded(tab.connection.id);
  };

  useEffect(() => {
    credentialRef.current = {
      canFillCredential,
    };
  }, [canFillCredential]);

  const computeBounds = () => {
    const node = placeholderRef.current;
    if (!node) {
      lastBoundsDebugRef.current = {
        placeholderRect: null,
        clipRect: null,
        visibleRect: null,
        bounds: null,
      };
      return null;
    }
    const rect = node.getBoundingClientRect();
    const clipRect = webviewBoundsClipElement(node)?.getBoundingClientRect();
    const visibleRect = clipRect ? intersectClientRects(rect, clipRect) : rect;
    if (!visibleRect) {
      lastBoundsDebugRef.current = {
        placeholderRect: rectDebugSnapshot(rect),
        clipRect: rectDebugSnapshot(clipRect ?? null),
        visibleRect: null,
        bounds: null,
      };
      return null;
    }
    const bounds = boundsFromVisibleRect(visibleRect);
    lastBoundsDebugRef.current = {
      placeholderRect: rectDebugSnapshot(rect),
      clipRect: rectDebugSnapshot(clipRect ?? null),
      visibleRect: rectDebugSnapshot(visibleRect),
      bounds,
    };
    return bounds;
  };

  const logWebviewBoundsDebug = (event: string, payload: Record<string, unknown> = {}) => {
    logUrlConnectionDebug(event, {
      sessionId: sessionIdRef.current,
      tabId: tab.id,
      connectionId: tab.connection?.id ?? null,
      connectionName: tab.connection?.name ?? null,
      url: urlDebugSnapshot(addressInput || initialUrl),
      isActive: visibilityRef.current.isActive,
      suppressed: visibilityRef.current.suppressed,
      devicePixelRatio: window.devicePixelRatio,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      boundsDebug: lastBoundsDebugRef.current,
      ...payload,
    });
  };

  const requestWebviewVisibility = (
    request: { sessionId: string; visible: boolean; x: number; y: number; width: number; height: number },
    attempt = 0,
  ): Promise<void | null> =>
    invokeCommand("set_webview_visibility", { request }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      const stillWantsVisible = visibilityRef.current.isActive && !visibilityRef.current.suppressed;
      const shouldRetry =
        request.visible &&
        stillWantsVisible &&
        sessionStartedRef.current &&
        attempt < WEBVIEW_SHOW_RETRY_DELAYS_MS.length &&
        WEBVIEW_HANDLE_NOT_READY_PATTERN.test(message);
      if (!shouldRetry) {
        throw error instanceof Error ? error : new Error(message);
      }
      return new Promise<void | null>((resolve, reject) => {
        window.setTimeout(() => {
          requestWebviewVisibility(request, attempt + 1).then(resolve, reject);
        }, WEBVIEW_SHOW_RETRY_DELAYS_MS[attempt]);
      });
    });

  const pushWebviewVisibility = () => {
    if (!sessionStartedRef.current) {
      return;
    }
    const bounds = computeBounds();
    const visible = visibilityRef.current.isActive && !visibilityRef.current.suppressed;
    if (!bounds && visible) {
      logWebviewBoundsDebug("frontend.visibility.skipped_missing_bounds", { visible });
      return;
    }
    logWebviewBoundsDebug("frontend.visibility.request", {
      visible,
      requestBounds: bounds ?? HIDDEN_WEBVIEW_BOUNDS,
    });
    const visibilityUpdate = requestWebviewVisibility({
      sessionId: sessionIdRef.current,
      visible,
      ...(bounds ?? HIDDEN_WEBVIEW_BOUNDS),
    });
    void visibilityUpdate.catch((error) => {
      setNavError(error instanceof Error ? error.message : String(error));
    });
    if (visible && bounds) {
      lastBoundsRef.current = bounds;
    }
  };

  const captureVisibleWebviewSnapshot = async () => {
    if (!isTauriRuntime() || !sessionStartedRef.current || !visibilityRef.current.isActive) {
      return null;
    }
    const bounds = computeBounds();
    if (!bounds) {
      return null;
    }
    return invokeCommand("capture_screenshot_for_assistant", {
      request: bounds,
    });
  };

  const suppressWebviewWithSnapshot = (snapshot: AssistantScreenshot | null) => {
    setWebviewSnapshot(snapshot);
    visibilityRef.current = { ...visibilityRef.current, suppressed: true };
    window.requestAnimationFrame(() => pushWebviewVisibility());
  };

  const triggerPreCapture = () => {
    if (
      !isActive ||
      !isTauriRuntime() ||
      !sessionStartedRef.current ||
      visibilityRef.current.suppressed
    ) {
      return;
    }
    const now = Date.now();
    if (preCaptureInFlightRef.current || now - preCaptureLastRef.current < WEBVIEW_PRE_CAPTURE_INTERVAL_MS) {
      return;
    }
    preCaptureLastRef.current = now;
    preCaptureInFlightRef.current = true;
    void captureVisibleWebviewSnapshot()
      .then((snapshot) => {
        if (snapshot) {
          preCachedSnapshotRef.current = snapshot;
          preCachedAtRef.current = Date.now();
        }
      })
      .catch(() => {
        // Speculative pre-capture can miss; the overlay path still falls back to capture-on-open.
      })
      .finally(() => {
        preCaptureInFlightRef.current = false;
      });
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
      const bounds = computeBounds();
      if (!visibilityRef.current.isActive || visibilityRef.current.suppressed) {
        logWebviewBoundsDebug("frontend.visibility.request", {
          visible: false,
          reason: visibilityRef.current.isActive ? "suppressed" : "inactive",
          requestBounds: bounds ?? HIDDEN_WEBVIEW_BOUNDS,
        });
        void invokeCommand("set_webview_visibility", {
          request: { sessionId: sessionIdRef.current, visible: false, ...(bounds ?? HIDDEN_WEBVIEW_BOUNDS) },
        }).catch((error) => {
          setNavError(error instanceof Error ? error.message : String(error));
        });
        return;
      }
      if (!bounds) {
        logWebviewBoundsDebug("frontend.bounds.update.skipped_missing_bounds");
        return;
      }
      const previous = lastBoundsRef.current;
      if (
        previous &&
        previous.x === bounds.x &&
        previous.y === bounds.y &&
        previous.width === bounds.width &&
        previous.height === bounds.height
      ) {
        logWebviewBoundsDebug("frontend.bounds.update.skipped_unchanged", {
          requestBounds: bounds,
        });
        return;
      }
      lastBoundsRef.current = bounds;
      logWebviewBoundsDebug("frontend.bounds.update.request", {
        previousBounds: previous,
        requestBounds: bounds,
      });
      void invokeCommand("update_webview_bounds", {
        request: { sessionId: sessionIdRef.current, ...bounds },
      }).catch((error) => {
        setNavError(error instanceof Error ? error.message : String(error));
      });
    });
  };

  useEffect(() => {
    if (!isTauriRuntime() || sessionStartedRef.current || sessionStartingRef.current || !initialUrl) {
      return;
    }
    const bounds = computeBounds();
    if (!bounds) {
      logWebviewBoundsDebug("frontend.start.skipped_missing_bounds");
      return;
    }
    let disposed = false;
    const sessionId = sessionIdRef.current;
    const urlConnectionOptions = {
      ...tab.connection,
      dataPartition: tab.dataPartition ?? tab.connection?.dataPartition,
      urlProxyInheritDefaults: tab.connection
        ? tab.connection.urlProxyInheritDefaults
        : tab.dataPartition
          ? false
          : undefined,
    };
    const proxyUrl = resolveUrlProxy(urlConnectionOptions, generalSettings);
    const dataPartition = resolveUrlDataPartition(urlConnectionOptions, urlSettings);
    sessionStartingRef.current = true;
    lastBoundsRef.current = bounds;
    markWebviewConnectionStarted();
    logWebviewBoundsDebug("frontend.start.request", {
      requestBounds: bounds,
      dataPartition,
      ignoreCertificateErrors,
      proxyUrl,
    });
    const lease = acquireWebviewSession(sessionId, () =>
      invokeCommand("start_webview_session", {
        request: {
          sessionId,
          url: initialUrl,
          dataPartition,
          proxyUrl,
          ignoreCertificateErrors,
          ...bounds,
        },
      }),
    );
    lease.promise
      .then((started) => {
        sessionStartingRef.current = false;
        if (disposed) {
          return;
        }
        externalLinkTokenRef.current = started.externalLinkToken;
        sessionStartedRef.current = true;
        setWebviewReady(true);
        pushWebviewVisibility();
      })
      .catch((error) => {
        sessionStartingRef.current = false;
        sessionStartedRef.current = false;
        if (!disposed) {
          markWebviewConnectionEnded();
          setNavError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      disposed = true;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const ownsSession = sessionStartingRef.current || sessionStartedRef.current;
      sessionStartingRef.current = false;
      sessionStartedRef.current = false;
      setWebviewReady(false);
      if (ownsSession) {
        releaseWebviewSession(sessionId);
      }
      markWebviewConnectionEnded();
      if (tab.sshPortForwardSessionId) {
        void invokeCommand("close_ssh_port_forward", {
          request: { forwardId: tab.sshPortForwardSessionId },
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauriRuntime() || !webviewReady || autoRefreshSeconds === 0) {
      return;
    }
    const intervalId = window.setInterval(() => {
      if (!sessionStartedRef.current) {
        return;
      }
      void invokeCommand("webview_reload", {
        request: { sessionId: sessionIdRef.current },
      }).catch((error) => {
        setNavError(error instanceof Error ? error.message : String(error));
      });
    }, autoRefreshSeconds * 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefreshSeconds, webviewReady]);

  useEffect(() => {
    visibilityRef.current = { ...visibilityRef.current, isActive };
  }, [isActive]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    const node = placeholderRef.current;
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
  }, []);

  useEffect(() => {
    if (!isTauriRuntime() || !sessionStartedRef.current) {
      return;
    }
    pushWebviewVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    const updateSuppression = () => {
      const suppressed = documentHasWebviewBlockingOverlay(placeholderRef.current);
      if (!suppressed) {
        suppressionCaptureInFlightRef.current = false;
        if (visibilityRef.current.suppressed) {
          visibilityRef.current = { ...visibilityRef.current, suppressed: false };
          setWebviewSnapshot(null);
          pushWebviewVisibility();
        }
        return;
      }
      if (visibilityRef.current.suppressed || suppressionCaptureInFlightRef.current) {
        return;
      }
      const cached = preCachedSnapshotRef.current;
      if (cached) {
        preCachedSnapshotRef.current = null;
        const fresh = Date.now() - preCachedAtRef.current < WEBVIEW_PRE_CAPTURE_MAX_AGE_MS;
        if (fresh && documentHasWebviewBlockingOverlay(placeholderRef.current)) {
          suppressWebviewWithSnapshot(cached);
          return;
        }
        // Stale cache: fall through to capture the live surface on-open.
      }
      suppressionCaptureInFlightRef.current = true;
      void captureVisibleWebviewSnapshot()
        .then((snapshot) => {
          if (!documentHasWebviewBlockingOverlay(placeholderRef.current)) {
            visibilityRef.current = { ...visibilityRef.current, suppressed: false };
            setWebviewSnapshot(null);
            pushWebviewVisibility();
            return;
          }
          suppressWebviewWithSnapshot(snapshot);
        })
        .catch(() => {
          if (documentHasWebviewBlockingOverlay(placeholderRef.current)) {
            suppressWebviewWithSnapshot(null);
          }
        })
        .finally(() => {
          suppressionCaptureInFlightRef.current = false;
        });
    };
    updateSuppression();
    const observer = new MutationObserver(updateSuppression);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", updateSuppression);
    window.addEventListener("scroll", updateSuppression, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSuppression);
      window.removeEventListener("scroll", updateSuppression, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    const disposers: Array<() => void> = [];
    void Promise.all([
      listen<WebviewNavigationEvent>("webview-navigation", (event) => {
        if (event.payload.sessionId !== sessionIdRef.current) {
          return;
        }
        setAddressInput(event.payload.url);
        updateWebviewTabMetadata(tab.id, {
          subtitle: formatWebviewSubtitle(event.payload.url),
          url: event.payload.url,
        });
      }),
      listen<WebviewPageLoadEvent>("webview-page-load", (event) => {
        if (event.payload.sessionId !== sessionIdRef.current) {
          return;
        }
        setAddressInput(event.payload.url);
        if (event.payload.status === "finished") {
          setFillStatus("");
          void maybeUpdateConnectionIcon(event.payload.url);
          void fillCredential({ automatic: true, showStatus: false });
        }
      }),
      listen<WebviewNewWindowEvent>("webview-new-window", (event) => {
        if (event.payload.sessionId !== sessionIdRef.current) {
          return;
        }
        if (tab.connection) {
          openUrlInNewTab(tab.connection, event.payload.url, {
            subtitle: formatWebviewSubtitle(event.payload.url),
          });
          return;
        }
        void openExternalUrl(event.payload.url).catch((error) => {
          setNavError(error instanceof Error ? error.message : String(error));
        });
      }),
      listen<WebviewTitleChangedEvent>("webview-title-changed", (event) => {
        if (event.payload.sessionId !== sessionIdRef.current) {
          return;
        }
        const title = event.payload.title.trim();
        if (title.startsWith(CREDENTIAL_TITLE_PREFIX)) {
          void handleCapturedCredential(title.slice(CREDENTIAL_TITLE_PREFIX.length));
          return;
        }
        if (title.startsWith(EXTERNAL_LINK_TITLE_PREFIX)) {
          const externalUrl = externalWebviewLinkUrl(
            title.slice(EXTERNAL_LINK_TITLE_PREFIX.length),
            externalLinkTokenRef.current,
          );
          if (externalUrl) {
            void openExternalUrl(externalUrl).catch((error) => {
              setNavError(error instanceof Error ? error.message : String(error));
            });
          }
          return;
        }
        if (title) {
          updateWebviewTabMetadata(tab.id, { title });
        }
      }),
      listen<WebviewDownloadEvent>("webview-download", (event) => {
        if (event.payload.sessionId !== sessionIdRef.current) {
          return;
        }
        if (event.payload.status === "requested") {
          setFillStatus(t("webview.downloadStarted"));
          return;
        }
        if (event.payload.status === "finished") {
          setFillStatus(event.payload.success ? t("webview.downloadComplete") : t("webview.downloadFailed"));
        }
      }),
    ]).then((unlistenFns) => {
      if (disposed) {
        unlistenFns.forEach((unlisten) => unlisten());
        return;
      }
      disposers.push(...unlistenFns);
    });

    return () => {
      disposed = true;
      disposers.forEach((dispose) => dispose());
    };
    // Re-subscribe only on the listed inputs; the credential/icon handlers are recreated each render and read at event time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUrlInNewTab, refreshOpenConnectionMetadata, tab.connection, tab.id, t, updateWebviewTabMetadata]);

  function handleNavigate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isTauriRuntime() || !sessionStartedRef.current) {
      return;
    }
    setNavError("");
    void invokeCommand("webview_navigate", {
      request: { sessionId: sessionIdRef.current, url: addressInput },
    }).catch((error) => {
      setNavError(error instanceof Error ? error.message : String(error));
    });
  }

  function handleSimple(name: "webview_reload" | "webview_go_back" | "webview_go_forward") {
    if (!isTauriRuntime() || !sessionStartedRef.current) {
      return;
    }
    void invokeCommand(name, {
      request: { sessionId: sessionIdRef.current },
    }).catch((error) => {
      setNavError(error instanceof Error ? error.message : String(error));
    });
  }

  function maybeUpdateConnectionIcon(pageUrl: string) {
    if (!tab.connection || tab.connection.type !== "url" || tab.connection.iconDataUrl || faviconUpdatedRef.current) {
      return;
    }
    faviconUpdatedRef.current = true;
    void invokeCommand("update_url_connection_icon_from_page", {
      connectionId: tab.connection.id,
      pageUrl,
    })
      .then((connection) => {
        if (connection) {
          refreshOpenConnectionMetadata(connection);
          window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
        }
      })
      .catch(() => undefined);
  }

  function handleCapturedCredential(rawPayload: string) {
    if (!tab.connection || !pendingCaptureNonceRef.current) {
      return;
    }
    let payload: CapturedCredentialPayload;
    try {
      payload = JSON.parse(rawPayload) as CapturedCredentialPayload;
    } catch {
      pendingCaptureNonceRef.current = null;
      setFillStatus("");
      setNavError(t("webview.savePasswordInvalidCapture"));
      return;
    }
    if (payload.nonce !== pendingCaptureNonceRef.current) {
      return;
    }
    pendingCaptureNonceRef.current = null;
    if (!payload.ok || !payload.username) {
      setFillStatus("");
      const reason = payload.reason === "no-fields"
        ? t("webview.savePasswordNoPasswordField")
        : t("webview.savePasswordFailed");
      setNavError(reason);
      return;
    }
    setNavError("");
    setFillStatus(t("webview.savingPassword"));
    const secretOwnerId = urlCredentialSecretOwnerId(tab.connection.id, payload.url);
    // The primary password (if any) is the only value kept in the OS keychain;
    // every other field is durable form data persisted alongside the credential.
    const storePassword = payload.password
      ? invokeCommand("store_secret", {
          request: {
            kind: "urlPassword",
            ownerId: secretOwnerId,
            secret: payload.password,
          },
        })
      : Promise.resolve();
    void storePassword
      .then(() => invokeCommand("upsert_url_credential", {
        request: {
          connectionId: tab.connection!.id,
          username: payload.username!,
          pageUrl: payload.url,
          usernameSelector: payload.usernameSelector,
          passwordSelector: payload.passwordSelector,
          fieldValues: payload.fieldValues ? JSON.stringify(payload.fieldValues) : undefined,
        },
      }))
      .then(() => {
        setHasSavedCredential(true);
        setFillStatus(t("webview.passwordSaved"));
        window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      })
      .catch((error) => {
        setFillStatus("");
        setNavError(error instanceof Error ? error.message : String(error));
      });
  }

  function handleSaveCredential() {
    if (!isTauriRuntime() || !sessionStartedRef.current || !tab.connection) {
      return;
    }
    setNavError("");
    setFillStatus(t("webview.capturingPassword"));
    const nonce = createCredentialCaptureNonce();
    pendingCaptureNonceRef.current = nonce;
    void invokeCommand("capture_webview_credential", {
      request: { sessionId: sessionIdRef.current, nonce },
    }).catch((error) => {
      pendingCaptureNonceRef.current = null;
      setFillStatus("");
      setNavError(error instanceof Error ? error.message : String(error));
    });
  }

  function fillCredential({ automatic, showStatus }: { automatic: boolean; showStatus: boolean }) {
    const credential = credentialRef.current;
    if (!isTauriRuntime() || !sessionStartedRef.current || !tab.connection || !credential.canFillCredential) {
      return Promise.resolve();
    }
    if (showStatus) {
      setNavError("");
      setFillStatus(t("webview.fillingCredential"));
    }
    return invokeCommand("fill_webview_credential", {
      request: {
        sessionId: sessionIdRef.current,
        connectionId: tab.connection.id,
        pageUrl: addressInput || initialUrl,
        automatic,
      },
    })
      .then(() => {
        if (showStatus) {
          setFillStatus(t("webview.credentialFilled"));
        }
      })
      .catch((error) => {
        if (showStatus) {
          setFillStatus("");
          setNavError(error instanceof Error ? error.message : String(error));
        }
      });
  }

  function handleFillCredential() {
    void fillCredential({ automatic: false, showStatus: true });
  }

  function handleOpenExternal() {
    if (!addressInput.trim()) {
      return;
    }
    setNavError("");
    void openExternalUrl(addressInput).catch((error) => {
      setNavError(error instanceof Error ? error.message : String(error));
    });
  }

  function handleAutoRefreshChange(value: string) {
    const seconds = Number(value);
    if (AUTO_REFRESH_INTERVALS_SECONDS.includes(seconds as AutoRefreshIntervalSeconds)) {
      setAutoRefreshSeconds(seconds as AutoRefreshIntervalSeconds);
    }
  }

  async function captureWebviewScreenshotForAssistant() {
    if (!isTauriRuntime()) {
      showStatusBarNotice(t("workspace.screenshotsRequireRuntime"), { tone: "warning" });
      return;
    }
    const target = workspaceRef.current;
    if (!target) {
      return;
    }
    const bounds = target.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    try {
      const screenshot = await invokeCommand("capture_screenshot_for_assistant", {
        request: {
          x: Math.max(0, Math.round(bounds.left)),
          y: Math.max(0, Math.round(bounds.top)),
          width: Math.max(1, Math.round(bounds.width)),
          height: Math.max(1, Math.round(bounds.height)),
        },
      });
      const snippet = {
        id: `webview-screenshot-${Date.now()}`,
        kind: "screenshot",
        sourceLabel: t("webview.screenshotTarget", { title: tab.title }),
        imageDataUrl: screenshot.dataUrl,
        width: screenshot.width,
        height: screenshot.height,
        capturedAt: new Date().toISOString(),
      } as const;
      if (generalSettings.submitAiAttachmentsDirectly) {
        submitAssistantContextSnippet(snippet, t("ai.directAttachmentPrompt"));
      } else {
        setAssistantContextSnippet(snippet);
      }
      onOpenAssistant();
      showStatusBarNotice(t("workspace.sentToAi"), { tone: "success" });
    } catch (error) {
      showStatusBarNotice(
        t("workspace.screenshotCaptureError", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { tone: "error" },
      );
    }
  }

  const isSecureAddress = /^https:\/\//i.test(addressInput.trim());
  const addressHost = formatWebviewSubtitle(addressInput);
  const connectionIconSrc = tab.connection?.iconDataUrl;
  const connectionIdentityLabel = tab.connection?.name || addressHost;

  return (
    <section
      className={isActive ? "terminal-workspace webview-workspace active" : "terminal-workspace webview-workspace"}
      data-color-scheme={resolveAppliedColorScheme(appearanceSettings.colorScheme)}
      data-selected-color-scheme={appearanceSettings.colorScheme}
      ref={workspaceRef}
    >
      <article className="terminal-pane webview-pane">
        <header>
          <div className="webview-nav-group" data-tutorial-id="webview.toolbar">
            <span className="webview-conn-icon" title={connectionIdentityLabel}>
              {connectionIconSrc ? (
                <img alt="" aria-hidden="true" draggable={false} height={18} src={connectionIconSrc} width={18} />
              ) : (
                <Globe2 size={16} />
              )}
            </span>
            <div className="webview-nav-cluster">
              <button
                className="terminal-pane-action"
                aria-label={t("webview.goBack")}
                onClick={() => handleSimple("webview_go_back")}
                title={t("webview.back")}
                type="button"
              >
                <ArrowLeft size={15} />
              </button>
              <button
                className="terminal-pane-action"
                aria-label={t("webview.goForward")}
                onClick={() => handleSimple("webview_go_forward")}
                title={t("webview.forward")}
                type="button"
              >
                <ArrowRight size={15} />
              </button>
              <button
                className="terminal-pane-action"
                aria-label={t("webview.reload")}
                onClick={() => handleSimple("webview_reload")}
                title={t("webview.reload")}
                type="button"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <form className="webview-address-bar" onSubmit={handleNavigate}>
              <span className={isSecureAddress ? "webview-address-lock" : "webview-address-lock insecure"}>
                {isSecureAddress ? <Lock size={13} /> : <Globe2 size={13} />}
              </span>
              <input
                aria-label={t("webview.address")}
                className="webview-address-input"
                data-tutorial-id="webview.address"
                {...technicalInputProps}
                onChange={(event) => setAddressInput(event.currentTarget.value)}
                placeholder={t("webview.urlPlaceholder")}
                value={addressInput}
              />
            </form>
          </div>
          <div className="terminal-pane-actions">
            {fillStatus ? <span className="webview-toolbar-status">{fillStatus}</span> : null}
            <button
              aria-label={t("webview.openExternally")}
              className="terminal-pane-action"
              data-tutorial-id="webview.openExternally"
              disabled={!addressInput.trim()}
              onClick={handleOpenExternal}
              title={t("webview.openExternally")}
              type="button"
            >
              <ExternalLink size={15} />
            </button>
            <select
              aria-label={t("webview.autoRefresh")}
              className="webview-auto-refresh-select"
              data-tutorial-id="webview.autoRefresh"
              onChange={(event) => handleAutoRefreshChange(event.currentTarget.value)}
              title={t("webview.autoRefresh")}
              value={autoRefreshSeconds}
            >
              {AUTO_REFRESH_INTERVALS_SECONDS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds === 0
                    ? t("webview.autoRefreshOff")
                    : t("webview.autoRefreshSeconds", { count: seconds })}
                </option>
              ))}
            </select>
            {tab.connection ? (
              <>
                <button
                  className="terminal-pane-action"
                  data-tutorial-id="webview.savePassword"
                  onClick={handleSaveCredential}
                  title={t("webview.savePasswordTitle")}
                  type="button"
                >
                  <Save size={15} />
                </button>
                <button
                  className="terminal-pane-action"
                  data-tutorial-id="webview.fillCredential"
                  disabled={!canFillCredential}
                  onClick={handleFillCredential}
                  title={canFillCredential ? t("webview.fillSavedCredential") : t("webview.noSavedCredential")}
                  type="button"
                >
                  <KeyRound size={15} />
                </button>
              </>
            ) : null}
            <ScreenshotMenu
              buttonClassName="terminal-pane-action"
              dataTutorialId="workspace.screenshotMenu"
              onPreCapture={triggerPreCapture}
              targetLabel={t("webview.screenshotTarget", { title: tab.title })}
              targetRef={workspaceRef}
            />
            <button
              aria-label={t("workspace.sendEntirePanelToAi")}
              className="terminal-pane-action"
              data-tutorial-id="webview.sendToAi"
              disabled={!isTauriRuntime()}
              onClick={() => void captureWebviewScreenshotForAssistant()}
              title={t("workspace.sendEntirePanelToAi")}
              type="button"
            >
              <Bot size={15} />
            </button>
            {onClose ? (
              <button
                aria-label={t("workspace.closeTab", { title: tab.title })}
                className="terminal-pane-action webview-close-action"
                data-tutorial-id="webview.close"
                onClick={onClose}
                title={t("workspace.closeTab", { title: tab.title })}
                type="button"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
        </header>
        <div ref={placeholderRef} className="webview-placeholder" data-tutorial-id="webview.surface">
          {webviewSnapshot ? (
            <img
              alt=""
              className="webview-suppression-snapshot"
              height={webviewSnapshot.height}
              src={webviewSnapshot.dataUrl}
              width={webviewSnapshot.width}
            />
          ) : null}
          {!initialUrl ? (
            <p className="webview-placeholder-message">{t("webview.noUrlConfigured")}</p>
          ) : !isTauriRuntime() ? (
            <p className="webview-placeholder-message">
              {t("webview.desktopRuntimeOnly")} <code>{initialUrl}</code>
            </p>
          ) : null}
          {navError ? <p className="form-error webview-placeholder-error">{navError}</p> : null}
        </div>
      </article>
    </section>
  );
}

function formatWebviewSubtitle(url: string) {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function urlDebugSnapshot(url: string) {
  try {
    const parsed = new URL(url);
    return {
      scheme: parsed.protocol.replace(/:$/, ""),
      host: parsed.host,
    };
  } catch {
    return {
      scheme: null,
      host: null,
    };
  }
}

function externalWebviewLinkUrl(rawPayload: string, expectedToken: string | null) {
  if (!expectedToken) {
    return null;
  }
  try {
    const payload = JSON.parse(rawPayload) as { token?: unknown; url?: unknown };
    if (payload.token !== expectedToken || typeof payload.url !== "string") {
      return null;
    }
    const url = new URL(payload.url);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
