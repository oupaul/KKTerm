// IT Ops Module frontend store. Phase 1 owns durable Host Groups: a thin cache
// over the itops_* Tauri commands so the rail badge, the Host Groups tab, and
// any dialog share one source of truth and update live after a mutation without
// a full reload. Live Batch Run / Automation state arrives in later phases.

import { create } from "zustand";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import type { HostGroup, HostGroupFilter, ItopsTransport, ResolvedHost } from "../../types";

export interface HostGroupInput {
  name: string;
  memberIds: string[];
  filter: HostGroupFilter | null;
  transport: ItopsTransport;
}

interface ItOpsState {
  hostGroups: HostGroup[];
  loaded: boolean;
  loading: boolean;
  /** Bumped when the module header's "New Host Group" button is pressed so the
   *  Host Groups tab (which owns the dialog + selection) opens the create flow. */
  newGroupRequest: number;
  requestNewHostGroup: () => void;
  loadHostGroups: () => Promise<void>;
  createHostGroup: (input: HostGroupInput) => Promise<HostGroup>;
  updateHostGroup: (id: string, input: HostGroupInput) => Promise<HostGroup>;
  removeHostGroup: (id: string) => Promise<void>;
  resolveHostGroup: (id: string) => Promise<ResolvedHost[]>;
}

export const useItOpsStore = create<ItOpsState>((set, get) => ({
  hostGroups: [],
  loaded: false,
  loading: false,
  newGroupRequest: 0,

  requestNewHostGroup() {
    set({ newGroupRequest: get().newGroupRequest + 1 });
  },

  async loadHostGroups() {
    if (!isTauriRuntime()) {
      set({ loaded: true });
      return;
    }
    set({ loading: true });
    try {
      const hostGroups = await invokeCommand("itops_list_host_groups");
      set({ hostGroups, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  async createHostGroup(input) {
    const created = await invokeCommand("itops_create_host_group", {
      name: input.name,
      memberIds: input.memberIds,
      filter: input.filter,
      transport: input.transport,
    });
    set({ hostGroups: [...get().hostGroups, created] });
    return created;
  },

  async updateHostGroup(id, input) {
    const updated = await invokeCommand("itops_update_host_group", {
      id,
      name: input.name,
      memberIds: input.memberIds,
      filter: input.filter,
      transport: input.transport,
    });
    set({
      hostGroups: get().hostGroups.map((group) => (group.id === id ? updated : group)),
    });
    return updated;
  },

  async removeHostGroup(id) {
    await invokeCommand("itops_remove_host_group", { id });
    set({ hostGroups: get().hostGroups.filter((group) => group.id !== id) });
  },

  async resolveHostGroup(id) {
    if (!isTauriRuntime()) {
      return [];
    }
    return invokeCommand("itops_resolve_host_group", { id });
  },
}));
