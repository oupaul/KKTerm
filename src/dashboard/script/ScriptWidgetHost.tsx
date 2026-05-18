import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  describeMcpError,
  invokeCommand,
  openExternalUrl,
  pickAndReadFile,
  pickAndSaveFile,
  type WidgetFilePickFilter,
} from "../../lib/tauri";
import { useDashboardStore } from "../state/dashboardStore";
import { useWorkspaceStore } from "../../store";
import type { DashboardWidgetInstance, ScriptBody } from "../types";
import {
  parseJsonObject,
  parseWidgetSettingsValuesJson,
  settingsValuesWithDefaults,
  validateScriptWidgetBody,
  validateWidgetSettingsSchemaJson,
} from "../schema";
import { buildSrcdoc, type ResolvedWidgetLibrary } from "./permissions";
import { loadWidgetLibraries, resolveWidgetLibraryKeys } from "./widgetLibraries";
import type { NativeContextMenuPosition } from "../../lib/nativeContextMenu";

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
  instance,
  onWidgetContextMenu,
  settingsSchemaJson,
}: {
  bodyJson: string;
  instance: DashboardWidgetInstance;
  onWidgetContextMenu: (position: NativeContextMenuPosition) => void | Promise<void>;
  settingsSchemaJson: string;
}) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeLastAcceptedRef = useRef(new Map<RateLimitedBridgeMessage, number>());
  const updateInstance = useDashboardStore((s) => s.updateInstance);
  const maxActiveScriptWidgets = useWorkspaceStore(
    (s) => s.dashboardSettings.maxActiveScriptWidgets,
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
  const syncVisibility = useCallback(() => {
    const el = iframeRef.current;
    if (!el || capped || !libraries) return;
    postIframeVisibility(el, iframeRectIsVisible(el));
  }, [capped, libraries]);
  const requestedLibraries = useMemo(
    () => (parsed ? resolveWidgetLibraryKeys(parsed.libraries, parsed.source) : []),
    [parsed],
  );
  const requestedLibKey = requestedLibraries.join("|");

  // Harden 3: register this widget in the active set. If the cap is exceeded,
  // show a lightweight placeholder instead of the full iframe. Re-runs when
  // the user changes the cap in Settings so the active set honors the current
  // ceiling and capped widgets can claim newly available room.
  useEffect(() => {
    const activated = tryActivateScriptWidget(
      instance.id,
      setCapped,
      maxActiveScriptWidgets,
    );
    setCapped(!activated);
    return () => {
      deactivateScriptWidget(instance.id);
    };
  }, [instance.id, maxActiveScriptWidgets]);

  const activateCapped = useCallback(() => {
    // Evict the oldest active widget (notifying it so its iframe tears
    // down) before taking its slot. Without the notify step the evicted
    // iframe keeps running and the cap is silently exceeded.
    const activated = activateScriptWidgetWithEviction(
      instance.id,
      setCapped,
      maxActiveScriptWidgets,
    );
    setCapped(!activated);
  }, [instance.id, maxActiveScriptWidgets]);

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
  const srcdoc = useMemo(
    () => (parsed && libraries ? buildSrcdoc(parsed, settingsValuesJson, libraries) : ""),
    [parsed, settingsValuesJson, libraries],
  );

  // Harden 2: post visibility messages to the sandbox when the iframe
  // scrolls off-screen or is occluded. Widgets can check KK.isVisible()
  // to pause expensive rAF/animation loops.
  useEffect(() => {
    const el = iframeRef.current;
    if (!el || capped || !libraries) return;
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
            (entry.isIntersecting && entry.intersectionRatio > 0.1) ||
            iframeRectIsVisible(el);
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
  }, [capped, libraries, syncVisibility]);

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
    return () => window.removeEventListener("message", onMessage);
  }, [instance.id, onWidgetContextMenu, updateInstance]);

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

  if (!libraries) {
    return <div className="dw-script-loading">{t("common.loading")}</div>;
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
