import { Edit3, Gauge, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { AssistantPageContext } from "../../ai/AssistantPanel";
import { DeleteConfirmationDialog } from "../../app/DeleteConfirmationDialog";
import {
  ModuleHeader,
  ModuleHeaderDivider,
  ModuleHeaderLead,
  ModuleHeaderTitle,
  ModuleIconTile,
} from "../../app/ModuleHeader";
import { ariaHidden } from "../../lib/aria";
import { invokeCommand, type McpServer } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import { BackgroundPopover } from "./edit/BackgroundPopover";
import { CatalogOverlay } from "./edit/CatalogOverlay";
import { CustomizePopover } from "./edit/CustomizePopover";
import {
  DASHBOARD_TAB_COLOR_PRESETS,
  isDarkBackgroundPresetId,
  resolveDashboardTabColorPreset,
} from "./registry/backgroundPresets";
import { BUILT_IN_WIDGETS } from "./registry/builtInRegistry";
import { compactLibraryCatalogForAi } from "./script/widgetLibraries";
import { useDashboardStore } from "./state/dashboardStore";
import type { DashboardView, DashboardWidgetInstance, GridDensity } from "./types";
import { dashboardVisualContextForView } from "./visualContext";
import { DashboardBackgroundHost } from "./view/DashboardBackgroundHost";
import { DashboardCanvas, DENSITY_SETTINGS } from "./view/DashboardCanvas";
import { reorderDashboardViews, type DashboardViewReorderPlacement } from "./view/viewReorder";
import type { DashboardWidgetDeleteRequest } from "./view/WidgetFrame";

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function scriptBodyMeta(bodyJson: string) {
  const body = parseJsonObject(bodyJson);
  const permissions =
    body?.permissions && typeof body.permissions === "object" && !Array.isArray(body.permissions)
      ? body.permissions
      : {};
  const libraries = Array.isArray(body?.libraries) ? body.libraries.filter((item) => typeof item === "string") : [];
  const lifecycle: Record<string, unknown> | null =
    body?.lifecycle && typeof body.lifecycle === "object" && !Array.isArray(body.lifecycle)
      ? (body.lifecycle as Record<string, unknown>)
      : null;
  const source = typeof body?.source === "string" ? body.source : "";
  return {
    hasBody: Boolean(body),
    sourceBytes: source.length,
    libraries,
    permissions,
    lifecycleKind: typeof lifecycle?.kind === "string" ? lifecycle.kind : null,
  };
}

function settingsSchemaMeta(settingsSchemaJson: string | null | undefined) {
  const schema = parseJsonObject(settingsSchemaJson);
  const fields = Array.isArray(schema?.fields)
    ? schema.fields
        .filter((field): field is Record<string, unknown> => Boolean(field) && typeof field === "object")
        .map((field) => ({
          key: typeof field.key === "string" ? field.key : null,
          type: typeof field.type === "string" ? field.type : null,
          label: typeof field.label === "string" ? field.label : null,
        }))
    : [];
  return {
    hasSettingsSchema: Boolean(schema),
    fieldCount: fields.length,
    fields,
  };
}

export function DashboardPage({
  dashboardActive,
  onAssistantContextChange,
}: {
  dashboardActive: boolean;
  onAssistantContextChange: (context: AssistantPageContext) => void;
}) {
  const { t } = useTranslation();
  const ready = useDashboardStore((s) => s.ready);
  const load = useDashboardStore((s) => s.load);
  const views = useDashboardStore((s) => s.views);
  const instances = useDashboardStore((s) => s.instances);
  const customWidgets = useDashboardStore((s) => s.customWidgets);
  const activeViewId = useDashboardStore((s) => s.activeViewId);
  const setActiveView = useDashboardStore((s) => s.setActiveView);
  const editMode = useDashboardStore((s) => s.editMode);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const setViewDensity = useDashboardStore((s) => s.setViewDensity);
  const createView = useDashboardStore((s) => s.createView);
  const renameView = useDashboardStore((s) => s.renameView);
  const widgetHealth = useDashboardStore((s) => s.widgetHealth);
  const removeView = useDashboardStore((s) => s.removeView);
  const removeInstance = useDashboardStore((s) => s.removeInstance);
  const setViewTabColor = useDashboardStore((s) => s.setViewTabColor);
  const reorderViews = useDashboardStore((s) => s.reorderViews);
  const defaultLandingView = useWorkspaceStore((s) => s.dashboardSettings.defaultLandingView);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [customize, setCustomize] = useState<{ instance: DashboardWidgetInstance; rect: DOMRect } | null>(null);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [deleteViewTarget, setDeleteViewTarget] = useState<DashboardView | null>(null);
  const [deleteWidgetTarget, setDeleteWidgetTarget] = useState<DashboardWidgetDeleteRequest | null>(null);
  const [tabGradientPicker, setTabGradientPicker] = useState<{ viewId: string; rect: DOMRect } | null>(null);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mountedViewIds, setMountedViewIds] = useState<Set<string>>(() => new Set());
  const appliedLandingPref = useRef(false);
  const viewDragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const viewDragDropRef = useRef<{ targetId: string | null; placement: DashboardViewReorderPlacement } | null>(null);
  const suppressViewClickRef = useRef(false);
  const [viewDragState, setViewDragState] = useState<{
    draggedId: string;
    targetId: string | null;
    placement: DashboardViewReorderPlacement;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void invokeCommand("mcp_list_servers", undefined)
      .then((list) => {
        if (!cancelled) setMcpServers(list);
      })
      .catch(() => {
        if (!cancelled) setMcpServers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) void load();
  }, [ready, load]);

  useEffect(() => {
    if (!ready || views.length === 0 || appliedLandingPref.current) return;
    if (defaultLandingView !== "lastActive") {
      const target = views.find((v) => v.id === defaultLandingView);
      if (target) {
        appliedLandingPref.current = true;
        setActiveView(target.id);
      }
    }
  }, [defaultLandingView, ready, views, setActiveView]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && editMode) toggleEditMode();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editMode, toggleEditMode]);

  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];

  useEffect(() => {
    if (!activeView) return;
    setMountedViewIds((current) => {
      if (current.has(activeView.id)) return current;
      return new Set(current).add(activeView.id);
    });
  }, [activeView]);

  const customizeInstance =
    customize ? instances.find((instance) => instance.id === customize.instance.id) : null;
  const viewInstances = useMemo(
    () => (activeView ? instances.filter((i) => i.viewId === activeView.id) : []),
    [activeView, instances],
  );
  const activeCustomSourceIds = useMemo(
    () => new Set(viewInstances.filter((instance) => instance.kind !== "builtIn").map((instance) => instance.sourceId)),
    [viewInstances],
  );
  const visualContext = useMemo(
    () => dashboardVisualContextForView({ background: activeView?.background ?? null }),
    [activeView?.background],
  );
  function canvasGridStyleForView(view: DashboardView) {
    const densitySettings = DENSITY_SETTINGS[view.gridDensity];
    return {
      "--dw-row-height": `${densitySettings.rowHeight}px`,
      "--dw-grid-gap-x": `${densitySettings.margin[0]}px`,
      "--dw-grid-gap-y": `${densitySettings.margin[1]}px`,
    } as CSSProperties;
  }

  function resetViewDrag() {
    viewDragRef.current = null;
    viewDragDropRef.current = null;
    setViewDragState(null);
  }

  function onViewPillPointerDown(event: PointerEvent<HTMLDivElement>, viewId: string) {
    if (!editMode || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(".dashboard-pill-dot, .dashboard-pill-close, .dashboard-pill-rename")) return;
    viewDragRef.current = {
      id: viewId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onViewPillPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = viewDragRef.current;
    if (!editMode || !drag || drag.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance < 4) return;
    drag.active = true;
    event.preventDefault();

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>(".dashboard-pill[data-view-id]");
    const targetId = target?.dataset.viewId ?? null;
    let placement: DashboardViewReorderPlacement = "before";
    if (target) {
      const rect = target.getBoundingClientRect();
      placement = event.clientX > rect.left + rect.width / 2 ? "after" : "before";
    }
    viewDragDropRef.current = { targetId, placement };
    setViewDragState({ draggedId: drag.id, targetId, placement });
  }

  function onViewPillPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = viewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const wasActive = drag.active;
    const target = viewDragDropRef.current?.targetId;
    const placement = viewDragDropRef.current?.placement ?? "before";
    resetViewDrag();
    if (!wasActive || !target) return;

    suppressViewClickRef.current = true;
    window.setTimeout(() => {
      suppressViewClickRef.current = false;
    }, 0);
    const orderedIds = reorderDashboardViews(views, drag.id, target, placement);
    if (orderedIds) void reorderViews(orderedIds);
  }

  useEffect(() => {
    if (!activeView) return;
    const dashboardSnapshot = {
      page: "dashboard",
      activeView: {
        id: activeView.id,
        title: activeView.title,
        gridDensity: activeView.gridDensity,
        background: activeView.background,
        visualContext,
      },
      instances: viewInstances.map((instance) => ({
        id: instance.id,
        kind: instance.kind,
        sourceId: instance.sourceId,
        customTitle: instance.customTitle,
        preset: instance.preset,
        accentName: instance.accentName,
        iconName: instance.iconName,
        gridX: instance.gridX,
        gridY: instance.gridY,
        gridW: instance.gridW,
        gridH: instance.gridH,
      })),
      customWidgets: customWidgets.map((widget) => ({
        id: widget.id,
        title: widget.title,
        category: widget.category,
        summary: widget.summary,
        activeOnView: activeCustomSourceIds.has(widget.id),
        bodyMeta: scriptBodyMeta(widget.bodyJson),
        settingsMeta: settingsSchemaMeta(widget.settingsSchemaJson),
      })),
      builtInWidgets: BUILT_IN_WIDGETS.map((widget) => ({
        id: widget.id,
        title: t(widget.titleKey),
        category: widget.category,
        summary: t(widget.summaryKey),
        defaultPreset: widget.defaultPreset,
        defaultAccent: widget.defaultAccent,
        defaultIcon: widget.defaultIcon,
        defaultSize: widget.defaultSize,
        activeOnView: viewInstances.some((instance) => instance.kind === "builtIn" && instance.sourceId === widget.id),
      })),
      // Smoke-test + runtime errors bubbled up from ScriptWidgetHost.
      // The assistant uses this to notice and offer to fix widgets it
      // recently authored that silently failed to mount, threw at
      // runtime, or stalled animation, rather than waiting for the user
      // to scroll over and report the empty/blank widget.
      unhealthyInstances: viewInstances
        .map((instance) => {
          const health = widgetHealth[instance.id];
          if (!health || health.state === "pending" || health.state === "ready") return null;
          return {
            id: instance.id,
            kind: instance.kind,
            sourceId: instance.sourceId,
            state: health.state,
            ...(health.state === "error" ? { error: health.error } : {}),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
      mcpServers: mcpServers.map((server) => ({
        id: server.id,
        name: server.name,
        url: server.url,
        status: server.lastStatus,
        tools: server.tools,
      })),
    };
    onAssistantContextChange({
      contextKind: "dashboard",
      contextLabel: `${t("dashboard.title")} - ${activeView.title}`,
      connectionLabel: t("dashboard.assistantContextLabel"),
      sourceLabel: t("dashboard.assistantContextSource", { view: activeView.title }),
      text: [
        t("dashboard.assistantContextIntro"),
        "For a user request to create a visible Dashboard widget, use dashboard_create_widget with activeView.id so the widget is validated and placed on the selected view in one step.",
        "For a user request to fix or edit an existing AI-authored widget, use dashboard_load_state to identify the widget id from metadata, then dashboard_read_widget_source for that one widget before calling dashboard_update_custom_widget. Prefer patch.body over patch.bodyJson so you can submit structured script bodies without manual JSON escaping.",
        "AI-authored widgets are script widgets only. For static notes, sanitized fragments, checklists, stats, and key/value summaries, create a small script widget that renders DOM inside #root.",
        "Before writing widget source, choose one Widget Archetype and pass it as dashboard_create_widget.widgetArchetype. Use dataMonitor for web/API/list/status data with freshness, loading, empty, stale, and error states. Use metricChart for numeric summaries, gauges, meters, timelines, and charts. Use utilityInstrument for QR, hash, converter, calculator, parser, generator, formatter, encoder/decoder, and similar arbitrary tools. Use desktopObject for clocks, dials, notes, trays, scanners, calculators, tuners, and tactile singleton objects. Use canvasToyGame for small games, physics toys, fidget tools, and canvas/SVG/WebGL scenes. Use generalWorkbench only as a last-resort mixed-purpose fallback when none of the five primary archetypes fits.",
        "Widget Archetype defaults: Utility Instrument and General Workbench normally use panel chrome because labels, validation, results, and copy/export affordances are part of the tool. Desktop Object and Canvas Toy/Game normally use ambient chrome, hide the host title bar, and avoid explanatory body subtitles; any state should be object-native or scene HUD-like. Data Monitor and Metric/Chart may use ambient when they render compact in-body provenance/title, otherwise use panel.",
        "When using a script widget, provide JavaScript source only. Do not generate a full HTML document or include <script> tags; create DOM nodes inside #root instead.",
        "Your script runs inside a synchronous function wrapper, so top-level `return` is allowed for early exit but any returned cleanup function is ignored. The iframe is destroyed on unmount, so cleanup is usually unnecessary. Use KK.isVisible() to skip expensive work while hidden, and KK.onVisibilityChange((visible) => { ... }) to restart animation when the widget becomes visible again. Top-level `await` is not available; wrap async work in an `async` IIFE.",
        "Choose preset, accentName, iconName, and grid size intentionally from the widget purpose. Default to panel for ordinary tools, use ambient for lightweight notes or subtle widgets, and reserve hero for rare high-priority summaries. Choose an accent color that fits the widget theme; if no accent is clearly preferable, choose a random non-default accent.",
        "Be boundary-aware: choose a gridW/gridH that fits the actual controls and content without inner scrollbars. Simple timers/counters should normally be at least 4x3; forms, image widgets, and lists should be larger, commonly 5x4 or more.",
        "Use calm app-style accents: blue/teal/slate/emerald for normal utility widgets, amber for warnings, red/rose only for destructive or error-oriented widgets. If no purpose-specific color fits, choose a random non-default accent. Keep labels concise and controls dense, aligned, and consistent with KKTerm's desktop UI.",
        "Visual context is included under activeView.visualContext as a compact background contract. Script widgets can read exact runtime theme tokens with KK.getTheme(); use --kk-text, --kk-muted, --kk-surface, --kk-surface-muted, --kk-readable-surface, --kk-readable-surface-text, --kk-border, --kk-accent, and --kk-accent-soft instead of inventing a color system. If activeView.visualContext.requiresOpaqueTextSurface is true, put all text-bearing regions on kk-panel, kk-card, kk-result, or another surface using --kk-readable-surface.",
        "Never create low-contrast UI. Use the script host's CSS variables and default text styles unless there is a strong reason to override them; if you set backgrounds, explicitly keep text readable and avoid translucent text surfaces over mixed image/video/dynamic backgrounds.",
        "For polished script-widget UI, use KKTerm's built-in classes before writing custom CSS: kk-shell, kk-toolbar, kk-cluster, kk-title, kk-subtitle, kk-muted, kk-panel, kk-card, kk-grid, kk-stat, kk-stat-value, kk-stat-label, kk-pill, kk-badge, kk-stage, and kk-fill. Compose a compact desktop control surface with a small toolbar/header, grouped controls, and one primary content region; avoid default unstyled browser controls and oversized explanatory text.",
        "If the widget needs per-instance persistent options, include settingsSchema.fields in dashboard_create_widget. KKTerm renders that schema in the widget settings UI and stores instance values; script widgets can read non-secret values with KK.getSettings() and save via KK.setSetting(key, value).",
        "Passwords, API keys, tokens, and similar sensitive options must use settingsSchema field type secret. KKTerm stores those values in the selected credential backend as widgetSecret entries; Dashboard instance JSON stores only secretRef objects. Scripts read a secret only when needed with await KK.getSecret('fieldKey').",
        "For script widgets that display remote images or fetch remote data, set permissions.network to true. Use normal http/https anchors or KK.openExternal(url) for external website links; links open in the user's external browser, not inside the widget iframe.",
        "Embedding YouTube (or Vimeo, Spotify, or any third-party media player) via <iframe> is not possible in script widgets. Widget iframes are loaded with srcdoc, which gives them a null/opaque origin; YouTube's and similar platforms' frame-ancestors CSP policy explicitly blocks embeds from null origins and will show an error instead of the player. The only viable pattern is: (1) show the video/track thumbnail as an <img> (YouTube: https://img.youtube.com/vi/{ID}/hqdefault.jpg, always available; set permissions.network true so img-src allows https:), (2) overlay a play-button affordance, and (3) open the full URL via KK.openExternal() on click. Always tell the user that the widget will open the video in their browser rather than playing it inline.",
        "Script widgets can read and save local files through native OS dialogs. await KK.readLocalFile({ filters: [{ name: 'CSV', extensions: ['csv'] }] }) returns { name, bytes: Uint8Array } or null if the user cancels. await KK.saveFile(filename, bytesUint8Array, filtersOptional) returns the saved path or null if cancelled. Use these for PDF export, CSV import, config viewers, etc. Script widgets can also create file and folder drop zones with KK.onFileDrop(elementOrSelector, callback, options). The callback receives dropped file and directory entries; file entries include bytes as Uint8Array. Use this for drag-and-drop import surfaces.",
        "For local performance widgets, call await KK.getPerformanceCounters(). It returns a low-overhead local snapshot with CPU, RAM, commit, process/thread/handle counts, aggregate network rates, KKTerm process memory/I/O rates, uptime, and system-drive free space. Poll at modest intervals such as 2-5 seconds; do not use requestAnimationFrame for counters.",
        "Script widgets can call tools on user-configured Remote MCP servers via KK.callMcpTool(serverName, toolName, args). The server name is the user-assigned name from mcpServers below; the tool name and argument schema come from that server's tools list. Returns { content, isError }. Reference servers by name, not internal id, so the widget keeps working if the server is removed and re-added.",
        "Script widgets can request curated npm libraries via a body.libraries string array. The libraries load before the widget source and expose documented globals (see compact catalog below). Use these bundled libraries when the catalog covers the need (for example uplot for time-series charts, fusejs for fuzzy search, simplestatistics for numeric summaries, three for 3D scenes, animejs for property animation, chartjs for charts, marked for markdown, prism for syntax highlighting, leaflet for maps, qrcode for QR codes, mathjs for expressions, papaparse for CSV, dayjs for dates). Do not load runtime CDN scripts; permissions.network allows remote data and images, not remote code. If no catalog entry fits, prefer simple source code. Only list libraries you actually use; do not declare more than 8. The 64KB source budget applies to your code, not to library bytes.",
        "For chartjs, uplot, leaflet, konva, pixijs, matter, qrcode, jsbarcode, and gridjs widgets, mount the visual area inside .kk-stage or .kk-panel and size it from KK.getViewport() or the containing element. On KK.onViewportResize, call the library's resize/update method (Chart.resize, setSize, map.invalidateSize, stage.size/draw, renderer.resize, or re-render the SVG/table) so the widget remains centered and proportionate after dashboard resize.",
        "For Three.js widgets, request body.libraries ['three'] and size the renderer from KK.getViewport(), not guessed constants. Mount the canvas as the only full-size child of #root; on KK.onViewportResize, call renderer.setSize(width, height, false), renderer.setPixelRatio(dpr), update camera.aspect, and camera.updateProjectionMatrix(). Keep the model centered at world origin and fit the camera to a Box3/Sphere around the complete scene so the object stays fully visible with about 15-25% margin in both portrait and landscape widget shapes. Avoid huge world coordinates; use small scene units and scale meshes down instead of pushing the camera through oversized geometry.",
        "Available widget library keys and globals:",
        compactLibraryCatalogForAi(),
        "",
        JSON.stringify(dashboardSnapshot, null, 2),
      ].join("\n"),
    });
  }, [activeView, visualContext, viewInstances, activeCustomSourceIds, customWidgets, mcpServers, widgetHealth, onAssistantContextChange, t]);

  if (!ready || !activeView) {
    return (
      <div
        className={`dashboard-loading${dashboardActive ? "" : " dashboard-page-hidden"}`}
        {...ariaHidden(!dashboardActive)}
      >
        {t("common.loading")}
      </div>
    );
  }

  return (
    <main
      className={`dashboard-page${dashboardActive ? "" : " dashboard-page-hidden"}`}
      {...ariaHidden(!dashboardActive)}
    >
      <ModuleHeader className="dashboard-topbar">
        <ModuleHeaderLead className="dashboard-brand">
          <ModuleIconTile module="dashboard">
            <Gauge aria-hidden="true" size={16} />
          </ModuleIconTile>
          <ModuleHeaderTitle as="span" className="crumb">{t("dashboard.title")}</ModuleHeaderTitle>
        </ModuleHeaderLead>
        <ModuleHeaderDivider />
        <div className={`dashboard-view-pills${editMode ? " is-editing" : ""}`}>
          {views.map((v) => {
            const isActiveView = v.id === activeView.id;
            const isEditingView = editingViewId === v.id;
            const renameInputLabel = t("dashboard.renameView");

            return (
              <div
                key={v.id}
                className={`dashboard-pill${isActiveView ? " active" : ""}${isEditingView ? " editing" : ""}${v.tabColor ? " has-tab-color" : ""}${viewDragState?.draggedId === v.id ? " is-dragging" : ""}${viewDragState?.targetId === v.id ? ` is-drop-${viewDragState.placement}` : ""}`}
                data-view-id={v.id}
                onClick={() => {
                  if (suppressViewClickRef.current) return;
                  if (!isEditingView) setActiveView(v.id);
                }}
                onPointerDown={(event) => onViewPillPointerDown(event, v.id)}
                onPointerMove={onViewPillPointerMove}
                onPointerUp={onViewPillPointerUp}
                onPointerCancel={resetViewDrag}
                style={dashboardTabColorStyle(v.tabColor)}
              >
                {editMode ? (
                  <button
                    aria-label={t("dashboard.viewTabGradient", { view: v.title })}
                    className="dashboard-pill-dot"
                    onClick={(event) => {
                      event.stopPropagation();
                      setTabGradientPicker({
                        viewId: v.id,
                        rect: event.currentTarget.getBoundingClientRect(),
                      });
                    }}
                    style={dashboardTabDotStyle(v.tabColor)}
                    type="button"
                  />
                ) : (
                  isActiveView && <span aria-hidden="true" className="dashboard-pill-dot" />
                )}
                {isEditingView ? (
                  <input
                    aria-label={renameInputLabel}
                    className="dashboard-pill-rename"
                    defaultValue={v.title}
                    autoFocus
                    onBlur={(e) => {
                      const next = e.currentTarget.value.trim();
                      if (next) void renameView(v.id, next);
                      setEditingViewId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const next = e.currentTarget.value.trim();
                        if (next) void renameView(v.id, next);
                        setEditingViewId(null);
                      } else if (e.key === "Escape") {
                        setEditingViewId(null);
                      }
                    }}
                  />
                ) : (
                  <button
                    className="dashboard-pill-main"
                    onDoubleClick={() => {
                      setActiveView(v.id);
                      setEditingViewId(v.id);
                    }}
                    type="button"
                  >
                    {v.title}
                  </button>
                )}
                {editMode && views.length > 1 && (
                  <button
                    aria-label={t("dashboard.removeView", { name: v.title })}
                    className="dashboard-pill-close"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteViewTarget(v);
                    }}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            className="dashboard-pill-add"
            onClick={async () => {
              const newView = await createView(t("dashboard.newViewName", { count: views.length + 1 }));
              if (newView) setEditingViewId(newView.id);
            }}
          >
            <Plus size={12} /> {t("dashboard.addView")}
          </button>
        </div>
        <div className="dashboard-actions">
          {editMode && (
            <DensityControl
              value={activeView.gridDensity}
              onChange={(d) => void setViewDensity(activeView.id, d)}
            />
          )}
          <button className="btn-ghost" onClick={toggleEditMode}>
            <Edit3 size={13} /> {editMode ? t("dashboard.editDone") : t("dashboard.editLayout")}
          </button>
          <button className="btn-primary" onClick={() => setCatalogOpen(true)}>
            <Plus size={13} /> {t("dashboard.addWidgetLabel")}
          </button>
        </div>
      </ModuleHeader>

      <div className="dw-canvas-stack">
        {views.map((view) => {
          const isActiveView = view.id === activeView.id;
          const shouldMountView = isActiveView || mountedViewIds.has(view.id);
          if (!shouldMountView) return null;
          const cachedViewInstances = instances.filter((instance) => instance.viewId === view.id);
          return (
            <div
              key={view.id}
              className={[
                "dw-canvas-scroll",
                editMode ? "is-editing" : "",
                isActiveView ? "is-active-view" : "is-cached-view",
              ].filter(Boolean).join(" ")}
              style={canvasGridStyleForView(view)}
              {...ariaHidden(!isActiveView || !dashboardActive)}
            >
              <DashboardBackgroundHost
                activeView={view}
                dashboardActive={dashboardActive && isActiveView}
                views={views}
              />
              <DashboardCanvas
                view={view}
                instances={cachedViewInstances}
                isViewActive={dashboardActive && isActiveView}
                onCustomize={(instance, anchor) => setCustomize({ instance, rect: anchor.getBoundingClientRect() })}
                onOpenCatalog={() => setCatalogOpen(true)}
                onOpenBackground={() => setBackgroundOpen(true)}
                onToggleEditMode={toggleEditMode}
                onRequestWidgetDelete={setDeleteWidgetTarget}
                suppressNativeWebviews={backgroundOpen}
              />
            </div>
          );
        })}
      </div>

      {catalogOpen && (
        <CatalogOverlay viewId={activeView.id} onClose={() => setCatalogOpen(false)} />
      )}
      {customize && customizeInstance && (
        <CustomizePopover
          instance={customizeInstance}
          anchorRect={customize.rect}
          onClose={() => setCustomize(null)}
        />
      )}
      {backgroundOpen && (
        <BackgroundPopover view={activeView} onClose={() => setBackgroundOpen(false)} />
      )}
      {tabGradientPicker && (
        <TabGradientPopover
          anchorRect={tabGradientPicker.rect}
          activeGradientId={views.find((view) => view.id === tabGradientPicker.viewId)?.tabColor ?? null}
          viewTitle={views.find((view) => view.id === tabGradientPicker.viewId)?.title ?? ""}
          onClose={() => setTabGradientPicker(null)}
          onSelect={(gradientId) => {
            void setViewTabColor(tabGradientPicker.viewId, gradientId);
            setTabGradientPicker(null);
          }}
        />
      )}
      {deleteViewTarget && (
        <DeleteConfirmationDialog
          confirmLabel={t("common.delete")}
          message={t("dashboard.deleteViewBody", { name: deleteViewTarget.title })}
          onCancel={() => setDeleteViewTarget(null)}
          onConfirm={() => {
            const target = deleteViewTarget;
            setDeleteViewTarget(null);
            void removeView(target.id);
          }}
          title={t("dashboard.removeView")}
        />
      )}
      {deleteWidgetTarget && (
        <DeleteConfirmationDialog
          confirmLabel={t("common.delete")}
          message={t("dashboard.deleteWidgetBody", { name: deleteWidgetTarget.title })}
          onCancel={() => setDeleteWidgetTarget(null)}
          onConfirm={() => {
            const target = deleteWidgetTarget;
            setDeleteWidgetTarget(null);
            void removeInstance(target.instanceId);
          }}
          title={t("dashboard.removeWidget", { name: deleteWidgetTarget.title })}
        />
      )}
    </main>
  );
}

function dashboardTabColorStyle(tabColor: string | null): CSSProperties | undefined {
  if (!tabColor) return undefined;
  const preset = resolveDashboardTabColorPreset(tabColor);
  const textColor = isDarkBackgroundPresetId(tabColor) ? "#ffffff" : "#0f172a";
  return {
    "--dashboard-pill-bg": preset.css,
    "--dashboard-pill-text": textColor,
    "--dashboard-pill-muted": textColor === "#ffffff" ? "rgb(255 255 255 / 78%)" : "rgb(15 23 42 / 76%)",
  } as CSSProperties;
}

function dashboardTabDotStyle(tabColor: string | null): CSSProperties | undefined {
  if (!tabColor) return undefined;
  return { background: resolveDashboardTabColorPreset(tabColor).css };
}

function TabGradientPopover({
  activeGradientId,
  anchorRect,
  onClose,
  onSelect,
  viewTitle,
}: {
  activeGradientId: string | null;
  anchorRect: DOMRect;
  onClose: () => void;
  onSelect: (gradientId: string | null) => void;
  viewTitle: string;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(event: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const style = {
    top: anchorRect.bottom + 6,
    left: Math.min(anchorRect.left, window.innerWidth - 168),
  } as CSSProperties;

  return (
    <div ref={ref} className="dashboard-tab-gradient-popover" style={style}>
      <button
        aria-label={t("dashboard.clearViewTabGradient", { view: viewTitle })}
        className={`dashboard-tab-gradient-none${activeGradientId === null ? " active" : ""}`}
        onClick={() => onSelect(null)}
        type="button"
      />
      {DASHBOARD_TAB_COLOR_PRESETS.map((preset) => (
        <button
          key={preset.id}
          aria-label={t(preset.labelKey)}
          className={activeGradientId === preset.id ? "active" : ""}
          onClick={() => onSelect(preset.id)}
          style={{ background: preset.css }}
          type="button"
        />
      ))}
    </div>
  );
}

function DensityControl({ value, onChange }: { value: GridDensity; onChange: (v: GridDensity) => void }) {
  const { t } = useTranslation();
  return (
    <div className="dashboard-density">
      {(["compact", "default", "roomy"] as const).map((d) => (
        <button
          key={d}
          className={d === value ? "active" : ""}
          onClick={() => onChange(d)}
        >{t(`dashboard.density.${d}`)}</button>
      ))}
    </div>
  );
}
