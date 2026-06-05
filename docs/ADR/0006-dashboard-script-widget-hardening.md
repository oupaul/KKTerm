# ADR 0006: Dashboard Script Widget Hardening

## Status

Accepted

## Context

KKTerm's Dashboard lets the AI Assistant create user-visible script widgets
that run as sandboxed iframes inside WebView2. Each widget hosts arbitrary
JavaScript that the AI authored and that the user has not reviewed.

A real-world incident exposed how brittle this surface is. The AI created four
script widgets on a single Dashboard view in one turn — a Tetris game, a
Fidget Spinner, a population chart, and a Git diagram — while the Matrix
dynamic background was also running. Together that produced five concurrent
`requestAnimationFrame` / animation loops driving the same WebView2 render
thread, and the app froze hard enough that the user had to force-quit.

Post-mortem analysis identified five independent failure modes:

1. The Tetris collision function had no floor boundary check, so pieces fell
   off the bottom forever while the rAF loop kept ticking at 60fps.
2. The widget declared bundled `matter` and `animejs` libraries that the
   source never referenced. Each costs ~80 KB of memory and adds GC pressure.
3. KKTerm had no mechanism to throttle off-screen widgets or cap the number
   of simultaneously active widgets.
4. A panic inside any storage operation poisoned the shared SQLite mutex, and
   the next caller's `.expect("dashboard storage mutex poisoned")` would
   cascade into an app-wide crash.
5. The AI prompt for `dashboard_create_widget` contained no guidance about
   game-boundary checks or `requestAnimationFrame` exit paths.

The freeze was not a single bug. It was the absence of layered defenses.

## Decision

Add layered defenses, applied at the layer closest to where each class of
mistake originates.

### 1. Validate script source before SQLite write

`validate_script_body_json_detailed` in `dashboard_validation.rs` runs every
script-widget write through a two-stage source check.

**Stage 1a — semantic prefilter (`validate_script_source_inner`).** A cheap
textual scan against a "code-only" view of the source (strings, template
literals, and comments blanked out by `strip_strings_and_comments`) that
rejects:

- null bytes (filesystem / WebView2 hazard),
- raw `while(true)`, `while(1)`, `for(;;)` infinite loops *in code* (not in
  strings or comments).

This stage exists to enforce runtime-safety rules that a real JS parser will
not catch — a well-formed `while(true) {}` is valid JavaScript that we still
forbid for widgets. The string-stripper counts consecutive backslashes so
`'\\'` closes the string but `'\\''` does not (regression-tested explicitly),
and preserves newlines so any future diagnostic that maps to line/col works
unchanged.

**Stage 1b — AST parse (`parse_script_source_ast`).** Source is wrapped in
the same synchronous IIFE the runtime host uses (`(function(){ source })()`)
and parsed with `oxc_parser` using `SourceType::cjs()`. The wrapper makes a
top-level `return` legal — matching what the iframe actually executes — so
the validator does not false-reject the `if (!root) return;` early-exit
pattern that AI generators emit. On failure, the validator returns the first
parser diagnostic with its line/column mapped back to widget-source
coordinates (the wrapper line is subtracted) so the assistant can self-
correct on the next tool round.

Stage 1b is the source of truth for syntactic correctness. It catches every
class of grammar error the previous text-based delimiter scan could not:

- `const x = ;` (delimiter-balanced, missing operand),
- `let x x = 5;` (unexpected token after declaration),
- regex literals with literally unbalanced inner delimiters such as
  `/^foo\(/` — formerly false-rejected by the text scan, now correctly
  recognized as regex tokens.

Delimiter balance is no longer tracked in the heuristic; oxc reports any
unmatched paren, brace, or bracket through the same parse-error path as
every other grammar violation.

**Heuristic limitation that remains.** Stage 1a treats `${expr}` interpolation
inside template literals as part of the opaque string, so a `while(true)`
written *inside* an interpolation expression slips through the infinite-loop
scan. The active-widget cap (§7) and visibility throttle (§8) bound the
blast radius if anything slips through. Stage 1b does walk into interpolation
expressions for the unused-library cross-reference (§2), so a library
referenced *only* inside `${...}` still counts as used.

### 2. Cross-check declared libraries against the code

The AST parse in §1b returns the set of every
`IdentifierReference.name` collected by an `oxc_ast_visit::Visit` walk
(`IdentifierCollector`). That set is the source of truth for the unused-
library check: for each entry in `body.libraries` that maps to a known
global in `KNOWN_LIBRARY_GLOBALS`, the validator requires the global to
appear in the identifier set. References that exist only in comments or
strings do not count, because the AST does not surface them as identifier
references. References inside template-literal `${...}` interpolations *do*
count, because oxc walks into interpolation expressions like any other
expression position.

The AST set is exact: no string/comment false-positives, and no false-
negatives from template-literal interpolation. This replaces the previous
text-based word-boundary scan (`source_references_identifier`), which short
globals like `L` (Leaflet) forced into a brittle whole-token match against
the stripped code view.

`KNOWN_LIBRARY_GLOBALS` must stay in lockstep with
`src/modules/dashboard/script/widgetLibraries.ts`. A new bundled library that is
not added to `KNOWN_LIBRARY_GLOBALS` silently skips this check — soft
degradation, but reviewers must remember to update both files in the same
change.

Assistant-created widget bodies have one narrow repair path before this
validator runs: `dashboard_create_widget` and structured
`dashboard_update_custom_widget.patch.body` call
`drop_unused_script_libraries` to remove declared libraries whose documented
globals are not referenced in source. The sanitizer uses the same AST parse
as the validator, and falls through (no mutation) for unparseable source so
the storage validator's structured parse-error message remains the canonical
feedback to the assistant. This exists because models often list a plausible
helper such as `dayjs` and then implement the widget with native `Date`;
failing the whole user-visible creation in that case is noisy but does not
protect the renderer. Do not weaken the storage validator to accept unused
libraries generally, and do not add broad prompt-only fixes for this class of
error. Keep the repair at the assistant tool boundary, then let normal
validation remain the final authority.

### 3. Validate `htmlShim` before SQLite write

`validate_html_shim` runs on every non-empty `body.htmlShim` value and
rejects:

- shims larger than `MAX_HTML_SHIM_BYTES` (128 KB) — generous enough for
  realistic mount-point fragments and prebuilt layout scaffolds, narrow
  enough to refuse multi-MB document dumps,
- null bytes,
- forbidden tags via a case-insensitive, token-boundary scan
  (`html_shim_contains_tag_open`) against `HTML_SHIM_FORBIDDEN_TAGS`:
  `script`, `iframe`, `object`, `embed`, `html`, `head`, `body`, `meta`,
  `title`, `link`. The token-boundary check requires the byte after the tag
  name to be non-alphanumeric, so `<scripty-x>` does not match `<script`.

The runtime CSP already blocks `<script>`, `<iframe>`, `<object>`, and
`<embed>` execution; this validator does not replace that defense. It
exists so the assistant gets a clean structured error (`forbidden tag
<script>; the shim must be a small mount-point fragment ...`) to self-
correct against, rather than shipping a dead `<script>` tag through
storage and then seeing a silent no-op at render time. Document-shell
tags (`html`, `head`, `body`, `meta`, `title`, `link`) are rejected because
the shim is meant to be a fragment dropped into the host document's
`<body>`; a second document inside the shim breaks layout in undefined ways.

To keep room for a 128 KB shim alongside a 64 KB source, the envelope
size check in `validate_script_body_json_detailed` is
`MAX_SCRIPT_SOURCE_BYTES + MAX_HTML_SHIM_BYTES + 4096` rather than the
old `MAX_SCRIPT_SOURCE_BYTES + 4096`. Without this bump a maxed-out shim
trips the outer envelope check before reaching the shim-specific
validator, which gives the assistant the wrong error to react to.

### 4. Declared lifecycle and motion watchdog

`ScriptBody` carries an optional `lifecycle: { kind, minTickMs? }` field
(`ScriptLifecycle` in Rust, mirrored in `src/modules/dashboard/types.ts` and
`src/modules/dashboard/schema.ts`). `kind` is one of `static`, `periodic`,
`animation`, `realtime`. Absent or null lifecycle is treated as `static`
so legacy widgets without the field continue to deserialize cleanly.
`minTickMs` is clamped to `16..=60_000` at the storage boundary. The
iframe host honors it for the rAF guardrail with a 16 ms lower bound, so
intentional animation widgets can target 60 fps while still preventing
tight-loop scheduling. Widgets without a declared cadence use the same 16 ms
rAF floor.

The lifecycle kind turns the *prompt-only* contract for animation widgets
into a *mechanically checked* invariant. The iframe's centralized
`runKkRafPump` emits a throttled `{ kk: true, type: 'motionTick', ticks }`
message every ~500 ms while rAF callbacks are firing
(`KK_MOTION_TICK_MIN_MS`). `ScriptWidgetHost` records the last-tick
timestamp in `motionTickRef` and runs a polling watchdog
(`SCRIPT_WIDGET_MOTION_POLL_MS`, 3 s) only for instances whose
`parsed.lifecycle.kind === "animation"`. If the iframe is visible and no
tick has arrived for `SCRIPT_WIDGET_MOTION_STALL_MS` (8 s), the host flips
the instance's `WidgetHealth` to `stalled`. A later tick after a stall
transitions the health back to `ready`, so a widget that resumed after a
resize-driven rAF re-arm shows correctly on the next AI context payload.

The 8 s threshold is intentionally generous: a single GC pause or a big
synchronous chunk should not false-positive. The real signal is "rAF
stopped firing entirely", which produces an unbounded gap, not a 5–6 s one.
The watchdog catches "exception in update callback that got swallowed"; it
does **not** catch "rAF still running, scene visually frozen" — that needs
a pixel-hash watchdog and is deferred.

`realtime` and `periodic` are accepted but currently have no host-side
invariant. They are reserved for future data-freshness / heartbeat checks.

### 5. Smoke test + runtime health bubbling

`ScriptWidgetHost` registers each mounting script instance in the
`dashboardStore.widgetHealth` map as `{ state: "pending", since }` and
arms a `SCRIPT_WIDGET_SMOKE_TEST_MS` (2 s) watchdog. The iframe sandbox
posts two new messages the host listens for:

- `{ kk: true, type: "ready" }` — emitted from the source-injection
  `then()` after `injectScript` resolves. The widget reached its
  top-level evaluation without a synchronous throw. Host transitions to
  `ready`.
- `{ kk: true, type: "runtimeError", error: <serialized> }` — emitted
  from `showError` (the iframe's unhandled-error renderer). Host
  transitions to `error` and stores the serialized error string. A
  `runtimeError` *after* a previous `ready` is accepted, so post-mount
  regressions are still observable.

If neither message arrives within 2 s, the smoke watchdog flips the
state to `timeout` so a silently-broken widget still shows up as
unhealthy. Unmount clears the health entry.

`DashboardPage` projects the union of all `non-ready / non-pending`
widget healths into the `unhealthyInstances` field of the AI assistant
context payload (`id`, `kind`, `sourceId`, `state`, and `error` when
present). The assistant receives this on the next turn and can offer to
fix the widget it just authored without waiting for the user to scroll
over and report a blank or broken card.

Health state is **in-memory only**. It is not persisted in SQLite — the
2 s smoke window and the live iframe both restart on every app launch
or reload anyway, so the only meaningful state is the current one.

### 6. Deferred, viewport-gated, and staggered iframe startup

`ScriptWidgetHost` does not attach the iframe immediately after the React
host is rendered. Once the widget body is valid and any declared bundled
libraries are resolved, the host waits for two animation frames (so the
Dashboard chrome has actually painted), then reserves a small file-scope
stagger slot (`SCRIPT_WIDGET_MOUNT_STAGGER_MS`, 120 ms) before setting
`srcDoc`.

**Viewport gating.** Even on the active View, a gated widget's iframe is not
built until the widget's placeholder scrolls within
`SCRIPT_WIDGET_MOUNT_ROOT_MARGIN` (256 px) of the viewport, measured by an
`IntersectionObserver` on the placeholder. A widget below the fold therefore
runs **zero** top-level JavaScript until the user scrolls toward it, so a tall
Dashboard with many script widgets only pays for the ones actually on screen.
The 256 px margin mounts each widget slightly ahead of the scroll so it is
already painted by the time it is fully visible. The gate is latched per View
activation: it is reset when the View is left, so re-entering a View re-gates
against what is actually visible instead of re-mounting every off-screen widget
at once. The placeholder fills the widget's grid cell (`.dw-script-loading`) so
the observer measures the widget's real area rather than a single line of text.
Hosts without `IntersectionObserver` mount eagerly, preserving prior behavior.

**Monitoring widgets are exempt.** Viewport gating only applies to `static`
(the default) and `animation` lifecycle kinds, which hold no cross-time state —
re-mounting one when it scrolls into view loses nothing, and an off-screen
animation has nothing useful to show anyway. Widgets declared `periodic`
(interval polling, e.g. an AI-coding-usage or system-stats monitor) or
`realtime` (event/stream-driven) are exempt: they mount eagerly so they keep
polling and accumulating data while scrolled off-screen, exactly as they did
before viewport gating. This is the same lifecycle taxonomy the AI uses when it
authors a widget (`dashboard_create_widget` requires `body.lifecycle.kind`), so
a monitor the assistant creates is gated correctly without any extra signal.
Gating is therefore a within-active-View optimization for display widgets, not
a change to monitoring semantics. (Off-screen monitors still cooperate with the
visibility throttle in §8 — they can cheapen rendering via `KK.isVisible()` —
they simply are not torn down.)

The deferred mount runs as a `background`-priority task via the Prioritized
Task Scheduling API (`scheduler.postTask`) when the host supports it. A
`background` task only runs when the main thread is otherwise free and yields
to user input and rendering, so the mount cannot stall an in-flight
interaction; the stagger is carried by the task's native `delay` and
cancellation by an `AbortSignal`. WebView2 is Chromium-based, so this is the
production path. Hosts without `scheduler.postTask` (older/non-Chromium
engines, the Node test harness) fall back to `setTimeout` for the stagger plus
`requestIdleCallback` with a bounded timeout
(`SCRIPT_WIDGET_MOUNT_IDLE_TIMEOUT_MS`, 500 ms). `requestIdleCallback` is only
a fallback because its idle deadline is heuristic and can be starved on a busy
renderer, whereas `postTask` integrates with the browser's unified scheduler.

This does **not** make arbitrary widget JavaScript safe or preemptible:
WebView2 may still execute iframe JavaScript on the same renderer thread as
the app UI. The purpose is narrower and user-visible: switching to a
Dashboard View should paint the Dashboard chrome, grid, and lightweight
placeholders before an expensive AI-authored widget gets a chance to run a
large synchronous top-level script. Multiple script widgets on the same View
start one at a time instead of all evaluating during the same view-switch
frame.

The smoke-test `pending` state and motion watchdog start only after the
deferred iframe mount is ready. Otherwise a deliberately delayed mount could
be misreported as a timeout before the iframe exists. A consequence of
viewport gating is that a widget which never enters the viewport never
registers a health state — which is correct, since it is doing no work and
cannot be stalled or broken until it actually runs.

### 7. Active-widget cap with eviction notification

`ScriptWidgetHost` tracks active script widgets in a file-scope
`Map<id, setCapped>`. When a new widget tries to mount past the cap it is
shown a muted "Click to activate" placeholder instead of an iframe.
Clicking the placeholder evicts the oldest active widget *and notifies it
via the stored setter* so its component flips to `capped: true` and its
iframe is removed from the DOM.

The notify step is load-bearing. An earlier draft of this fix kept the
evicted widget tracked-but-still-rendered, so the cap silently exceeded
itself the first time a user clicked the placeholder. The
`evictOldestActiveScriptWidget` helper is the canonical eviction path.

The cap is a user setting: **Settings → Dashboard → Performance → Active
script widgets cap**, persisted on `DashboardSettings.maxActiveScriptWidgets`
(Rust struct field + TypeScript interface), default **8**, hard-clamped
`1..=100` at the storage boundary. The default rose from the original
post-mortem value of 3 because dashboards with several lightweight script
widgets need more headroom; the 100 ceiling is still well below the
regression threshold on the original incident hardware.

`ScriptWidgetHost` reads the cap from `useWorkspaceStore` and passes it
into `tryActivateScriptWidget`. The mount effect depends on the cap, so:

- **Raising the cap** gives capped hosts room to activate on their next cap
  effect pass, up to the new ceiling.
- **Lowering the cap** enforces the new ceiling as hosts re-run their cap
  effect. This may replace older running iframes with placeholders, but it
  preserves the hard resource boundary the setting promises.

The constants live in two places that must stay in sync:

- `default_max_active_script_widgets()` and
  `MAX_ACTIVE_SCRIPT_WIDGETS_LIMIT` in `src-tauri/src/storage.rs`.
- `MAX_ACTIVE_SCRIPT_WIDGETS_DEFAULT`, `_LIMIT`, `_MIN` in
  `src/app-defaults.ts`.

Bumping the upper bound requires changing both files, the
`validate_dashboard_settings` clamp, and the translated
`settings.dashboardMaxActiveScriptWidgetsHint` value in every locale file.

### 8. Visibility-aware throttling via IntersectionObserver

The host posts `{ kk: true, type: "setVisible", visible: bool }` to each
iframe whenever the iframe scrolls off-screen or back on-screen. The iframe
sandbox installs a `KK.isVisible()` helper that returns the latest value.
Widgets that opt in can short-circuit expensive work — typically by checking
`if (!KK.isVisible()) return; requestAnimationFrame(loop);` at the top of
their rAF callback.

This is cooperative throttling, not enforcement: a widget that ignores
`KK.isVisible()` keeps burning frames. The AI prompt change in §10 nudges
toward the cooperative path.

### 9. Mutex poison recovery with defensive rollback

`storage::Storage::with_connection_infallible` recovers from poisoned mutexes
by calling `poison.into_inner()` and issuing a best-effort `ROLLBACK` on the
recovered connection. The previous `.expect("dashboard storage mutex
poisoned")` would turn any panic inside a storage operation into an app-wide
crash on the next caller.

The defensive `ROLLBACK` is there because the panicking holder may have left
a transaction open. If no transaction is active, SQLite returns
`cannot rollback - no transaction`; we ignore that error on purpose.

This is a tradeoff. Poison recovery prefers "potentially-inconsistent
database" over "guaranteed crash". For KKTerm's local-first storage, the
trade favors keeping the app responsive. The dashboard tables are
recoverable from settings export; the connections table is the only critical
data, and panicking dashboard commands cannot reach it.

### 10. AI prompt guardrails

The `dashboard_create_widget` tool description now contains explicit
guidance:

- Always check boundary collisions against arena edges (top, bottom, left,
  right). Collision functions that only check filled cells but not the floor
  cause silent resource drains.
- Every `requestAnimationFrame` callback must check a stop/pause/game-over
  state at the top so the loop can terminate.
- Declared libraries must actually be referenced in source.

Prompt guidance is the least reliable layer — models do not always obey — so
it is positioned as the *first* line of defense. The validator catches what
the prompt missed.

## Consequences

**Positive**

- Validation runs at the layer where the AI's mistake is cheapest to reject
  (before SQLite write). Bad widgets never reach the renderer.
- Source validation uses a real JavaScript parser (oxc). Parser diagnostics
  carry line and column coordinates the assistant can act on, so a malformed
  source produces a structured error rather than a vague "delimiter
  imbalance".
- The cap bounds the worst case: at most the configured number of script
  widget iframes can run at once, regardless of how many widgets exist on
  the Dashboard.
- Runtime health (`kk.ready`, `kk.runtimeError`, animation `kk.motionTick`)
  bubbles up into the AI assistant context payload as `unhealthyInstances`.
  The assistant notices a widget it just authored has failed to mount,
  thrown at runtime, or stalled its animation loop within one user turn
  rather than waiting for the user to scroll over and report it.
- A poisoned mutex no longer cascades into an app-wide crash.
- Dynamic backgrounds (e.g., Matrix) still run alongside the capped script
  widgets, but they are app-owned and well-bounded.

**Negative**

- The semantic prefilter is a heuristic. `${expr}` interpolation inside
  template literals is treated as part of the string, so a `while(true)`
  hidden there slips past the infinite-loop scan. The cap (§7) and
  visibility throttle (§8) bound the blast radius. Note that AST-based
  identifier collection (§2) *does* walk into interpolation expressions,
  so this limitation is specific to the infinite-loop pattern check.
- `KNOWN_LIBRARY_GLOBALS` must be kept in sync with the TypeScript catalog.
- The active-widget cap is process-wide, so it is shared across all
  Dashboards in one process. This is intentional for now (one WebView2
  renderer to protect), but multi-Dashboard users will eventually notice.
- Cooperative visibility throttling does nothing for widgets that don't call
  `KK.isVisible()`. The cap is the hard backstop.
- `widgetHealth` is in-memory only. Restarting the app loses any prior
  health record. Acceptable because the 2 s smoke test and live iframe
  both re-arm on every mount anyway.
- The animation stall watchdog catches "rAF callback exception swallowed";
  it does **not** catch "rAF still firing but the scene is visually
  frozen" — that needs a pixel-hash watchdog and is deferred.
- The htmlShim forbidden-tag scan is a token-boundary text match, not a
  full HTML parse. Pathological strings could in principle smuggle a
  forbidden tag past the scan, but the runtime CSP still blocks execution
  for `<script>`, `<iframe>`, `<object>`, and `<embed>`, so the scan is a
  feedback channel rather than the load-bearing defense.

**Neutral**

- `KK.isVisible()` is a new contract on the widget sandbox surface. Future
  hardening (e.g., automatic frame-rate cap when off-screen) can build on
  the same `setVisible` message channel.
- The validator and the cap are independent — adjusting either does not
  require touching the other.
- Network permission covers remote data and images, not remote script
  execution. Runtime CDN script injection stays blocked by CSP; new shared
  code should be added through the curated local library registry.

## Operational notes

- Debug script-widget rendering from the screen, not just from static source
  inspection. Animation, transparency, sizing, and iframe lifecycle bugs must
  be reproduced in an actual rendered iframe through the debug browser or the
  real Tauri/WebView2 runtime before calling them fixed. For animation bugs,
  instrument the iframe and record live `requestAnimationFrame`,
  `setInterval`, and visibility-message counts before and after the change.
  String-level tests are useful regression guards, but they are not proof that
  the browser is painting frames.
- Be careful with iterator snapshots inside iframe guardrails. `Map.entries()`
  and `Set` are iterators/iterables, not array-like objects; use `Array.from`
  before clearing or iterating them. The May 2026 frozen-clock regression came
  from using `Array.prototype.slice.call(_kkRafCallbacks.entries())`, which
  produced an empty callback list, cleared every pending rAF callback, and made
  clocks redraw on remount but never animate.
- Adding a new bundled library: update `KNOWN_LIBRARY_GLOBALS` in
  `src-tauri/src/dashboard_validation.rs` alongside
  `src/modules/dashboard/script/widgetLibraries.ts`. Without the Rust-side entry the
  unused-library check is silently skipped for that key.
- If the AI Assistant trips `Validation(UnusedLibrary)`, first check whether
  the tool boundary is still sanitizing structured bodies with
  `drop_unused_script_libraries`. The right fix is usually to remove unused
  declarations before validation, not to add a Dashboard widget error boundary,
  relax `validate_script_body_json_detailed`, or depend on more prompt text.
- Matter.js is the blessed bundled 2D physics library for script widgets.
  Its catalog key is `matter`, its global is `Matter`, and the AI contract
  requires generated physics widgets to declare `body.libraries: ["matter"]`
  instead of hand-rolling collision, gravity, or rigid-body integration.
  The same unused-library validation still applies: declaring `matter`
  without referencing `Matter` is rejected before persistence.
- Tightening the validator: source validation is now two-stage, so new
  tests live in two test groups inside `dashboard_validation.rs`:
  - **Semantic prefilter rules** (null bytes, infinite-loop tokens) belong
    next to the `validate_script_source_inner` / `strip_strings_and_comments`
    tests.
  - **Grammar and identifier-reference rules** belong next to the AST tests
    (`ast_rejects_*`, `ast_accepts_*`, `ast_detects_identifier_reference_*`).
    Use whole-body JSON through `validate_script_body_json_detailed` so the
    test exercises the same IIFE-wrap and error-path coordinates that the
    real assistant sees.
  - Every new rejection rule must come with both a positive and a negative
    test.
- Adjusting the AST wrap: source is wrapped in `(function(){ source })()`
  before parsing so a top-level `return` is legal — matching what the
  iframe actually executes via `injectScript('(function(){' + source +
  '\n})();', ...)` in `permissions.ts`. If the runtime wrapper changes
  shape, the validator's wrapper and the line-offset correction in
  `map_offset_to_line_col` must change in lockstep, or assistant-facing
  parse errors will point one line off.
- Tuning the motion watchdog: `SCRIPT_WIDGET_MOTION_STALL_MS` (8 s),
  `SCRIPT_WIDGET_MOTION_POLL_MS` (3 s), and the iframe-side
  `KK_MOTION_TICK_MIN_MS` (500 ms) in `ScriptWidgetHost.tsx` /
  `permissions.ts` together set the false-positive vs. detection-latency
  trade-off. Lower stall threshold = faster detection but more false
  positives during GC pauses; lower tick interval = lower latency but
  more bridge traffic per frame loop. Change them together.
- Adding a new lifecycle kind: extend `ScriptLifecycleKind` (Rust),
  `ScriptLifecycleKind` (TypeScript in `src/modules/dashboard/types.ts`), and the
  schema check in `src/modules/dashboard/schema.ts::validateScriptWidgetBody`.
  A kind without a host-side invariant is allowed (current behavior for
  `realtime` and `periodic`), but document the intended invariant in this
  ADR and in the `ScriptLifecycle` Rust doc comment before users start
  declaring it.
- Adding or relaxing an htmlShim forbidden tag: edit
  `HTML_SHIM_FORBIDDEN_TAGS` in `dashboard_validation.rs`. Removing a tag
  weakens the structured-error feedback to the assistant; the CSP defense
  remains, so the user-visible effect is "the AI gets a confusing silent
  no-op at render time" rather than a clean parse error.
- Adjusting the active-widget cap: the user-facing knob is Settings →
  Dashboard → Performance → Active script widgets cap. Changing the
  default value or hard ceiling requires editing both
  `default_max_active_script_widgets()` /
  `MAX_ACTIVE_SCRIPT_WIDGETS_LIMIT` in `src-tauri/src/storage.rs` and the
  matching `MAX_ACTIVE_SCRIPT_WIDGETS_DEFAULT` / `_LIMIT` / `_MIN`
  constants in `src/app-defaults.ts`. Both halves must move together —
  the Rust validator is the source of truth at write time, the TS
  constants drive the input's `min`/`max` clamp at edit time. Raising the
  ceiling without testing on a low-end Windows machine risks
  reintroducing the freeze.
