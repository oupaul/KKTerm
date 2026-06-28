# Fleet Management — Design & Implementation Plan

Status: **Phases A–D landed** (rename, rack data model, Fleet View / Server Room
View / Rack View with the dialogs-first editor, click-to-connect with ghost
handling, Server Room / Rack scoped Batch Runs, drag-to-place, plus rack
page-context awareness and accent colour-coding). Remaining: the approval-gated "draft a rack layout" assistant
tool (+ `itops-changed` live reload), selective export/import inclusion, and
drag-resize polish — each best done with the desktop app running to verify.
This document is the detailed plan and current product terminology for IT Ops
**Fleet** management with a visual virtual-datacenter (rack elevation) layer.
It extends `docs/ITOPS.md`
(which remains the source of truth for shipped IT Ops architecture) and follows
the same durable-vs-live split. When this doc conflicts with `docs/ITOPS.md`
for Fleet-internal concerns, this doc wins; for everything else `docs/ITOPS.md`
and `docs/ARCHITECTURE.md` win.

## Summary

The IT Ops Module now opens directly into **Fleets**: durable named selections
of Connections that can also be arranged as a visible topology. This work does
two things:

1. **Renames Host Group → Fleet** across the product (term, code, schema, i18n,
   docs). A Fleet keeps the same batch-target role.
2. **Adds a virtual-datacenter layer**: each Fleet can be arranged as one or
   more **Racks** grouped by **Server Room**, drawn as realistic 42U
   **rack elevations**. A rack holds **Rack Devices** — either a placed
   **Connection** (clickable to open ssh/rdp/vnc/etc.) or a **passive item**
   (switch, PDU, patch panel, blank filler, label) for a faithful picture.

The payoff: IT Ops stops being a list you configure and becomes a fleet you
*see and operate* — open a host by clicking its slot, or run a Batch Run on a
whole Server Room or Rack.

## Decisions (resolved with the product owner)

| Fork | Decision | Consequence |
| --- | --- | --- |
| Topology scope | **Per-Fleet topology** | Racks belong to a Fleet and are grouped by Server Room. The same Connection may be placed in multiple Fleets' racks. Placement is stored per `(rack, device)`, never globally on the Connection. |
| Rack contents | **Connections + passive Rack Devices** | A Rack Device either references a Connection id (openable) or is a standalone passive device (switch/PDU/patch panel/blank/label). |
| Visual fidelity | **Full rack elevation** | Fixed-height rack (default 42U), each Rack Device has a `start_u` and `height_u` (1U/2U/4U...), empty slots are visible, drag-to-place. |

These three are deliberately the durable-data-model forks; everything below
builds on them.

## Why this stays inside IT Ops (not a new Module)

A Fleet is the renamed Host Group plus a visual arrangement of the same
Connections. Batch Runs and Automation `runBatch` target a Fleet
by id; adding a topology layer keeps that wiring
intact. The rack view is a new *visualization and launch surface* over the
existing fleet-targeting model — not a new execution model. No new rail Module.

## Terminology

Replaces the **Host Group** entry in `CONTEXT.md`; adds the rest. Follows the
`_Avoid_` convention.

- **Fleets** — the IT Ops collection and left-column navigator for Fleet
  records. It is plural UI, not a separate durable entity. The visible Module
  currently opens directly into this Fleet topology surface.
- **Fleet** — a durable, named selection of existing Connections (plus an
  optional dynamic filter by type/folder) used as the target for Batch Runs and
  Automation `runBatch` actions, and optionally arranged into a virtual
  datacenter of Racks. Stored in `itops_fleets`. References Connection ids;
  owns no Session and no secret. It is not a Connection type. _Avoid_: host
  group, inventory, host list, connection group (as a Connection type).
- **Fleet View** — the top-level right-side view for one selected Fleet. It
  shows the Fleet's Server Rooms as cards and is the entry point into the
  topology drill-down. _Avoid_: members view, list mode.
- **Server Room** — a plain-text grouping tag on a Rack (e.g. "Room B"). It
  nests the Fleets tree and scopes a Batch Run; blank server rooms group under
  "Unassigned". Plain text, not a first-class database entity. (Replaces the
  retired Region/Datacenter/Area tags.) _Avoid_: zone, site object,
  datacenter entity.
- **Server Room View** — the drill-down view for one Server Room. It shows the
  room's Racks, optionally grouped by each Rack's `rack_group` tag. _Avoid_:
  area view, region view.
- **Rack** — a durable, fixed-height (default 42U) cabinet that belongs to one
  Fleet, grouped by **Server Room** (topology Fleet → Server Room → Rack), with
  an optional **shell** finish (black/white/grey). Holds Rack Devices at U
  positions. Stored in `itops_fleet_racks`. _Avoid_: cabinet group, shelf.
- **Rack View** — the single-Rack drill-down stage. It centers one rack
  elevation with per-device balloon callouts and is the place where a user
  opens or edits a Rack Device. _Avoid_: floor plan, topology graph.
- **Rack Device** — one device occupying a contiguous
  `start_u..start_u+height_u` span in a Rack. Either **Connection-backed**
  (carries a `connection_id`, clickable to open its Session) or **passive** (a
  switch, PDU, patch panel, blank filler, or label — inventory/visual only, not
  openable). Stored in `itops_fleet_rack_items`; code and schema may still use
  the older `RackItem` / Rack Item names. _Avoid_: slot, node, host card.
- **Rack Device Type** — the finite visual/device kind for a Rack Device:
  connection, server, storage, switch, router, firewall, PDU, UPS, KVM, patch
  panel, equipment, general, blank, or label. It controls faceplate rendering
  and editing fields; it is not a Connection type.
- **Rack Device Properties** — non-secret presentation metadata for a Rack
  Device: label, status, accent, notes, ports, disks, battery, load, icon, and
  placement. Never store credentials or live Session state here.

`Watchdog`, `Automation`, `Batch Run`, `Playbook`, `Transport` are unchanged.

## Data Model

Mirrors `src-tauri/src/itops/storage.rs` conventions: free functions over
`&SqliteConnection`, JSON `TEXT` for non-relational fields, integer
`sort_order`, idempotent `CREATE TABLE IF NOT EXISTS` appended to
`CURRENT_SCHEMA`, schema bump via `PRAGMA user_version`.

### Schema migration (bump `SCHEMA_USER_VERSION` 33 → 34)

The migration has two parts and must be additive + reversible-safe per the
existing migration style in `src-tauri/src/storage.rs`:

1. **Rename `itops_host_groups` → `itops_fleets`.** SQLite supports
   `ALTER TABLE itops_host_groups RENAME TO itops_fleets;` guarded by an
   existence check (only run when the old table exists and the new one does
   not). The column shape is unchanged. `itops_run_history.host_group_id` is a
   **soft reference** (no FK) so renaming the table does not require touching
   run history rows; the column itself is renamed in step 2 for clarity.
2. **Rename soft-reference columns** for naming consistency:
   `itops_run_history.host_group_id → fleet_id`
   (`ALTER TABLE … RENAME COLUMN`, guarded). The `idx_itops_run_history_source`
   index is unaffected (it indexes `source, started_at`).
3. **Add the two new topology tables** (below).

`CURRENT_SCHEMA` is updated so fresh installs create `itops_fleets` and the new
tables directly; the rename branch only runs for upgrades. Add a focused
migration test mirroring the existing storage tests.

```sql
-- A Rack belongs to one Fleet; grouped by server_room (Fleet → Server Room →
-- Rack). The legacy region/datacenter/area columns are retired in place.
CREATE TABLE IF NOT EXISTS itops_fleet_racks (
    id          TEXT PRIMARY KEY,
    fleet_id    TEXT NOT NULL REFERENCES itops_fleets(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,           -- e.g. "A12"
    server_room TEXT NOT NULL DEFAULT '',
    shell       TEXT,                    -- cabinet finish: black|white|grey
    height_u    INTEGER NOT NULL DEFAULT 42,
    sort_order  INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_itops_fleet_racks_fleet
    ON itops_fleet_racks(fleet_id, sort_order);

-- One device occupying a contiguous U span in a Rack. Connection-backed when
-- connection_id is set; passive otherwise. connection_id is a SOFT reference
-- (no FK): a placed host whose Connection is later deleted becomes a "ghost"
-- item the UI flags, rather than silently vanishing the rack layout.
CREATE TABLE IF NOT EXISTS itops_fleet_rack_items (
    id            TEXT PRIMARY KEY,
    rack_id       TEXT NOT NULL REFERENCES itops_fleet_racks(id) ON DELETE CASCADE,
    -- Soft ref to connections.id; NULL for passive items.
    connection_id TEXT,
    -- 'connection' | 'switch' | 'pdu' | 'patchPanel' | 'blank' | 'label' |
    -- 'server' | 'storage' | 'router' | 'firewall' | 'ups' | 'kvm' |
    -- 'equipment' | 'general' — each kind paints its own animated faceplate.
    kind          TEXT NOT NULL,
    -- Display label (passive items, or an override for a connection item).
    label         TEXT NOT NULL DEFAULT '',
    start_u       INTEGER NOT NULL,        -- bottom-most U occupied (1-based)
    height_u      INTEGER NOT NULL DEFAULT 1,
    -- Presentation only: accent color, icon, notes, plus faceplate fields
    -- (status, ports, disks, battery, load). No secrets, no live state.
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_itops_fleet_rack_items_rack
    ON itops_fleet_rack_items(rack_id, start_u);
```

The `itops_fleets` table keeps the current Host Group columns verbatim
(`id, name, sort_order, member_ids_json, filter_json, transport, ...`). Racks and
items are **additive** — a Fleet with no racks behaves exactly like today's
flat Fleet target.

### Overlap / validation rule

A rack item must not overlap another item's U span in the same rack, and must
fit within `1..=height_u`. Validate in `itops/fleet_storage.rs` on
insert/update (pure helper, unit-tested) and re-check in the UI before a
drag-drop commit. This is the one new non-trivial invariant; keep it in a small
pure function (`fn overlaps(existing: &[Span], candidate: Span) -> bool`) so it
is testable without a DB.

### Rust types (`src-tauri/src/itops/types.rs`)

Rename `HostGroup → Fleet`, `HostGroupFilter → FleetFilter` (serde
`rename_all = "camelCase"` is unchanged, so the wire shape only changes field
names that reference the group). Add:

```rust
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Rack {
    pub id: String,
    pub fleet_id: String,
    pub name: String,
    pub server_room: String,
    pub shell: Option<String>, // cabinet finish: black|white|grey
    pub height_u: u32,         // default 42
    pub sort_order: i64,
    pub items: Vec<RackItem>,  // hydrated on read
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RackItemKind {
    Connection, Switch, Pdu, PatchPanel, Blank, Label, Server,
    Storage, Router, Firewall, Ups, Kvm, Equipment, General,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RackItem {
    pub id: String,
    pub rack_id: String,
    pub connection_id: Option<String>, // None = passive
    pub kind: RackItemKind,
    pub label: String,
    pub start_u: u32,
    pub height_u: u32,
    #[serde(default)]
    pub metadata: RackItemMetadata,   // accent, icon, notes, status, ports, disks, battery, load
}
```

`AutomationAction::RunBatch { host_group_id, task }` is renamed to
`fleet_id` (the serde field rename is a coordinated frontend change — see
Phase A). `Automation`, `BatchTask`, `PlaybookStep`, `Transport`,
`ResolvedHost` are otherwise unchanged.

### Fleet resolution semantics (batch targeting)

`resolve_host_group` becomes `resolve_fleet`. A Fleet resolves to an ordered,
deduplicated `Vec<ResolvedHost>` from the union of:

1. explicit `member_ids` (stored order, skipping deleted Connections), then
2. **placed Connection-backed rack items** not already included (rack
   `sort_order`, then `start_u` descending — top-of-rack first), then
3. dynamic `filter` matches not already included.

So placing a host in a rack automatically makes it a batch target, and a Fleet
with no racks resolves exactly as a flat Fleet does. A new
`resolve_fleet_scoped(fleet, scope)` variant accepts an optional
`{ serverRoom?, rackId? }` scope so the Rack View can launch a Batch Run on
one Server Room or Rack (Phase D).

## Backend changes

- **`src-tauri/src/itops/storage.rs`** → rename Host Group repo functions to
  `*_fleet`; keep the resolver here. Add the placed-item union to `resolve_fleet`.
- **New `src-tauri/src/itops/fleet_storage.rs`** → CRUD + reorder for racks and
  rack items, plus the pure overlap/fit validator. Mirrors `dashboard_storage.rs`.
- **`src-tauri/src/itops/commands.rs`** → rename existing host-group commands
  (`itops_create_host_group` → `itops_create_fleet`, etc.; keep parameter
  shapes), add rack/item commands:
  `itops_list_racks(fleetId)`, `itops_create_rack`, `itops_update_rack`,
  `itops_delete_rack`, `itops_reorder_racks`,
  `itops_place_rack_item`, `itops_update_rack_item`, `itops_move_rack_item`
  (rack_id + start_u, validated), `itops_remove_rack_item`. Register in
  `generate_handler!` (`src-tauri/src/lib.rs`).
- **`itops_start_batch_run`** gains an optional `scope` arg for Server Room /
  Rack
  runs; default (no scope) is unchanged.
- **`src-tauri/src/itops/run_storage.rs`** → `host_group_id` field → `fleet_id`.
- **`src-tauri/src/itops/actions.rs`** → `RunBatch` reads `fleet_id`.
- Emit the existing `itops-changed` event on any fleet/rack mutation so the
  store reloads (mirrors `dashboard-changed`).

All DB work stays on `spawn_blocking`/the command runtime per
`docs/ARCHITECTURE.md`; no blocking on the UI/native thread.

## Frontend changes

`src/modules/itops/` (rename files: `HostGroupsTab.tsx → FleetsTab.tsx`,
`HostGroupDialog.tsx → FleetDialog.tsx`; update `state.ts`, `ItOpsModule.tsx`,
`BatchRunsTab.tsx`, `AutomationEditor.tsx`, `BatchRunDialog.tsx`, `icons.tsx`,
`itops.css`). Wire-level renames in `src/types.ts`, `src/lib/tauri.ts`
(`hostGroupId → fleetId`).

### Fleet topology layout

The visible IT Ops Module opens directly into the Fleet topology surface:

- **Fleets tree** — the left column contains the Module title/icon and the
  searchable Fleet → Server Room → Rack navigator. The whole column is
  resizable, and the IT Ops title-bar Fleets button hides or shows it. Width
  and hidden state persist.
- **Fleet View** — selecting a Fleet shows Server Room cards.
- **Server Room View** — selecting a Server Room shows its Racks, optionally
  grouped by each Rack's `rack_group` tag.
- **Rack View** — selecting a Rack centers its front elevation and Rack Device
  properties/placement interactions.

Batch Runs and Automations remain part of IT Ops, but their top-level
management tab chrome is hidden while the Fleet-only UI is active.

### Rack elevation component (`RackElevation.tsx`)

- Renders a fixed `height_u` column of U slots (U-number gutter on the left,
  numbered top-down as real racks are). Pure SVG/flex/CSS — **no new heavy
  dependency**; reuse design tokens from `src/styles/colorSchemes.css`
  (never hard-code hex, per `AGENTS.md`/`docs/DESIGN_LANGUAGE.md`).
- Each Rack Device is a block spanning its U range, showing icon + label +
  (for Connection items) a live status dot reusing the existing connection
  status source. Empty U slots are visible, drop-targetable, and faintly ruled.
- **Drag-to-place / move / resize** with the overlap validator gating commits;
  invalid drops show the standard `showStatusBarNotice` warning tone (no inline
  toast — High-Risk Invariant). Persist via `itops_move_rack_item` /
  `itops_update_rack_item`.
- **Click a Connection-backed item → open its Session** by reusing
  `useWorkspaceStore().openConnection(connection)` (`src/store.ts:1651`) — the
  exact path the Connection Tree uses. This requires the Rack View to have the
  full `Connection` objects for placed items; load them from the existing
  connections store/selector by id (the Fleet store currently only holds
  `ResolvedHost` summaries — add a placed-connection hydration selector).
  Passive items are not clickable to connect; they open an edit popover.
- **Ghost items**: a Connection-backed item whose `connection_id` no longer
  resolves renders dimmed with a "missing Connection" badge and an unplace
  action — never a crash or a silent disappearance.

### Editing affordances

- "Add Rack" (name, server_room, shell, height_u) and "Add Item" (choose a Fleet
  member Connection, or a passive device kind) via dialogs built from
  `src/app/ui/dialog` primitives, footer order per host platform
  (`docs/DESIGN_LANGUAGE.md`).
- Right-click a rack item → native context menu (`src/lib/nativeContextMenu.ts`)
  with Open / Open in New Tab / Edit / Unplace / Run task on this rack.
- A Rack-scoped "Run task" and Server Room-scoped run feed
  `itops_start_batch_run` with the matching `scope`.

## Click-to-connect across Connection kinds

`openConnection` already dispatches by Connection `type` (ssh terminal, rdp,
vnc, url, ftp, …), so the Rack View gets ssh/rdp/vnc/ftp/url launch for free by
delegating to it. No kind-specific launch code lives in IT Ops. SFTP-vs-SSH and
RDP/VNC native-surface invariants are the workspace layer's concern and are not
re-implemented here.

## AI Assistant integration

Extend the existing approval-gated IT Ops tools (`docs/ITOPS.md` → "AI Assistant
integration"):

- The page-context projection gains compact rack metadata: per Fleet, the rack
  count and Server Room names (never device-level detail, no secrets).
- New mutating tools (approval-gated) let the assistant **draft a rack layout**
  from a Fleet's members — e.g. "arrange my prod-web Fleet into two racks by
  row." Mutations emit `itops-changed`. The assistant cannot open a Session or
  run a fleet task without the existing approval flow.

## Export / import (ADR 0010)

Fleets already participate in selective export/import as non-secret metadata.
Add `itops_fleet_racks` and `itops_fleet_rack_items` to the same shape (pure
metadata; `connection_id` is a soft ref, so import tolerates missing
Connections by importing ghost items the user can re-bind). No secret ever
enters the export.

## i18n

- Rename the `itops` namespace keys that say "host group" → "fleet"
  (`itops.tabs.groups → itops.tabs.fleets`, `itops.hostGroups.* →
  itops.fleets.*`, `itops.batchRuns.hostGroupLabel → fleetLabel`, etc.).
  English keys change first in `src/i18n/locales/en.json`; every change follows
  `docs/localization_todo/README.md` (one pending file per new/changed key if
  translations don't land in the same change).
- Add new keys for Fleet View, Server Room View, Rack View, passive item kinds, drag/overlap
  warnings, and the new dialogs.
- **zh-TW gate**: use Taiwan terminology (e.g. 機櫃 for rack, 機房 for
  datacenter) — never Mainland terms; never convert from `zh-CN.json`. See
  `AGENTS.md` and `docs/manual/16-localization.md`.

## Docs, manual, tutorial

- **`CONTEXT.md`** — replace the Host Group entry with Fleet; add Fleets,
  Fleet View, Server Room, Server Room View, Rack, Rack View, Rack Device,
  Rack Device Type, and Rack Device Properties terms; update the IT Ops Module entry and any
  "Host Group" mentions (3 refs today).
- **`docs/ITOPS.md`** — update the renamed term and add a "Fleet topology" note
  pointing here.
- **`docs/manual/12-it-ops.md`** — keep the Fleet section aligned with Fleet +
  Rack View; reference i18n keys, not English labels; add grep hints and
  synonyms (rack, cabinet, datacenter, U position, region, area).
- **Tutorial** — if the Rack View is tutorial-capable, add a stable
  `data-tutorial-id`, a `src/app/tutorialNavigationModel.ts` entry, matching
  `tutorial_highlight` metadata in `src-tauri/src/ai.rs`, and manual grep hints;
  `npm run check` validates these mappings.
- **`docs/ADR/0011-it-ops-module.md`** and `docs/ROADMAP.md` — note the Fleet
  rename and the topology layer (ROADMAP "IT Ops Center" section).

## Phasing

Each phase is one reviewable PR and leaves the app shippable.

- **Phase A — Rename Host Group → Fleet (no behavior change). ✅ Landed.** Table rename
  migration (33→34, table + `fleet_id` column), Rust type/function renames,
  command renames, frontend file/identifier renames, i18n key renames + pending
  localization files, doc/`CONTEXT.md` updates. Pure rename; tests green.
- **Phase B — Rack topology data model. ✅ Landed.** Added `itops_fleet_racks` /
  `itops_fleet_rack_items` (schema 35), `fleet_storage.rs` CRUD + the pure
  overlap/fit validator + tests, and the rack/item commands
  (`itops_list_racks`, `itops_create_rack`, `itops_update_rack`,
  `itops_delete_rack`, `itops_reorder_racks`, `itops_place_rack_item`,
  `itops_update_rack_item`, `itops_move_rack_item`, `itops_remove_rack_item`),
  registered in `generate_handler!`. Frontend types + `tauri.ts` bindings added
  (no UI yet). **Deferred from this phase:** the `itops-changed` live-reload
  event (nothing emits or listens for it yet — wire it in Phase C with the store
  listener), and selective export/import inclusion (Fleets themselves are not in
  the ADR-0010 export shape yet; add racks when Fleets are added).
- **Phase C — Fleet topology (read + place).** _Landed:_ `RackElevation.tsx`
  (U-keyed CSS-grid front elevation), Fleet View → Server Room View → Rack View
  drill-down, the `racksByFleet` store loader + mutations, and the
  **dialogs-first editor** — add/edit/delete racks (`RackDialog`) and
  place/edit/move/remove devices (`RackItemDialog`): click an empty U to add,
  click an item to edit, with backend overlap/fit validation surfaced as a
  Status Bar error. _Drag-to-place landed:_ devices are draggable onto any U
  slot (restack within a rack or move across racks), re-validated by the
  backend; resize stays in the edit dialog (drag-resize is a later polish).
  Ghost-item handling landed in Phase D. _Still to come:_ the `itops-changed`
  reload listener (Phase E).
- **Phase D — Click-to-connect + scoped Batch Runs.** _Click-to-connect
  landed:_ a placed host opens its Session on click via a new
  `itops_get_connection(id)` command (hydrates the full Connection across any
  Workspace) handed to the existing `openConnection`; a pencil edits it. Items
  whose Connection no longer resolves to a Fleet member render as dimmed
  **ghosts** (not openable, still editable/removable). _Scoped Batch Runs
  landed:_ a `RunScope { rackId?, serverRoom? }` + `resolve_fleet_scoped`
  (storage) and an optional `scope` on `itops_start_batch_run`; per-rack and
  per-Server Room affordances launch a run over only the placed hosts in the
  matching racks, with the launcher showing a scope banner.
- **Phase E — AI + polish.** _Landed:_ rack-topology metadata in the IT Ops
  assistant page context (compact, loaded-Fleets only), per-device **accent**
  colour-coding (`RackItemMetadata.accent` via a Swatches picker, rendered as a
  left accent bar), and the manual Rack View section. _Still to come (each best
  done with the app running to verify):_ the approval-gated "draft a rack
  layout" assistant tool plus its `itops-changed` live-reload listener, and
  selective export/import inclusion (Fleets are not yet in the ADR-0010 export
  shape, so that lands Fleets + racks together). Drag-resize is a remaining
  visual polish on top of drag-to-place.

Phases A–C deliver the visible feature; D–E are independent and demand-ordered.

## Risks & open questions

- **Rename blast radius** (26 frontend files incl. 14 locales, 9 backend files,
  8 docs, the `itops_host_groups` table, and `host_group_id` columns/wire
  fields). Phase A isolates it so the topology work reviews cleanly on top.
- **Connection hydration in the Rack View** — the Fleet store holds
  `ResolvedHost` summaries, not full `Connection`s; click-to-connect needs the
  full object. Resolve via a selector over the existing connections store
  rather than widening `ResolvedHost`.
- **Server Room as text vs entity** — text is right for v1; promoting it to an
  orderable first-class row (for fixed ordering and per-room defaults) is a
  later additive change, not a rework.
- **Multi-Fleet placement** (chosen model) means a host can occupy slots in
  several Fleets — intended, but the UI should make a host's other placements
  discoverable so users don't think a host is "missing."

## Checks before handoff (per phase, per `AGENTS.md`)

`npm run check` && `npm run build` && `cargo check`/`cargo test`
(`--manifest-path src-tauri/Cargo.toml`). Native rack drag/drop, click-to-open
across ssh/rdp/vnc, and keychain-backed opens must be validated in the real
Tauri desktop runtime, not Vite/browser preview.
