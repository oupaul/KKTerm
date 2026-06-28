import { useEffect } from "react";
import { create } from "zustand";
import { invokeCommand, isTauriRuntime } from "../../../../../lib/tauri";
import type { PcInfoSnapshot } from "./types";

// PC Info uses a cache-and-manual-refresh model: the snapshot is gathered once
// on first widget mount (the backend caches it), reused across remounts and
// multiple widget instances, and only re-collected when the user clicks Refresh.
// There is no polling timer — hardware inventory does not change minute to
// minute and the collector spawns an OS process.

interface PcInfoStoreState {
  snapshot: PcInfoSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  loaded: boolean;
  subscriberCount: number;
  inFlight: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePcInfoStore = create<PcInfoStoreState>((set, get) => ({
  snapshot: null,
  loading: false,
  refreshing: false,
  error: "",
  loaded: false,
  subscriberCount: 0,
  inFlight: false,

  subscribe() {
    const next = get().subscriberCount + 1;
    set({ subscriberCount: next });
    if (next === 1 && !get().loaded) {
      void get().load();
    }
  },

  unsubscribe() {
    set({ subscriberCount: Math.max(0, get().subscriberCount - 1) });
  },

  async load() {
    if (!isTauriRuntime() || get().inFlight || get().loaded) {
      return;
    }
    set({ loading: true, inFlight: true, error: "" });
    try {
      const snapshot = await invokeCommand("pc_info_get");
      set({ snapshot, loaded: true, error: "" });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ loading: false, inFlight: false });
    }
  },

  async refresh() {
    if (!isTauriRuntime() || get().inFlight) {
      return;
    }
    set({ refreshing: true, inFlight: true, error: "" });
    try {
      const snapshot = await invokeCommand("pc_info_refresh");
      set({ snapshot, loaded: true, error: "" });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ refreshing: false, inFlight: false });
    }
  },
}));

export function usePcInfoSubscription() {
  const subscribe = usePcInfoStore((s) => s.subscribe);
  const unsubscribe = usePcInfoStore((s) => s.unsubscribe);
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
