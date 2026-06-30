// IT Ops Module frontend store. Phase 1 owns durable Sites: a thin cache
// over the itops_* Tauri commands so the rail badge, the Sites tab, and
// any dialog share one source of truth and update live after a mutation without
// a full reload. Live Batch Run / Automation state arrives in later phases.

import { create } from "zustand";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import type {
  Automation,
  AutomationAction,
  AutomationTestResult,
  BatchTask,
  Site,
  SiteFilter,
  ItopsTransport,
  Rack,
  RackItemKind,
  RackItemMetadata,
  ResolvedHost,
  RoomIconEntry,
  RunEvent,
  RunHistoryEntry,
  RunScope,
} from "../../types";
import type { DashboardBackground } from "../dashboard/types";
import type { WatchdogConfig } from "../../watchdog/types";

export interface SiteInput {
  name: string;
  memberIds: string[];
  filter: SiteFilter | null;
  transport: ItopsTransport;
  iconColor?: string | null;
  iconDataUrl?: string | null;
  iconBackgroundColor?: string | null;
}

export interface RackInput {
  name: string;
  serverRoom: string;
  rackGroup: string;
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
  siteId?: string | null;
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
        siteId: event.siteId,
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
  sites: Site[];
  loaded: boolean;
  loading: boolean;
  /** Bumped when the module header's "New Site" button is pressed so the
   *  Sites tab (which owns the dialog + selection) opens the create flow. */
  newGroupRequest: number;
  requestNewSite: () => void;
  loadSites: () => Promise<void>;
  createSite: (input: SiteInput) => Promise<Site>;
  updateSite: (id: string, input: SiteInput) => Promise<Site>;
  removeSite: (id: string) => Promise<void>;
  resolveSite: (id: string) => Promise<ResolvedHost[]>;

  // ── Site topology / Rack View (docs/SITE.md Phase C) ──
  /** Racks per Site id, hydrated with their items. Loaded on demand. */
  racksBySite: Record<string, Rack[]>;
  loadRacks: (siteId: string) => Promise<void>;
  createRack: (siteId: string, input: RackInput) => Promise<Rack>;
  updateRack: (siteId: string, id: string, input: RackInput) => Promise<void>;
  deleteRack: (siteId: string, id: string) => Promise<void>;
  setSiteBackground: (siteId: string, background: DashboardBackground | null) => Promise<void>;
  setServerRoomBackground: (
    siteId: string,
    serverRoom: string,
    background: DashboardBackground | null,
  ) => Promise<void>;
  setRoomIcon: (
    siteId: string,
    serverRoom: string,
    icon: RoomIconEntry | null,
  ) => Promise<void>;
  setRackBackground: (
    siteId: string,
    rackId: string,
    background: DashboardBackground | null,
  ) => Promise<void>;
  placeRackItem: (siteId: string, input: PlaceItemInput) => Promise<void>;
  updateRackItem: (siteId: string, input: UpdateItemInput) => Promise<void>;
  moveRackItem: (
    siteId: string,
    input: { id: string; rackId: string; startU: number; heightU: number },
  ) => Promise<void>;
  removeRackItem: (siteId: string, id: string) => Promise<void>;
  refreshRackItemSnmp: (siteId: string, id: string) => Promise<void>;

  // ── Batch Runs (Phase 2) ──
  activeRun: LiveRun | null;
  runHistory: RunHistoryEntry[];
  historyLoaded: boolean;
  /** Bumped to open the Batch Run launcher; pendingRunGroupId preselects a group. */
  newRunRequest: number;
  pendingRunGroupId: string | null;
  /** Optional Rack / Server Room scope carried into the launcher for a scoped run. */
  pendingRunScope: RunScope | null;
  requestNewBatchRun: (siteId?: string, scope?: RunScope) => void;
  applyRunEvent: (event: RunEvent) => void;
  startBatchRun: (siteId: string, task: BatchTask, scope?: RunScope | null) => Promise<string>;
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
  sites: [],
  loaded: false,
  loading: false,
  newGroupRequest: 0,

  requestNewSite() {
    set({ newGroupRequest: get().newGroupRequest + 1 });
  },

  async loadSites() {
    if (!isTauriRuntime()) {
      set({ loaded: true });
      return;
    }
    set({ loading: true });
    try {
      const sites = await invokeCommand("itops_list_sites");
      set({ sites, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  async createSite(input) {
    const created = await invokeCommand("itops_create_site", {
      name: input.name,
      memberIds: input.memberIds,
      filter: input.filter,
      transport: input.transport,
      iconColor: input.iconColor ?? null,
      iconDataUrl: input.iconDataUrl ?? null,
      iconBackgroundColor: input.iconBackgroundColor ?? null,
    });
    set({ sites: [...get().sites, created] });
    return created;
  },

  async updateSite(id, input) {
    const updated = await invokeCommand("itops_update_site", {
      id,
      name: input.name,
      memberIds: input.memberIds,
      filter: input.filter,
      transport: input.transport,
      iconColor: input.iconColor ?? null,
      iconDataUrl: input.iconDataUrl ?? null,
      iconBackgroundColor: input.iconBackgroundColor ?? null,
    });
    set({
      sites: get().sites.map((group) => (group.id === id ? updated : group)),
    });
    return updated;
  },

  async removeSite(id) {
    await invokeCommand("itops_remove_site", { id });
    set({ sites: get().sites.filter((group) => group.id !== id) });
  },

  async resolveSite(id) {
    if (!isTauriRuntime()) {
      return [];
    }
    return invokeCommand("itops_resolve_site", { id });
  },

  // ── Site topology / Rack View ──
  racksBySite: {},

  async loadRacks(siteId) {
    if (!isTauriRuntime()) {
      set({ racksBySite: { ...get().racksBySite, [siteId]: [] } });
      return;
    }
    const racks = await invokeCommand("itops_list_racks", { siteId });
    set({ racksBySite: { ...get().racksBySite, [siteId]: racks } });
  },

  async createRack(siteId, input) {
    const created = await invokeCommand("itops_create_rack", { siteId, ...input });
    await get().loadRacks(siteId);
    return created;
  },

  async updateRack(siteId, id, input) {
    await invokeCommand("itops_update_rack", { id, ...input });
    await get().loadRacks(siteId);
  },

  async deleteRack(siteId, id) {
    await invokeCommand("itops_delete_rack", { id });
    await get().loadRacks(siteId);
  },

  async placeRackItem(siteId, input) {
    await invokeCommand("itops_place_rack_item", input);
    await get().loadRacks(siteId);
  },

  async updateRackItem(siteId, input) {
    await invokeCommand("itops_update_rack_item", input);
    await get().loadRacks(siteId);
  },

  async moveRackItem(siteId, input) {
    await invokeCommand("itops_move_rack_item", input);
    await get().loadRacks(siteId);
  },

  async removeRackItem(siteId, id) {
    await invokeCommand("itops_remove_rack_item", { id });
    await get().loadRacks(siteId);
  },

  async refreshRackItemSnmp(siteId, id) {
    await invokeCommand("itops_refresh_rack_item_snmp", { id });
    await get().loadRacks(siteId);
  },

  async setSiteBackground(siteId, background) {
    const updated = await invokeCommand("itops_set_site_background", { siteId, background });
    set({ sites: get().sites.map((site) => (site.id === siteId ? updated : site)) });
  },

  async setServerRoomBackground(siteId, serverRoom, background) {
    const updated = await invokeCommand("itops_set_server_room_background", {
      siteId,
      serverRoom,
      background,
    });
    set({ sites: get().sites.map((site) => (site.id === siteId ? updated : site)) });
  },

  async setRoomIcon(siteId, serverRoom, icon) {
    const updated = await invokeCommand("itops_set_room_icon", {
      siteId,
      serverRoom,
      icon,
    });
    set({ sites: get().sites.map((site) => (site.id === siteId ? updated : site)) });
  },

  async setRackBackground(siteId, rackId, background) {
    await invokeCommand("itops_set_rack_background", { id: rackId, background });
    await get().loadRacks(siteId);
  },

  // ── Batch Runs ──
  activeRun: null,
  runHistory: [],
  historyLoaded: false,
  newRunRequest: 0,
  pendingRunGroupId: null,
  pendingRunScope: null,

  requestNewBatchRun(siteId, scope) {
    set({
      newRunRequest: get().newRunRequest + 1,
      pendingRunGroupId: siteId ?? null,
      pendingRunScope: scope ?? null,
    });
  },

  applyRunEvent(event) {
    set({ activeRun: reduceRun(get().activeRun, event) });
    if (event.kind === "finished" || event.kind === "canceled") {
      void get().loadRunHistory();
    }
  },

  async startBatchRun(siteId, task, scope) {
    // The Started event populates activeRun; clear any prior run first so the
    // grid does not briefly show stale hosts.
    set({ activeRun: null });
    return invokeCommand("itops_start_batch_run", { siteId, task, scope: scope ?? null });
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
