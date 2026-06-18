// AI prompt contracts for Dashboard script-widget authoring.
//
// These constants are injected twice: joined into the assistant system prompt
// (ai.rs build_agent_messages) and appended to the dashboard_create_widget /
// dashboard_update_custom_widget tool descriptions. They are tuned for
// lower-end models, so follow these style rules when editing:
//
//   * One topic per contract, named in the first words ("... contract:").
//   * Short imperative rules on separate "- " lines, not run-on paragraphs.
//   * State the failure a rule prevents (ReferenceError, validation error)
//     so the model can connect rule -> consequence.
//   * Concrete identifiers (KK.getViewport, kk-shell) over abstract prose.
//
// ai/tests.rs asserts on exact substrings of these contracts; if you reword an
// anchored phrase, update the matching assertion in the same change.

pub(super) const DASHBOARD_WIDGET_COMPLETION_CONTRACT: &str = "Dashboard widget completion contract: complete the first created widget to the user's requested outcome before giving the final answer. All AI Created Widgets are script widgets.\n\
- Live or external data (realtime feeds, MCP tools, web fetches, local file/session data, anything that changes): do not create a text-only placeholder or scaffold. In the same assistant turn, use multiple tool-call rounds as needed to discover schemas, read or fetch sample data, inspect real responses, and self-correct validation errors, then create a script widget wired to the actual data source with loading, error, empty, and refresh states. Use polling or event refresh when freshness matters.\n\
- Static requests: create a small script widget that renders concise DOM inside #root using KKTerm's built-in classes.\n\
- Missing credentials or API access: create settingsSchema secret/config fields and request the secret after creation, or ask one narrow blocking question. Never ship a fake widget that pretends to work.";

pub(super) const DASHBOARD_WIDGET_ARCHETYPE_CONTRACT: &str = "Dashboard Widget Archetype contract: before authoring source, choose exactly one widgetArchetype for dashboard_create_widget; the chosen archetype must drive preset, source structure, lifecycle, library choice, and grid size.\n\
- dataMonitor: web/API/list/status data. When data can change, include compact provenance plus loading, error, empty, stale, refresh, and freshness states.\n\
- metricChart: numeric summaries, gauges, charts, meters, timelines, and local performance counters. ambient is allowed when a compact in-body title disambiguates a bare number.\n\
- utilityInstrument: QR, hash, converter, calculator, parser, generator, formatter, encoder/decoder, and similar tools. Default preset panel with explicit labels, validation, a result area, and copy/export affordances.\n\
- desktopObject: clocks, dials, notes, trays, scanners, calculators, tuners, and other tactile singleton objects. Default ambient with host title chrome hidden; no body subtitles or explanatory prose.\n\
- canvasToyGame: small games, physics toys, fidget tools, and canvas/SVG/WebGL scenes. Default ambient with host title chrome hidden; put score, status, pause/reset, and controls inside the scene as HUD chips.\n\
- generalWorkbench: last-resort fallback for mixed-purpose widgets only when none of the five primary archetypes fits. Default panel with one primary work region.\n\
For desktopObject and canvasToyGame, never wrap the object or scene in kk-panel, kk-card, or any bordered/filled surrounding surface, and never restate the host title inside the body: the object sits directly on the transparent ambient surface and fills the allocated frame so it reads as one floating instrument, not a small card inside an empty panel.";

pub(super) const DASHBOARD_WIDGET_SOURCE_CONTRACT: &str = "Dashboard widget source-correctness contract: widget source runs as-is in a sandboxed iframe; one undefined identifier breaks the whole widget, so reference only names that provably exist.\n\
- The only ambient names are standard browser APIs, the KK bridge object, and the documented global of each library listed in body.libraries (for example body.libraries [\"chartjs\"] provides Chart). Declare every other identifier with const/let/function before its first use; never call a helper function or variable you did not define in this source.\n\
- Mount first: const root = document.getElementById('root'); and build all UI from that element.\n\
- Library/global pairing is strict one-to-one: using a library global without listing its key in body.libraries throws ReferenceError at runtime; listing a library whose global is never referenced fails validation as an unused library.\n\
- Top-level await is not available; the source runs inside a synchronous function wrapper. Put awaited calls (KK.getSecret, KK.getPerformanceCounters, KK.callMcpTool, KK.readLocalFile, KK.saveFile, and fetch, which also needs permissions.network true) inside an async IIFE with try/catch that renders a compact inline error state. KK.getSettings, KK.getTheme, KK.getViewport, and KK.isVisible are synchronous; do not await them.\n\
- The sandbox clamps timers: setInterval is at least 100 ms, setTimeout at least 16 ms, requestAnimationFrame at least 16 ms (or lifecycle.minTickMs). while(true), while(1), and for(;;) are rejected at validation; every loop needs a real exit path.\n\
- The iframe has no same-origin storage: localStorage and sessionStorage are shimmed to per-mount memory and do not persist, and document.cookie is unavailable. For durable per-instance state use settingsSchema.fields with KK.getSettings()/KK.setSetting(key, value); never rely on localStorage to remember values across reloads.\n\
- Hard limits: source at most 64 KB, at most 8 libraries, and htmlShim is a small mount fragment with no script, iframe, object, embed, or document-shell tags.\n\
- Ship finished code: no TODO stubs, no invented APIs, no placeholder data presented as real. Before calling the tool, re-read the source once and confirm every identifier is declared, every queried element id exists in htmlShim or is created earlier in source, and every await sits inside an async function.";

pub(super) const DASHBOARD_WIDGET_VISUAL_CONTRACT: &str = "Dashboard widget visual contract: active Dashboard page context includes activeView.visualContext with colorScheme, backgroundKind, backgroundTone, backgroundId, and requiresOpaqueTextSurface. Exact runtime colors are available inside script widgets through KK.getTheme() and the CSS variables --kk-text, --kk-muted, --kk-surface, --kk-surface-muted, --kk-readable-surface, --kk-readable-surface-text, --kk-border, --kk-accent, and --kk-accent-soft.\n\
- These tokens are a fixed self-contained widget palette (a light set or a dark set) chosen to match the backdrop tone behind the widget, not the live app color scheme, so the widget stays readable when the user switches schemes. Drive every surface, text, and control color from these tokens; never hardcode hex colors that assume one scheme and never invent a separate color system.\n\
- Contrast pairing: use --kk-text for primary readable text; reserve --kk-muted for secondary/hint text only, never the main content. Never render text or an icon in nearly the same tone as its background, and never place accent-colored text on a --kk-accent-soft or accent fill.\n\
- Treat --kk-accent as emphasis, selection highlight, and primary-action fill, not as a body-text color.\n\
- Buttons and inputs must read as distinct controls, not bare tinted text: give them a visible fill, border, or both against the widget background so they are obviously clickable.\n\
- If requiresOpaqueTextSurface is true, put all text-bearing UI on kk-panel, kk-card, kk-result, or another opaque surface using --kk-readable-surface; do not place translucent text directly over image, video, dynamic, or mixed backgrounds.";

pub(super) const DASHBOARD_WIDGET_LAYOUT_CONTRACT: &str = "Dashboard widget layout contract: compose controls on one deliberate structure, never by scattered absolute offsets, random corners, or ad-hoc free positioning.\n\
- Standard composition (use unless the archetype dictates otherwise): an optional compact kk-toolbar row at the top for primary controls, a single primary work region (the chart, canvas, result, or object) that fills the remaining space, and an optional kk-cluster row for actions.\n\
- Alignment: grouped inputs, buttons, and labels share one edge and one baseline with a single consistent gap (about 8-12px) via kk-cluster, kk-grid, or flex; do not mix several competing alignments in one widget.\n\
- Action placement: put the primary action where the related field's flow ends, to its right or directly below it; keep secondary or destructive actions separated and visually quieter.\n\
- Never strand a single button in empty space or leave large accidental gaps. Every interactive element sits inside the layout flow with real padding and a comfortable click target, never crammed against edges or other controls.";

pub(super) const DASHBOARD_WIDGET_COPY_CONTRACT: &str = "Dashboard widget copy contract: a widget is a desktop instrument, not a tutorial or landing page.\n\
- The host title bar already names the widget: do not restate the widget name, add a descriptive subtitle, or write sentences that explain what the widget is or how to use it. No 'Enter text here to generate a QR code', no 'This widget shows...', no welcome or intro copy.\n\
- Prefer no label over an obvious one. When a control genuinely needs naming, use a terse 1-2 word noun label or a short in-field placeholder, never a separate instruction line.\n\
- Buttons use a single verb or an icon, not a sentence.\n\
- Render results, empty, and error states as compact inline states, not paragraphs.\n\
- If you feel you must explain the UI with body text, fix the UI so it explains itself instead.";

pub(super) const DASHBOARD_WIDGET_DESIGN_DIRECTION_CONTRACT: &str = "OpenDesign-style design direction contract: before authoring an AI Created Widget, choose one internal visual direction from this bounded library and make every visual decision serve it.\n\
- Operator console: dense technical surface, terminal-adjacent contrast, grids, meters, log-like rhythm, restrained signal colors.\n\
- Data observatory: charts, gauges, timelines, maps, and numeric hierarchy that make the data feel alive without marketing chrome.\n\
- Desktop object: a single tactile object such as a clock, dial, calculator, tray, note, tuner, scanner, or instrument with focused controls.\n\
- Spatial canvas: canvas/WebGL/SVG-first visual widgets such as 3D scenes, physics toys, diagrams, weather, maps, or animated monitors where the visual field is the product.\n\
- Branded vignette: image-led or editorial widgets for user-supplied brands, references, places, or media, using one strong asset plus restrained UI.\n\
If the user provides a brand/reference/screenshot, extract its palette, typography posture, density, and motion cues instead of asking for a separate direction. If no direction is specified, pick the strongest fit silently; ask one narrow style question only when two directions would create meaningfully different widgets.";

pub(super) const DASHBOARD_WIDGET_DESIGN_PREFLIGHT_CONTRACT: &str = "Widget design preflight: before calling dashboard_create_widget, silently write a tiny design brief for yourself: selected Widget Archetype, selected direction, primary visual metaphor, data hierarchy, the deliberate control layout (toolbar/work region/action placement and alignment), chosen library or native DOM/canvas approach, preset/accent/icon/grid size, empty/loading/error states, and motion budget. Then run a self-critique against contrast, hierarchy, density, layout/alignment, copy economy, responsiveness, and motion cost. Revise the planned source before the first tool call if the critique finds any of: low-contrast text or controls that blend into the background; scattered or misaligned controls; a button stranded in empty space; redundant title/subtitle prose or instructional sentences; too much text; an inner scrollbar; a generic form layout; unbounded animation; a mismatched library choice; or a widget that does not read as one composed, finished singleton instrument.";

pub(super) const DASHBOARD_WIDGET_SURFACE_CONTRACT: &str = "Dashboard widget surface contract: treat the widget root as the full allocated surface.\n\
- Make the outermost wrapper fill 100% width and height, usually with kk-shell, kk-stage, kk-panel, or kk-fill, and size canvases and visual libraries from KK.getViewport() plus KK.onViewportResize.\n\
- Do not create a smaller centered app card, duplicate the host widget frame, or leave accidental blank space around the main content.\n\
- If the useful object is naturally smaller, still use a full-size wrapper to align, center, or scale it intentionally; avoid max-width, fixed-height, or shrink-to-content outer wrappers unless the user explicitly asks for an inset miniature object.";

pub(super) const DASHBOARD_WIDGET_ANIMATION_CONTRACT: &str = "Dashboard widget animation contract: declare body.lifecycle.kind explicitly.\n\
- 'animation': widgets that should always be visibly moving (spinners, clocks, orbits, meters, ambient 3D). The host runs a stall watchdog and reports the widget as 'stalled' to the assistant if no rAF callbacks fire for 8 seconds while the widget is visible. Set body.lifecycle.minTickMs 16 for intentional smooth canvas/WebGL animation targeting 60 fps; the host honors minTickMs with a 16 ms lower bound. Design a durable base motion that does not decay to a static frame: drag/flick velocity may decay, but auto-spin or live animation needs an idle speed, fresh time-based angle, or restart path.\n\
- 'periodic': widgets that refresh on an interval (counters, polled data).\n\
- 'realtime': widgets driven by external events (websockets, MCP streams).\n\
- 'static': non-moving content (the default when lifecycle is null).\n\
If a requestAnimationFrame loop pauses while KK.isVisible() is false, use KK.onVisibilityChange((visible) => { if (visible) restartAnimation(); }) to restart that loop when visibility returns instead of leaving the widget frozen.";

pub(super) const DASHBOARD_WIDGET_PHYSICS_CONTRACT: &str = "Dashboard widget physics contract: for 2D physics, prefer the bundled Matter.js library instead of hand-rolling collision, gravity, constraints, or rigid-body integration. List body.libraries [\"matter\"] and call the Matter global from source. Size the Matter renderer/canvas from KK.getViewport(), rebuild or reposition static wall/floor bodies on KK.onViewportResize, keep the simulation bounded to the widget arena, and stop Runner or requestAnimationFrame work when the widget is paused, game-over, capped, or no longer needs animation.";

pub(super) const DASHBOARD_WIDGET_PERFORMANCE_COUNTER_CONTRACT: &str = "Dashboard performance counter contract: for local performance widgets, use a script widget that calls await KK.getPerformanceCounters(). It returns a low-overhead local snapshot with CPU, RAM, commit, process/thread/handle counts, aggregate network rates, KKTerm process memory/I/O rates, uptime, and system-drive free space. Poll at a modest interval such as 2-5 seconds; do not use requestAnimationFrame for counters.";

pub(super) const DASHBOARD_WIDGET_UTF8_CONTRACT: &str = "Dashboard widget UTF-8 contract: preserve every non-English title, summary, label, placeholder, setting option, HTML shim, and script string exactly as Unicode text. Treat widget body JSON, bodyJson, settingsSchemaJson, and generated JavaScript as UTF-8 text end to end. Do not convert UI text through Latin-1, Windows-1252, percent encoding, base64, escaped mojibake, HTML entities, or ASCII-only transliteration unless the user explicitly asks for that representation.";

pub(super) const DASHBOARD_WIDGET_DOM_CONTRACT: &str = "Dashboard widget DOM contract: the generated source is smoke-checked before it is saved.\n\
- Build the UI from the provided #root element with document.createElement and root.replaceChildren, or provide htmlShim for every extra element id you query.\n\
- Do not call document.getElementById('some-id').innerHTML/textContent/appendChild unless that id is root, appears in htmlShim, or is created in source before use. Apply the same rule to querySelector lookups: only query elements that actually exist.\n\
- After a dashboard_create_widget or dashboard_update_custom_widget call, inspect the tool result; if validation reports a DOM mount, JSON, library, or script-source error, fix the widget and retry before yielding to the user.";

pub(super) const DASHBOARD_WIDGET_HEALTH_CONTRACT: &str = "Dashboard widget runtime-health contract: storage validation only catches static problems, not errors thrown when the widget actually runs. After dashboard_create_widget (or dashboard_update_custom_widget) reports success, call dashboard_check_widget_health once with the returned instanceId to confirm it mounted. If it reports error, timeout, or stalled, read the error text (it includes the source line/column), fix the widget source, and call dashboard_update_custom_widget. Make at most one automatic self-fix attempt and then re-check; if it still fails, explain what broke to the user rather than looping. A pending or ready result needs no further action.";
