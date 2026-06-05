import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  describeMcpError,
  invokeCommand,
  openExternalUrl,
  pickAndReadFile,
  pickAndSaveFile,
  type WidgetFilePickFilter,
} from "../../../lib/tauri";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useDashboardStore } from "../state/dashboardStore";
import { useWorkspaceStore } from "../../../store";
import type { DashboardWidgetInstance, ScriptBody } from "../types";
import {
  parseJsonObject,
  parseWidgetSettingsValuesJson,
  settingsValuesWithDefaults,
  validateScriptWidgetBody,
  validateWidgetSettingsSchemaJson,
} from "../schema";
import {
  buildSrcdoc,
  DARK_SCRIPT_WIDGET_THEME,
  DEFAULT_SCRIPT_WIDGET_THEME,
  type ResolvedWidgetLibrary,
  type ScriptWidgetTheme,
} from "./permissions";
import { loadWidgetLibraries, resolveWidgetLibraryKeys } from "./widgetLibraries";
import type { NativeContextMenuPosition } from "../../../lib/nativeContextMenu";
import { dashboardVisualContextForView, isDarkCssColor } from "../visualContext";
import { resolveAccent } from "../registry/palette";

// Harden 3: cap the number of concurrently active script widgets to prevent
// too many simultaneous rAF/animation loops from saturating the renderer.
// The Map stores each active widget's React setter so that when we evict an
// older widget to make room for a newer one, we can notify the evicted
// component to flip its `capped` state and tear its iframe down. A bare
// Set<string> would silently exceed the cap because the evicted iframe
// would keep running.
//
// The cap value lives in Settings -> Dashboard
// (`dashboardSettings.maxActiveScriptWidgets`), defaults to 8, and is clamped
// 1..=100 by the Rust validator. Components pass the current value into
// `tryActivateScriptWidget`; lowering the cap enforces the new ceiling as
// hosts re-run their effect, while raising it lets later mounts claim room.
type SetCapped = (capped: boolean) => void;
const activeScriptWidgets = new Map<string, SetCapped>();

// How long to wait for the iframe's `kk.ready` signal before marking the
// widget's health as `timeout`. Long enough to ride out library injection
// + first paint on a slow WebView2 host, short enough that the assistant
// learns about silent failures inside one user turn.
const SCRIPT_WIDGET_SMOKE_TEST_MS = 2000;

// Animation-lifecycle stall watchdog: if no `kk.motionTick` arrives for this
// long while the widget is visible, flip the widget's health to `stalled`.
// Threshold is intentionally generous so a temporarily slow frame loop (gc,
// big sync work) does not false-positive; the real signal is "rAF stopped
// firing entirely" which produces an infinite gap, not a 5–6 second one.
const SCRIPT_WIDGET_MOTION_STALL_MS = 8000;
// Polling interval for the watchdog. Higher than 1 s to avoid waking React
// frequently; lower than the stall threshold so we always notice within ~3 s
// of the boundary.
const SCRIPT_WIDGET_MOTION_POLL_MS = 3000;

// Script widgets execute inside sandboxed iframes, but WebView2 can still run
// iframe JavaScript on the same renderer thread as the app UI. Defer iframe
// creation until after the Dashboard has had a chance to paint, then stagger
// mounts so one expensive AI-created widget does not block the whole view
// switch before any chrome or lightweight widgets are visible.
const SCRIPT_WIDGET_MOUNT_STAGGER_MS = 120;
// Fallback idle budget for hosts without the Prioritized Task Scheduling API:
// requestIdleCallback may never see a truly idle frame, so we cap the wait so
// the iframe still mounts within half a second.
const SCRIPT_WIDGET_MOUNT_IDLE_TIMEOUT_MS = 500;
// Viewport gate: only mount a widget's iframe once its placeholder is within
// this margin of the viewport, so the mount runs slightly ahead of the
// scroll and the widget is already painted by the time it is fully visible.
const SCRIPT_WIDGET_MOUNT_ROOT_MARGIN = "256px";
let nextScriptWidgetMountAt = 0;

// Minimal shape of the Prioritized Task Scheduling API (`scheduler.postTask`).
// Typed locally because lib.dom does not yet ship it. WebView2 is Chromium and
// supports this in production; the requestIdleCallback / setTimeout fallbacks
// below cover older or non-Chromium environments (and the Node test harness).
type SchedulerPostTask = (
  callback: () => void,
  options?: {
    priority?: "user-blocking" | "user-visible" | "background";
    delay?: number;
    signal?: AbortSignal;
  },
) => Promise<unknown>;

function getSchedulerPostTask(): SchedulerPostTask | null {
  const scheduler = (globalThis as { scheduler?: { postTask?: SchedulerPostTask } }).scheduler;
  return scheduler && typeof scheduler.postTask === "function"
    ? scheduler.postTask.bind(scheduler)
    : null;
}

const BRIDGE_RATE_LIMITS_MS = {
  setSettings: 500,
  getSecret: 500,
  saveFile: 1000,
  readLocalFile: 1000,
  callMcpTool: 1000,
  getPerformanceCounters: 1000,
  widgetContextMenu: 250,
} as const;

type RateLimitedBridgeMessage = keyof typeof BRIDGE_RATE_LIMITS_MS;

function iframeRectIsVisible(el: HTMLIFrameElement): boolean {
  const rect = el.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < viewportWidth &&
    rect.top < viewportHeight
  );
}

function postIframeVisibility(el: HTMLIFrameElement, visible: boolean) {
  el.contentWindow?.postMessage(
    { kk: true, type: "setVisible", visible },
    "*",
  );
}

type CancelScheduledScriptWidgetMount = () => void;

function scheduleScriptWidgetMount(onMount: () => void): CancelScheduledScriptWidgetMount {
  let cancelled = false;
  let frameA = 0;
  let frameB = 0;
  let timeout = 0;
  let idleHandle = 0;
  // Cancellation token for the scheduler.postTask path; cheaper paths use the
  // raf/timeout/idle handles tracked above.
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const cancel = () => {
    cancelled = true;
    controller?.abort();
    if (frameA) window.cancelAnimationFrame(frameA);
    if (frameB) window.cancelAnimationFrame(frameB);
    if (timeout) window.clearTimeout(timeout);
    if (idleHandle && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleHandle);
    }
  };
  const run = () => {
    if (cancelled) return;
    onMount();
  };

  // Two animation frames guarantee the Dashboard chrome, grid, and lightweight
  // placeholders have painted before we even reserve a mount slot, so the
  // iframe never competes with the view-switch frame itself.
  frameA = window.requestAnimationFrame(() => {
    frameA = 0;
    frameB = window.requestAnimationFrame(() => {
      frameB = 0;
      if (cancelled) return;
      const now = performance.now();
      const delay = Math.max(0, nextScriptWidgetMountAt - now);
      nextScriptWidgetMountAt = Math.max(now, nextScriptWidgetMountAt) + SCRIPT_WIDGET_MOUNT_STAGGER_MS;

      // Preferred path: a `background` task in the Prioritized Task Scheduling
      // API runs only when the main thread is otherwise free and yields to
      // user input and rendering, which is exactly what a non-urgent iframe
      // mount wants. The native `delay` carries the stagger and the
      // AbortSignal handles cancellation, so we avoid the manual
      // setTimeout + requestIdleCallback bookkeeping below.
      const postTask = getSchedulerPostTask();
      if (postTask) {
        postTask(run, {
          priority: "background",
          delay,
          signal: controller?.signal,
        }).catch(() => {
          // An aborted task rejects; cancellation is already handled above.
        });
        return;
      }

      // Fallback for hosts without scheduler.postTask: stagger with setTimeout,
      // then wait for an idle frame (bounded by SCRIPT_WIDGET_MOUNT_IDLE_TIMEOUT_MS).
      timeout = window.setTimeout(() => {
        timeout = 0;
        if ("requestIdleCallback" in window) {
          idleHandle = window.requestIdleCallback(
            () => {
              idleHandle = 0;
              run();
            },
            { timeout: SCRIPT_WIDGET_MOUNT_IDLE_TIMEOUT_MS },
          );
        } else {
          run();
        }
      }, delay);
    });
  });

  return cancel;
}

function normalizeScriptWidgetCap(cap: number): number {
  return Math.max(1, Math.floor(Number.isFinite(cap) ? cap : 1));
}

function tryActivateScriptWidget(
  id: string,
  setCapped: SetCapped,
  cap: number,
): boolean {
  const normalizedCap = normalizeScriptWidgetCap(cap);
  if (activeScriptWidgets.has(id)) {
    activeScriptWidgets.set(id, setCapped);
    return true;
  }
  enforceActiveScriptWidgetCap(normalizedCap, id);
  if (activeScriptWidgets.size >= normalizedCap) return false;
  activeScriptWidgets.set(id, setCapped);
  return true;
}

function deactivateScriptWidget(id: string) {
  activeScriptWidgets.delete(id);
}

// Evict the oldest active widget (Map preserves insertion order) and notify
// it so its iframe is replaced by the capped placeholder. Returns true if
// an eviction actually happened.
function evictOldestActiveScriptWidget(exceptId: string): boolean {
  for (const [id, setCapped] of activeScriptWidgets) {
    if (id === exceptId) continue;
    activeScriptWidgets.delete(id);
    setCapped(true);
    return true;
  }
  return false;
}

function enforceActiveScriptWidgetCap(cap: number, exceptId: string) {
  while (activeScriptWidgets.size > cap) {
    if (!evictOldestActiveScriptWidget(exceptId)) break;
  }
}

function activateScriptWidgetWithEviction(
  id: string,
  setCapped: SetCapped,
  cap: number,
): boolean {
  const normalizedCap = normalizeScriptWidgetCap(cap);
  if (activeScriptWidgets.has(id)) {
    activeScriptWidgets.set(id, setCapped);
    return true;
  }
  while (activeScriptWidgets.size >= normalizedCap) {
    if (!evictOldestActiveScriptWidget(id)) break;
  }
  if (activeScriptWidgets.size >= normalizedCap) return false;
  activeScriptWidgets.set(id, setCapped);
  return true;
}

export function ScriptWidgetHost({
  bodyJson,
  isViewActive,
  instance,
  onWidgetContextMenu,
  settingsSchemaJson,
}: {
  bodyJson: string;
  isViewActive: boolean;
  instance: DashboardWidgetInstance;
  onWidgetContextMenu: (position: NativeContextMenuPosition) => void | Promise<void>;
  settingsSchemaJson: string;
}) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // The placeholder shown before the iframe mounts. We observe it so the
  // deferred mount can wait until the widget's grid cell nears the viewport.
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const bridgeLastAcceptedRef = useRef(new Map<RateLimitedBridgeMessage, number>());
  const activeSubscriptionsRef = useRef<Set<string>>(new Set());
  // Last `kk.motionTick` timestamp from the iframe rAF wrapper. Reset to
  // Date.now() on iframe mount so a slow first paint doesn't immediately
  // trip the stall watchdog.
  const motionTickRef = useRef<number>(0);
  // Visibility, tracked in a ref so the stall watchdog can short-circuit
  // when the widget is off-screen without re-running its setInterval.
  const visibleRef = useRef<boolean>(true);
  const updateInstance = useDashboardStore((s) => s.updateInstance);
  const setWidgetHealth = useDashboardStore((s) => s.setWidgetHealth);
  const widgetHealth = useDashboardStore((s) => s.widgetHealth[instance.id]);
  const views = useDashboardStore((s) => s.views);
  const maxActiveScriptWidgets = useWorkspaceStore(
    (s) => s.dashboardSettings.maxActiveScriptWidgets,
  );
  const allowWidgetNetworkTools = useWorkspaceStore(
    (s) => s.dashboardSettings.allowWidgetNetworkTools,
  );
  const widgetLayoutEnforcement = useWorkspaceStore(
    (s) => s.dashboardSettings.widgetLayoutEnforcement,
  );
  const { key: reloadKey } = useScriptReloadHandle();
  const [capped, setCapped] = useState(false);
  const parsed = useMemo<ScriptBody | null>(() => {
    const json = parseJsonObject(bodyJson);
    if (!json.ok) return null;
    const body = validateScriptWidgetBody(json.value);
    return body.ok ? body.value : null;
  }, [bodyJson]);
  const settingsValuesJson = useMemo(
    () => resolveSettingsValuesJson(settingsSchemaJson, instance.settingsValuesJson),
    [settingsSchemaJson, instance.settingsValuesJson],
  );
  const [libraries, setLibraries] = useState<ResolvedWidgetLibrary[] | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [iframeMountReady, setIframeMountReady] = useState(false);
  // Viewport gate: a script widget on the active View does not build its
  // iframe (and therefore does not run any top-level widget JS) until its
  // placeholder scrolls within SCRIPT_WIDGET_MOUNT_ROOT_MARGIN of the
  // viewport. Off-screen widgets on a tall Dashboard cost nothing until the
  // user scrolls to them. Latched per View activation: reset when the View
  // is left so each entry re-gates against what is actually visible.
  const [inViewport, setInViewport] = useState(false);
  const syncVisibility = useCallback(() => {
    const el = iframeRef.current;
    if (!el || capped || !libraries || !iframeMountReady) return;
    const visible = isViewActive && iframeRectIsVisible(el);
    visibleRef.current = visible;
    postIframeVisibility(el, visible);
  }, [capped, isViewActive, libraries, iframeMountReady]);
  const requestedLibraries = useMemo(
    () => (parsed ? resolveWidgetLibraryKeys(parsed.libraries, parsed.source) : []),
    [parsed],
  );
  const requestedLibKey = requestedLibraries.join("|");
  const activeView = views.find((view) => view.id === instance.viewId);
  const visualContext = useMemo(
    () => dashboardVisualContextForView({ background: activeView?.background ?? null }),
    [activeView?.background],
  );
  const scriptTheme = useMemo(
    () => readScriptWidgetTheme(instance.accentName, instance.preset, visualContext),
    [instance.accentName, instance.preset, visualContext],
  );

  // Harden 3: register this widget in the active set. If the cap is exceeded,
  // show a lightweight placeholder instead of the full iframe. Re-runs when
  // the user changes the cap in Settings so the active set honors the current
  // ceiling and capped widgets can claim newly available room.
  useEffect(() => {
    if (!isViewActive) {
      setCapped(true);
      return () => {
        deactivateScriptWidget(instance.id);
      };
    }
    const activated = tryActivateScriptWidget(
      instance.id,
      setCapped,
      maxActiveScriptWidgets,
    );
    setCapped(!activated);
    return () => {
      deactivateScriptWidget(instance.id);
    };
  }, [instance.id, isViewActive, maxActiveScriptWidgets]);

  const activateCapped = useCallback(() => {
    if (!isViewActive) return;
    // Evict the oldest active widget (notifying it so its iframe tears
    // down) before taking its slot. Without the notify step the evicted
    // iframe keeps running and the cap is silently exceeded.
    const activated = activateScriptWidgetWithEviction(
      instance.id,
      setCapped,
      maxActiveScriptWidgets,
    );
    setCapped(!activated);
  }, [instance.id, isViewActive, maxActiveScriptWidgets]);

  useEffect(() => {
    if (!parsed || capped) {
      setLibraries(null);
      setLibraryError(null);
      return;
    }
    if (requestedLibraries.length === 0) {
      setLibraries([]);
      setLibraryError(null);
      return;
    }
    let cancelled = false;
    setLibraries(null);
    setLibraryError(null);
    loadWidgetLibraries(requestedLibraries)
      .then((resolved) => {
        if (cancelled) return;
        setLibraries(resolved);
      })
      .catch((err) => {
        if (cancelled) return;
        setLibraryError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [parsed, capped, requestedLibraries, requestedLibKey]);

  // Reset the viewport gate whenever the widget leaves the active View so that
  // re-entering the View re-gates against what is actually on screen instead
  // of immediately re-mounting every off-screen widget.
  useEffect(() => {
    if (!isViewActive) setInViewport(false);
  }, [isViewActive]);

  // Viewport gate observer: while the widget is eligible to mount but has not
  // yet entered the viewport, watch the placeholder. The first intersection
  // (widened by SCRIPT_WIDGET_MOUNT_ROOT_MARGIN) latches `inViewport`, which
  // lets the deferred mount below proceed. Skipped when IntersectionObserver
  // is unavailable, so those hosts mount eagerly as before.
  useEffect(() => {
    if (capped || !parsed || !libraries || !isViewActive) return;
    if (inViewport || typeof IntersectionObserver === "undefined") {
      if (typeof IntersectionObserver === "undefined") setInViewport(true);
      return;
    }
    const el = placeholderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: SCRIPT_WIDGET_MOUNT_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [capped, parsed, libraries, isViewActive, inViewport]);

  useEffect(() => {
    setIframeMountReady(false);
    if (!parsed || capped || !libraries || !isViewActive || !inViewport) return;
    return scheduleScriptWidgetMount(() => setIframeMountReady(true));
  }, [parsed, capped, libraries, isViewActive, inViewport, reloadKey]);

  // Harden 5 (A2/A3 smoke test + health bubbling): when the iframe is
  // about to mount, register the widget as `pending` and arm a 2 s
  // watchdog. The message listener below transitions to `ready` or
  // `error` on iframe signals; if neither arrives within the window, the
  // watchdog flips the state to `timeout` so a silently-broken widget
  // shows up in the AI context payload as unhealthy. Cleared on unmount
  // or reload.
  useEffect(() => {
    if (capped || !libraries || !iframeMountReady) return;
    motionTickRef.current = Date.now();
    setWidgetHealth(instance.id, { state: "pending", since: Date.now() });
    const timer = window.setTimeout(() => {
      // Only escalate to timeout if the state is still pending; ready /
      // error signals already moved us out of the smoke-test window.
      const current = useDashboardStore.getState().widgetHealth[instance.id];
      if (current?.state === "pending") {
        setWidgetHealth(instance.id, { state: "timeout", since: Date.now() });
      }
    }, SCRIPT_WIDGET_SMOKE_TEST_MS);
    return () => {
      window.clearTimeout(timer);
      setWidgetHealth(instance.id, null);
    };
  }, [instance.id, capped, libraries, iframeMountReady, reloadKey, setWidgetHealth]);

  // Harden 6 (B1 motion watchdog): only enabled for widgets that declared
  // `lifecycle.kind: "animation"`. Polls the last-motion-tick ref; if the
  // tick is older than SCRIPT_WIDGET_MOTION_STALL_MS and the widget is
  // visible, flip to `stalled`. The ready→stalled→ready transition is
  // observable, so the AI sees the regression in the next context payload
  // and can offer to fix it.
  useEffect(() => {
    if (capped || !libraries || !iframeMountReady || parsed?.lifecycle?.kind !== "animation") return;
    const interval = window.setInterval(() => {
      if (!visibleRef.current) return;
      const lastTick = motionTickRef.current;
      if (lastTick === 0) return;
      if (Date.now() - lastTick < SCRIPT_WIDGET_MOTION_STALL_MS) return;
      const current = useDashboardStore.getState().widgetHealth[instance.id];
      // Only escalate from ready / stalled. While pending, the smoke test
      // owns the state; while error, the error message is more useful.
      if (current?.state === "ready" || current?.state === "stalled") {
        setWidgetHealth(instance.id, { state: "stalled", since: Date.now() });
      }
    }, SCRIPT_WIDGET_MOTION_POLL_MS);
    return () => window.clearInterval(interval);
  }, [instance.id, capped, libraries, iframeMountReady, parsed, reloadKey, setWidgetHealth]);

  // Mirror this widget's latest runtime-health state to the backend so the
  // assistant's dashboard_check_widget_health tool can read it in the same
  // turn it created the widget. Best-effort: outside the Tauri runtime the
  // invoke rejects and is swallowed.
  useEffect(() => {
    if (!widgetHealth) return;
    void invokeCommand("dashboard_report_widget_health", {
      instanceId: instance.id,
      state: widgetHealth.state,
      error: widgetHealth.state === "error" ? widgetHealth.error : null,
    }).catch(() => {});
  }, [instance.id, widgetHealth]);

  const srcdoc = useMemo(
    () =>
      parsed && libraries && iframeMountReady
        ? buildSrcdoc(
            parsed,
            settingsValuesJson,
            libraries,
            scriptTheme,
            allowWidgetNetworkTools,
            widgetLayoutEnforcement,
          )
        : "",
    [parsed, settingsValuesJson, libraries, iframeMountReady, scriptTheme, allowWidgetNetworkTools, widgetLayoutEnforcement],
  );
  const canUseNetworkTools = parsed?.permissions.networkTools === true && allowWidgetNetworkTools;

  // Harden 2: post visibility messages to the sandbox when the iframe
  // scrolls off-screen or is occluded. Widgets can check KK.isVisible()
  // to pause expensive rAF/animation loops.
  useEffect(() => {
    const el = iframeRef.current;
    if (!el || capped || !libraries || !iframeMountReady) return;
    const syncSoon = () => {
      window.requestAnimationFrame(() => {
        syncVisibility();
        window.setTimeout(syncVisibility, 100);
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const visible =
            isViewActive &&
            ((entry.isIntersecting && entry.intersectionRatio > 0.1) ||
              iframeRectIsVisible(el));
          visibleRef.current = visible;
          postIframeVisibility(el, visible);
        }
      },
      { threshold: [0, 0.1] },
    );
    observer.observe(el);
    syncVisibility();
    syncSoon();
    window.addEventListener("resize", syncVisibility);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncVisibility);
    };
  }, [capped, isViewActive, libraries, iframeMountReady, syncVisibility]);

  // Forward net://event Tauri events to this widget's iframe subscribers.
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;
    void (async () => {
      unlisten = await listen<{ kind: string; subscriptionId: string; payload?: unknown; ok?: boolean; error?: unknown }>(
        "net://event",
        (evt) => {
          if (!mounted) return;
          const body = evt.payload;
          if (!body?.subscriptionId) return;
          if (!activeSubscriptionsRef.current.has(body.subscriptionId)) return;
          const target = iframeRef.current?.contentWindow;
          if (!target) return;
          if (body.kind === "event") {
            target.postMessage({ kk: true, type: "netEvent", subscriptionId: body.subscriptionId, payload: body.payload }, "*");
          } else if (body.kind === "done") {
            target.postMessage({ kk: true, type: "netDone", subscriptionId: body.subscriptionId, ok: body.ok === true, error: body.error }, "*");
            activeSubscriptionsRef.current.delete(body.subscriptionId);
          }
        },
      );
    })();
    return () => {
      mounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    function allowBridgeMessage(type: RateLimitedBridgeMessage): boolean {
      const now = performance.now();
      const previous = bridgeLastAcceptedRef.current.get(type) ?? -Infinity;
      if (now - previous < BRIDGE_RATE_LIMITS_MS[type]) return false;
      bridgeLastAcceptedRef.current.set(type, now);
      return true;
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      // Health signals — handled before bridge dispatch so a widget whose
      // runtime error fires inside a rate-limited bridge call still
      // surfaces. `ready` is idempotent; subsequent `runtimeError` after
      // a `ready` is accepted so post-mount regressions are caught.
      if (isScriptWidgetReadyMessage(data)) {
        setWidgetHealth(instance.id, { state: "ready", since: Date.now() });
        return;
      }
      if (isScriptWidgetRuntimeErrorMessage(data)) {
        setWidgetHealth(instance.id, {
          state: "error",
          error: data.error,
          since: Date.now(),
        });
        return;
      }
      if (isScriptWidgetMotionTickMessage(data)) {
        // Just record the last-tick timestamp; the stall watchdog effect
        // polls this ref. If the widget was previously marked `stalled`
        // and the loop resumed (e.g. resize re-armed the rAF), flip back
        // to `ready` so the AI context payload reflects current truth.
        motionTickRef.current = Date.now();
        const current = useDashboardStore.getState().widgetHealth[instance.id];
        if (current?.state === "stalled") {
          setWidgetHealth(instance.id, { state: "ready", since: Date.now() });
        }
        return;
      }
      if (isScriptWidgetOpenExternalMessage(data)) {
        void openExternalUrl(data.url);
        return;
      }
      if (isScriptWidgetSettingsMessage(data)) {
        if (!allowBridgeMessage("setSettings")) return;
        let settingsJson = "{}";
        try {
          settingsJson = JSON.stringify(data.settings);
        } catch {
          return;
        }
        const values = parseWidgetSettingsValuesJson(settingsJson);
        if (values.ok) {
          void updateInstance(instance.id, { settingsValuesJson: JSON.stringify(values.value) });
        }
        return;
      }
      if (isScriptWidgetGetSecretMessage(data)) {
        if (!allowBridgeMessage("getSecret")) {
          postBridgeError(data, "secretValue", "Widget secret reads are rate limited.");
          return;
        }
        void sendSecretResponse(data);
        return;
      }
      if (isScriptWidgetSaveFileMessage(data)) {
        if (!allowBridgeMessage("saveFile")) {
          postBridgeError(data, "saveFileResult", "Widget file save requests are rate limited.");
          return;
        }
        void sendSaveFileResponse(data);
        return;
      }
      if (isScriptWidgetReadFileMessage(data)) {
        if (!allowBridgeMessage("readLocalFile")) {
          postBridgeError(data, "readLocalFileResult", "Widget file read requests are rate limited.");
          return;
        }
        void sendReadFileResponse(data);
        return;
      }
      if (isScriptWidgetCallMcpToolMessage(data)) {
        if (!allowBridgeMessage("callMcpTool")) {
          postBridgeError(data, "mcpToolResult", "Widget MCP calls are rate limited.");
          return;
        }
        void sendMcpToolResponse(data);
        return;
      }
      if (isScriptWidgetPerformanceCountersMessage(data)) {
        if (!allowBridgeMessage("getPerformanceCounters")) {
          postBridgeError(data, "performanceCountersResult", "Widget performance counter reads are rate limited.");
          return;
        }
        void sendPerformanceCountersResponse(data);
        return;
      }
      if (isScriptWidgetContextMenuMessage(data)) {
        if (!allowBridgeMessage("widgetContextMenu")) return;
        const frameRect = iframeRef.current?.getBoundingClientRect();
        if (frameRect) {
          void onWidgetContextMenu({
            x: frameRect.left + data.x,
            y: frameRect.top + data.y,
          });
        }
        return;
      }
      if (isScriptWidgetNetCallMessage(data)) {
        void sendNetCallResponse(data);
        return;
      }
      if (isScriptWidgetNetSubscribeMessage(data)) {
        void startNetSubscription(data);
        return;
      }
      if (isScriptWidgetNetCancelMessage(data)) {
        void cancelNetSubscription(data.subscriptionId);
      }
    }

    async function sendNetCallResponse(data: { requestId: string; op: string; args: unknown }) {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      try {
        ensureNetworkToolsAllowed();
        const value = await routeNetCall(data.op, data.args);
        target.postMessage({ kk: true, type: "netCallResult", requestId: data.requestId, ok: true, value }, "*");
      } catch (error) {
        target.postMessage({ kk: true, type: "netCallResult", requestId: data.requestId, ok: false, error: toNetError(error) }, "*");
      }
    }

    async function startNetSubscription(data: { subscriptionId: string; op: string; args: unknown }) {
      try {
        ensureNetworkToolsAllowed();
        activeSubscriptionsRef.current.add(data.subscriptionId);
        await routeNetSubscribe(data.op, data.subscriptionId, data.args);
      } catch (error) {
        const target = iframeRef.current?.contentWindow;
        if (target) {
          target.postMessage({
            kk: true, type: "netDone", subscriptionId: data.subscriptionId,
            ok: false, error: toNetError(error),
          }, "*");
        }
        activeSubscriptionsRef.current.delete(data.subscriptionId);
      }
    }

    function ensureNetworkToolsAllowed() {
      if (!canUseNetworkTools) {
        throw { kind: "policyDisabled", reason: "Network tools are disabled for this widget." };
      }
    }

    async function cancelNetSubscription(subscriptionId: string) {
      try {
        await invokeCommand("network_stream_cancel", { subscriptionId });
      } catch {
        // best-effort; StreamRegistry treats unknown ids as no-ops
      }
      const target = iframeRef.current?.contentWindow;
      if (target) {
        target.postMessage({ kk: true, type: "netCancelAck", subscriptionId }, "*");
      }
    }

    async function sendSecretResponse(data: { requestId: string; key: string }) {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      try {
        const value = await invokeCommand("dashboard_read_widget_secret", {
          instanceId: instance.id,
          key: data.key,
        });
        target.postMessage({ kk: true, type: "secretValue", requestId: data.requestId, ok: true, value }, "*");
      } catch (error) {
        target.postMessage({
          kk: true,
          type: "secretValue",
          requestId: data.requestId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }, "*");
      }
    }

    async function sendSaveFileResponse(data: {
      requestId: string;
      filename: string;
      bytes: Uint8Array;
      filters?: WidgetFilePickFilter[];
    }) {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      try {
        const bytes = data.bytes instanceof Uint8Array
          ? data.bytes
          : new Uint8Array(data.bytes as unknown as ArrayBuffer);
        const path = await pickAndSaveFile(data.filename, bytes, data.filters);
        target.postMessage({
          kk: true,
          type: "saveFileResult",
          requestId: data.requestId,
          ok: true,
          path,
        }, "*");
      } catch (error) {
        target.postMessage({
          kk: true,
          type: "saveFileResult",
          requestId: data.requestId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }, "*");
      }
    }

    async function sendReadFileResponse(data: {
      requestId: string;
      filters?: WidgetFilePickFilter[];
    }) {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      try {
        const result = await pickAndReadFile(data.filters);
        target.postMessage({
          kk: true,
          type: "readLocalFileResult",
          requestId: data.requestId,
          ok: true,
          file: result ? { name: result.name, bytes: result.bytes } : null,
        }, "*");
      } catch (error) {
        target.postMessage({
          kk: true,
          type: "readLocalFileResult",
          requestId: data.requestId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }, "*");
      }
    }

    async function sendMcpToolResponse(data: {
      requestId: string;
      serverIdOrName: string;
      toolName: string;
      arguments: unknown;
    }) {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      try {
        const result = await invokeCommand("mcp_call_tool", {
          serverIdOrName: data.serverIdOrName,
          toolName: data.toolName,
          arguments: data.arguments,
        });
        target.postMessage({
          kk: true,
          type: "mcpToolResult",
          requestId: data.requestId,
          ok: true,
          result,
        }, "*");
      } catch (error) {
        target.postMessage({
          kk: true,
          type: "mcpToolResult",
          requestId: data.requestId,
          ok: false,
          error: describeMcpError(error),
        }, "*");
      }
    }

    function postBridgeError(
      data: { requestId: string },
      type: string,
      error: string,
    ) {
      iframeRef.current?.contentWindow?.postMessage({
        kk: true,
        type,
        requestId: data.requestId,
        ok: false,
        error,
      }, "*");
    }

    async function sendPerformanceCountersResponse(data: { requestId: string }) {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      try {
        const snapshot = await invokeCommand("get_system_performance_counters");
        target.postMessage({
          kk: true,
          type: "performanceCountersResult",
          requestId: data.requestId,
          ok: true,
          snapshot,
        }, "*");
      } catch (error) {
        target.postMessage({
          kk: true,
          type: "performanceCountersResult",
          requestId: data.requestId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }, "*");
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      for (const id of activeSubscriptionsRef.current) {
        void invokeCommand("network_stream_cancel", { subscriptionId: id });
      }
      activeSubscriptionsRef.current.clear();
    };
  }, [canUseNetworkTools, instance.id, onWidgetContextMenu, updateInstance, setWidgetHealth]);

  if (!parsed) {
    return <div className="dw-script-error">{t("dashboard.invalidScriptWidgetBody")}</div>;
  }

  if (capped) {
    return (
      <div
        className="dw-script-capped"
        onClick={activateCapped}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") activateCapped(); }}
        role="button"
        tabIndex={0}
      >
        {t("dashboard.scriptWidgetCapped", { max: maxActiveScriptWidgets })}
      </div>
    );
  }

  if (libraryError) {
    return (
      <div className="dw-script-error">
        {t("dashboard.widgetLibraryLoadFailed", { error: libraryError })}
      </div>
    );
  }

  if (!libraries || !iframeMountReady) {
    return (
      <div ref={placeholderRef} className="dw-script-loading">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      key={reloadKey}
      className="dw-script-frame"
      title={t("dashboard.scriptWidgetFrameTitle")}
      loading="lazy"
      onLoad={syncVisibility}
      sandbox="allow-scripts allow-downloads"
      srcDoc={srcdoc}
    />
  );
}

function resolveSettingsValuesJson(settingsSchemaJson: string, settingsValuesJson: string) {
  const schema = validateWidgetSettingsSchemaJson(settingsSchemaJson);
  const values = parseWidgetSettingsValuesJson(settingsValuesJson);
  if (!schema.ok) return values.ok ? JSON.stringify(values.value) : "{}";
  return JSON.stringify(settingsValuesWithDefaults(schema.value, values.ok ? values.value : {}));
}

function isScriptWidgetReadyMessage(value: unknown): value is { kk: true; type: "ready" } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown };
  return candidate.kk === true && candidate.type === "ready";
}

function isScriptWidgetRuntimeErrorMessage(value: unknown): value is {
  kk: true;
  type: "runtimeError";
  error: string;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; error?: unknown };
  return (
    candidate.kk === true &&
    candidate.type === "runtimeError" &&
    typeof candidate.error === "string"
  );
}

function isScriptWidgetMotionTickMessage(value: unknown): value is {
  kk: true;
  type: "motionTick";
  ticks: number;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; ticks?: unknown };
  return (
    candidate.kk === true &&
    candidate.type === "motionTick" &&
    typeof candidate.ticks === "number" &&
    Number.isFinite(candidate.ticks)
  );
}

function isScriptWidgetOpenExternalMessage(value: unknown): value is { kk: true; type: "openExternalUrl"; url: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; url?: unknown };
  if (candidate.kk !== true || candidate.type !== "openExternalUrl" || typeof candidate.url !== "string") {
    return false;
  }
  try {
    const url = new URL(candidate.url);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isScriptWidgetSettingsMessage(value: unknown): value is { kk: true; type: "setSettings"; settings: Record<string, unknown> } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; settings?: unknown };
  return (
    candidate.kk === true &&
    candidate.type === "setSettings" &&
    typeof candidate.settings === "object" &&
    candidate.settings !== null &&
    !Array.isArray(candidate.settings)
  );
}

function isScriptWidgetGetSecretMessage(value: unknown): value is { kk: true; type: "getSecret"; requestId: string; key: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; requestId?: unknown; key?: unknown };
  return (
    candidate.kk === true &&
    candidate.type === "getSecret" &&
    typeof candidate.requestId === "string" &&
    typeof candidate.key === "string" &&
    candidate.key.length > 0
  );
}

function isFilterArray(value: unknown): value is WidgetFilePickFilter[] {
  if (!Array.isArray(value)) return false;
  return value.every((entry) =>
    entry !== null &&
    typeof entry === "object" &&
    typeof (entry as WidgetFilePickFilter).name === "string" &&
    Array.isArray((entry as WidgetFilePickFilter).extensions) &&
    (entry as WidgetFilePickFilter).extensions.every((ext) => typeof ext === "string"),
  );
}

function isScriptWidgetSaveFileMessage(value: unknown): value is {
  kk: true;
  type: "saveFile";
  requestId: string;
  filename: string;
  bytes: Uint8Array;
  filters?: WidgetFilePickFilter[];
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    kk?: unknown;
    type?: unknown;
    requestId?: unknown;
    filename?: unknown;
    bytes?: unknown;
    filters?: unknown;
  };
  if (candidate.kk !== true || candidate.type !== "saveFile") return false;
  if (typeof candidate.requestId !== "string" || typeof candidate.filename !== "string") return false;
  if (!candidate.filename) return false;
  const bytesOk = candidate.bytes instanceof Uint8Array || candidate.bytes instanceof ArrayBuffer;
  if (!bytesOk) return false;
  if (candidate.filters !== undefined && !isFilterArray(candidate.filters)) return false;
  return true;
}

function isScriptWidgetReadFileMessage(value: unknown): value is {
  kk: true;
  type: "readLocalFile";
  requestId: string;
  filters?: WidgetFilePickFilter[];
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; requestId?: unknown; filters?: unknown };
  if (candidate.kk !== true || candidate.type !== "readLocalFile") return false;
  if (typeof candidate.requestId !== "string") return false;
  if (candidate.filters !== undefined && !isFilterArray(candidate.filters)) return false;
  return true;
}

function isScriptWidgetCallMcpToolMessage(value: unknown): value is {
  kk: true;
  type: "callMcpTool";
  requestId: string;
  serverIdOrName: string;
  toolName: string;
  arguments: unknown;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    kk?: unknown;
    type?: unknown;
    requestId?: unknown;
    serverIdOrName?: unknown;
    toolName?: unknown;
  };
  return (
    candidate.kk === true &&
    candidate.type === "callMcpTool" &&
    typeof candidate.requestId === "string" &&
    typeof candidate.serverIdOrName === "string" &&
    candidate.serverIdOrName.length > 0 &&
    typeof candidate.toolName === "string" &&
    candidate.toolName.length > 0
  );
}

/**
 * Build the script-widget theme. Widget bodies use a fixed self-contained
 * light/dark palette instead of the live app color-scheme tokens, so a widget
 * stays readable and visually stable when the user switches color schemes — a
 * scheme change repaints only the surrounding chrome, not the widget body. Only
 * the backdrop tone behind the iframe selects between the two palettes:
 *
 * - `panel` bodies sit on the app `--surface`, so they follow the app surface
 *   tone (a dark scheme keeps a dark widget panel readable).
 * - `hero` bodies sit on an accent gradient with white text, so they are always
 *   treated as dark.
 * - `ambient` bodies float on the per-view background, so they follow
 *   `visualContext.colorScheme` (which already reflects the app-bg tone for the
 *   theme-default background).
 *
 * The instance accent is layered on top of whichever palette is chosen.
 */
function readScriptWidgetTheme(
  accentName: DashboardWidgetInstance["accentName"],
  preset: DashboardWidgetInstance["preset"],
  visualContext: ScriptWidgetTheme["visualContext"],
): ScriptWidgetTheme {
  const tone = backdropToneForPreset(preset, visualContext);
  const base = tone === "dark" ? DARK_SCRIPT_WIDGET_THEME : DEFAULT_SCRIPT_WIDGET_THEME;
  const accent = resolveAccent(accentName);
  return {
    ...base,
    colorScheme: tone,
    accent: accent.color,
    accentSoft: accent.soft,
    visualContext,
  };
}

function backdropToneForPreset(
  preset: DashboardWidgetInstance["preset"],
  visualContext: ScriptWidgetTheme["visualContext"],
): "light" | "dark" {
  if (preset === "hero") return "dark";
  if (preset === "panel") return appSurfaceTone();
  return visualContext.colorScheme === "dark" ? "dark" : "light";
}

function appSurfaceTone(): "light" | "dark" {
  if (typeof window === "undefined" || typeof document === "undefined") return "light";
  const surface = window.getComputedStyle(document.documentElement).getPropertyValue("--surface");
  return isDarkCssColor(surface) ? "dark" : "light";
}

function isScriptWidgetPerformanceCountersMessage(value: unknown): value is {
  kk: true;
  type: "getPerformanceCounters";
  requestId: string;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; requestId?: unknown };
  return (
    candidate.kk === true &&
    candidate.type === "getPerformanceCounters" &&
    typeof candidate.requestId === "string"
  );
}

function isScriptWidgetContextMenuMessage(value: unknown): value is {
  kk: true;
  type: "widgetContextMenu";
  x: number;
  y: number;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kk?: unknown; type?: unknown; x?: unknown; y?: unknown };
  return (
    candidate.kk === true &&
    candidate.type === "widgetContextMenu" &&
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y)
  );
}

export function useScriptReloadHandle() {
  const [key, setKey] = useState(0);
  return { key, reload: () => setKey((k) => k + 1) };
}

function isScriptWidgetNetCallMessage(value: unknown): value is {
  kk: true; type: "netCall"; requestId: string; op: string; args: unknown;
} {
  if (!value || typeof value !== "object") return false;
  const c = value as { kk?: unknown; type?: unknown; requestId?: unknown; op?: unknown };
  return c.kk === true && c.type === "netCall" && typeof c.requestId === "string" && typeof c.op === "string";
}

function isScriptWidgetNetSubscribeMessage(value: unknown): value is {
  kk: true; type: "netSubscribe"; subscriptionId: string; op: string; args: unknown;
} {
  if (!value || typeof value !== "object") return false;
  const c = value as { kk?: unknown; type?: unknown; subscriptionId?: unknown; op?: unknown };
  return c.kk === true && c.type === "netSubscribe" && typeof c.subscriptionId === "string" && typeof c.op === "string";
}

function isScriptWidgetNetCancelMessage(value: unknown): value is {
  kk: true; type: "netCancel"; subscriptionId: string;
} {
  if (!value || typeof value !== "object") return false;
  const c = value as { kk?: unknown; type?: unknown; subscriptionId?: unknown };
  return c.kk === true && c.type === "netCancel" && typeof c.subscriptionId === "string";
}

async function routeNetCall(op: string, args: unknown): Promise<unknown> {
  const a = (args ?? {}) as Record<string, unknown>;
  switch (op) {
    case "dns": return invokeCommand("network_dns_lookup", { host: a.host as string, recordType: a.type as string | undefined });
    case "tcpCheck": return invokeCommand("network_tcp_check", { host: a.host as string, port: a.port as number, timeoutMs: a.timeoutMs as number | undefined });
    case "interfaces": return invokeCommand("network_interfaces");
    case "wol": return invokeCommand("network_wol", { mac: a.mac as string, broadcast: a.broadcast as string | undefined, port: a.port as number | undefined });
    case "whois": return invokeCommand("network_whois", { domain: (a.domain ?? a.query) as string });
    default: throw new Error(`Unknown net op: ${op}`);
  }
}

async function routeNetSubscribe(op: string, subscriptionId: string, args: unknown): Promise<void> {
  const a = (args ?? {}) as Record<string, unknown>;
  switch (op) {
    case "ping":
      await invokeCommand("network_ping_start", { args: { subscriptionId, ...a } as never });
      return;
    case "portScan":
      await invokeCommand("network_port_scan_start", { args: { subscriptionId, ...a } as never });
      return;
    default:
      throw new Error(`Unknown stream op: ${op}`);
  }
}

function toNetError(error: unknown): { kind: string; reason?: string } {
  if (error && typeof error === "object" && "kind" in (error as Record<string, unknown>)) {
    return error as { kind: string; reason?: string };
  }
  return { kind: "internal", reason: error instanceof Error ? error.message : String(error) };
}
