// IT Ops Module frontend store. Phase 1 owns durable Fleets: a thin cache
// over the itops_* Tauri commands so the rail badge, the Fleets tab, and
// any dialog share one source of truth and update live after a mutation without
// a full reload. Live Batch Run / Automation state arrives in later phases.

import { create } from "zustand";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import type {
  Automation,
  AutomationAction,
  AutomationTestResult,
  BatchTask,
  Fleet,
  FleetFilter,
  ItopsTransport,
  Rack,
  RackItemKind,
  RackItemMetadata,
  ResolvedHost,
  RunEvent,
  RunHistoryEntry,
  RunScope,
} from "../../types";
import type { WatchdogConfig } from "../../watchdog/types";

export interface FleetInput {
  name: string;
  memberIds: string[];
  filter: FleetFilter | null;
  transport: ItopsTransport;
}

export interface RackInput {
  name: string;
  region: string;
  datacenter: string;
  serverRoom: string;
  shell?: string | null;
  heightU: number;
}

export interface PlaceItemInput {
  rackId: string;
  connectionId: string | null;
  kind: RackItemKind;
  label: string;
  startU: number;
  heightU: number;
  metadata?: RackItemMetadata;
}

export interface UpdateItemInput {
  id: string;
  kind: RackItemKind;
  connectionId: string | null;
  label: string;
  metadata?: RackItemMetadata;
}

export type LiveRunHostStatus = "pending" | "running" | "ok" | "failed";

export interface LiveRunHost {
  connectionId: string;
  name: string;
  host: string;
  transport: ItopsTransport;
  status: LiveRunHostStatus;
  exitCode?: number | null;
  output?: string;
  durationMs?: number;
  error?: string | null;
}

export interface LiveRun {
  runId: string;
  fleetId?: string | null;
  taskSummary: string;
  hosts: LiveRunHost[];
  state: "running" | "done" | "canceled";
}

const MAX_LIVE_OUTPUT = 256 * 1024;

function appendLiveOutput(current: string, chunk: string): string {
  if (current.length >= MAX_LIVE_OUTPUT) return current;
  return (current + chunk).slice(0, MAX_LIVE_OUTPUT);
}

// Fold a streamed `itops://run` event into the live run snapshot. Events for a
// stale run id are ignored so a new run cleanly supersedes the previous one.
function reduceRun(run: LiveRun | null, event: RunEvent): LiveRun | null {
  switch (event.kind) {
    case "started":
      return {
        runId: event.runId,
        fleetId: event.fleetId,
        taskSummary: event.taskSummary,
        hosts: event.hosts.map((host) => ({ ...host, status: "pending" as const })),
        state: "running",
      };
    case "hostStarted":
      if (!run || run.runId !== event.runId) return run;
      return {
        ...run,
        hosts: run.hosts.map((host) =>
          host.connectionId === event.connectionId
            ? { ...host, status: "running", output: "" }
            : host,
        ),
      };
    case "hostOutput":
      if (!run || run.runId !== event.runId) return run;
      return {
        ...run,
        hosts: run.hosts.map((host) =>
          host.connectionId === event.connectionId
            ? { ...host, output: appendLiveOutput(host.output ?? "", event.chunk) }
            : host,
        ),
      };
    case "hostFinished":
      if (!run || run.runId !== event.runId) return run;
      return {
        ...run,
        hosts: run.hosts.map((host) =>
          host.connectionId === event.connectionId
            ? {
                ...host,
                status: event.ok ? "ok" : "failed",
                exitCode: event.exitCode,
                // The final event carries the authoritative full output, but on a
                // timeout/transport error it is empty — keep what already streamed
                // so a host that printed output before timing out doesn't blank.
                output: event.output
                  ? appendLiveOutput("", event.output)
                  : host.output,
                durationMs: event.durationMs,
                error: event.error,
              }
            : host,
        ),
      };
    case "finished": {
      if (!run || run.runId !== event.runId) return run;
      // Reconcile every host from the authoritative final report. Per-host
      // `hostFinished` events can be dropped or arrive out of order relative to
      // `started` (they originate on different threads), which would otherwise
      // leave a host stuck at "pending"/"running" and the tally reading 0. The
      // report is the same blob persisted to run history, so folding it in makes
      // the live view match what a relaunch would show.
      const byId = new Map(event.report.hosts.map((host) => [host.connectionId, host]));
      return {
        ...run,
        state: "done",
        hosts: run.hosts.map((host) => {
          const report = byId.get(host.connectionId);
          if (!report) return host;
          return {
            ...host,
            status: report.ok ? "ok" : "failed",
            exitCode: report.exitCode,
            output: report.output ? appendLiveOutput("", report.output) : host.output,
            durationMs: report.durationMs,
            error: report.error,
          };
        }),
      };
    }
    case "canceled":
      if (!run || run.runId !== event.runId) return run;
      return { ...run, state: "canceled" };
    default:
      return run;
  }
}

interface ItOpsState {
  fleets: Fleet[];
  loaded: boolean;
  loading: boolean;
  /** Bumped when the module header's "New Fleet" button is pressed so the
   *  Fleets tab (which owns the dialog + selection) opens the create flow. */
  newGroupRequest: number;
  requestNewFleet: () => void;
  loadFleets: () => Promise<void>;
  createFleet: (input: FleetInput) => Promise<Fleet>;
  updateFleet: (id: string, input: FleetInput) => Promise<Fleet>;
  removeFleet: (id: string) => Promise<void>;
  resolveFleet: (id: string) => Promise<ResolvedHost[]>;

  // ── Fleet topology / Rack View (docs/FLEET.md Phase C) ──
  /** Racks per Fleet id, hydrated with their items. Loaded on demand. */
  racksByFleet: Record<string, Rack[]>;
  loadRacks: (fleetId: string) => Promise<void>;
  createRack: (fleetId: string, input: RackInput) => Promise<void>;
  updateRack: (fleetId: string, id: string, input: RackInput) => Promise<void>;
  deleteRack: (fleetId: string, id: string) => Promise<void>;
  placeRackItem: (fleetId: string, input: PlaceItemInput) => Promise<void>;
  updateRackItem: (fleetId: string, input: UpdateItemInput) => Promise<void>;
  moveRackItem: (
    fleetId: string,
    input: { id: string; rackId: string; startU: number; heightU: number },
  ) => Promise<void>;
  removeRackItem: (fleetId: string, id: string) => Promise<void>;

  // ── Batch Runs (Phase 2) ──
  activeRun: LiveRun | null;
  runHistory: RunHistoryEntry[];
  historyLoaded: boolean;
  /** Bumped to open the Batch Run launcher; pendingRunGroupId preselects a group. */
  newRunRequest: number;
  pendingRunGroupId: string | null;
  /** Optional rack/area/region scope carried into the launcher for a scoped run. */
  pendingRunScope: RunScope | null;
  requestNewBatchRun: (fleetId?: string, scope?: RunScope) => void;
  applyRunEvent: (event: RunEvent) => void;
  startBatchRun: (fleetId: string, task: BatchTask, scope?: RunScope | null) => Promise<string>;
  cancelRun: (runId: string) => Promise<void>;
  loadRunHistory: () => Promise<void>;

  // ── Automations (Phase 3) ──
  automations: Automation[];
  automationsLoaded: boolean;
  newAutomationRequest: number;
  requestNewAutomation: () => void;
  loadAutomations: () => Promise<void>;
  createAutomation: (
    name: string,
    config: WatchdogConfig,
    actions: AutomationAction[],
    enabled: boolean,
  ) => Promise<Automation>;
  updateAutomation: (
    id: string,
    name: string,
    config: WatchdogConfig,
    actions: AutomationAction[],
  ) => Promise<Automation>;
  setAutomationEnabled: (id: string, enabled: boolean) => Promise<void>;
  removeAutomation: (id: string) => Promise<void>;
  testAutomation: (config: WatchdogConfig) => Promise<AutomationTestResult>;
}

export const useItOpsStore = create<ItOpsState>((set, get) => ({
  fleets: [],
  loaded: false,
  loading: false,
  newGroupRequest: 0,

  requestNewFleet() {
    set({ newGroupRequest: get().newGroupRequest + 1 });
  },

  async loadFleets() {
    if (!isTauriRuntime()) {
      set({ loaded: true });
      return;
    }
    set({ loading: true });
    try {
      const fleets = await invokeCommand("itops_list_fleets");
      set({ fleets, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  async createFleet(input) {
    const created = await invokeCommand("itops_create_fleet", {
      name: input.name,
      memberIds: input.memberIds,
      filter: input.filter,
      transport: input.transport,
    });
    set({ fleets: [...get().fleets, created] });
    return created;
  },

  async updateFleet(id, input) {
    const updated = await invokeCommand("itops_update_fleet", {
      id,
      name: input.name,
      memberIds: input.memberIds,
      filter: input.filter,
      transport: input.transport,
    });
    set({
      fleets: get().fleets.map((group) => (group.id === id ? updated : group)),
    });
    return updated;
  },

  async removeFleet(id) {
    await invokeCommand("itops_remove_fleet", { id });
    set({ fleets: get().fleets.filter((group) => group.id !== id) });
  },

  async resolveFleet(id) {
    if (!isTauriRuntime()) {
      return [];
    }
    return invokeCommand("itops_resolve_fleet", { id });
  },

  // ── Fleet topology / Rack View ──
  racksByFleet: {},

  async loadRacks(fleetId) {
    if (!isTauriRuntime()) {
      set({ racksByFleet: { ...get().racksByFleet, [fleetId]: [] } });
      return;
    }
    const racks = await invokeCommand("itops_list_racks", { fleetId });
    set({ racksByFleet: { ...get().racksByFleet, [fleetId]: racks } });
  },

  async createRack(fleetId, input) {
    await invokeCommand("itops_create_rack", { fleetId, ...input });
    await get().loadRacks(fleetId);
  },

  async updateRack(fleetId, id, input) {
    await invokeCommand("itops_update_rack", { id, ...input });
    await get().loadRacks(fleetId);
  },

  async deleteRack(fleetId, id) {
    await invokeCommand("itops_delete_rack", { id });
    await get().loadRacks(fleetId);
  },

  async placeRackItem(fleetId, input) {
    await invokeCommand("itops_place_rack_item", input);
    await get().loadRacks(fleetId);
  },

  async updateRackItem(fleetId, input) {
    await invokeCommand("itops_update_rack_item", input);
    await get().loadRacks(fleetId);
  },

  async moveRackItem(fleetId, input) {
    await invokeCommand("itops_move_rack_item", input);
    await get().loadRacks(fleetId);
  },

  async removeRackItem(fleetId, id) {
    await invokeCommand("itops_remove_rack_item", { id });
    await get().loadRacks(fleetId);
  },

  // ── Batch Runs ──
  activeRun: null,
  runHistory: [],
  historyLoaded: false,
  newRunRequest: 0,
  pendingRunGroupId: null,
  pendingRunScope: null,

  requestNewBatchRun(fleetId, scope) {
    set({
      newRunRequest: get().newRunRequest + 1,
      pendingRunGroupId: fleetId ?? null,
      pendingRunScope: scope ?? null,
    });
  },

  applyRunEvent(event) {
    set({ activeRun: reduceRun(get().activeRun, event) });
    if (event.kind === "finished" || event.kind === "canceled") {
      void get().loadRunHistory();
    }
  },

  async startBatchRun(fleetId, task, scope) {
    // The Started event populates activeRun; clear any prior run first so the
    // grid does not briefly show stale hosts.
    set({ activeRun: null });
    return invokeCommand("itops_start_batch_run", { fleetId, task, scope: scope ?? null });
  },

  async cancelRun(runId) {
    if (!isTauriRuntime()) {
      return;
    }
    await invokeCommand("itops_cancel_batch_run", { runId });
  },

  async loadRunHistory() {
    if (!isTauriRuntime()) {
      set({ historyLoaded: true });
      return;
    }
    const runHistory = await invokeCommand("itops_list_run_history", { limit: 25 });
    set({ runHistory, historyLoaded: true });
  },

  // ── Automations ──
  automations: [],
  automationsLoaded: false,
  newAutomationRequest: 0,

  requestNewAutomation() {
    set({ newAutomationRequest: get().newAutomationRequest + 1 });
  },

  async loadAutomations() {
    if (!isTauriRuntime()) {
      set({ automationsLoaded: true });
      return;
    }
    const automations = await invokeCommand("itops_list_automations");
    set({ automations, automationsLoaded: true });
  },

  async createAutomation(name, config, actions, enabled) {
    const created = await invokeCommand("itops_create_automation", {
      name,
      config,
      actions,
      enabled,
    });
    set({ automations: [...get().automations, created] });
    return created;
  },

  async updateAutomation(id, name, config, actions) {
    const updated = await invokeCommand("itops_update_automation", { id, name, config, actions });
    set({
      automations: get().automations.map((automation) =>
        automation.id === id ? updated : automation,
      ),
    });
    return updated;
  },

  async setAutomationEnabled(id, enabled) {
    const updated = await invokeCommand("itops_set_automation_enabled", { id, enabled });
    set({
      automations: get().automations.map((automation) =>
        automation.id === id ? updated : automation,
      ),
    });
  },

  async removeAutomation(id) {
    await invokeCommand("itops_remove_automation", { id });
    set({ automations: get().automations.filter((automation) => automation.id !== id) });
  },

  async testAutomation(config) {
    return invokeCommand("itops_test_automation", { config });
  },
}));
