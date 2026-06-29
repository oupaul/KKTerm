import { useEffect } from "react";
import { create } from "zustand";
import { invokeCommand, isTauriRuntime } from "../../../../../lib/tauri";
import type { PcInfoSnapshot } from "./types";

// PC Info uses a cache-and-manual-refresh model: the snapshot is gathered once
// on first widget mount (the backend also caches it), reused across remounts and
// multiple widget instances, and only re-collected when the user clicks Refresh.
// There is no polling timer — hardware inventory does not change minute to minute
// and the collector spawns an OS process.
//
// The last snapshot is additionally persisted to localStorage, so on a fresh app
// launch the previous report shows instantly and the widget stays lazy: it does
// not re-collect on mount, only on an explicit Refresh.
const CACHE_STORAGE_KEY = "kkterm.dashboard.pcInfo.cache.v1";

function readCache(): PcInfoSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PcInfoSnapshot) : null;
  } catch {
    return null;
  }
}

function writeCache(snapshot: PcInfoSnapshot) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort; the widget still works without it.
  }
}

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

export const usePcInfoStore = create<PcInfoStoreState>((set, get) => {
  const cached = readCache();
  return {
    snapshot: cached,
    loading: false,
    refreshing: false,
    error: "",
    // A persisted snapshot counts as loaded, so we stay lazy and only re-collect
    // when the user asks.
    loaded: cached !== null,
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
        writeCache(snapshot);
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
        writeCache(snapshot);
        set({ snapshot, loaded: true, error: "" });
      } catch (error) {
        set({ error: errorMessage(error) });
      } finally {
        set({ refreshing: false, inFlight: false });
      }
    },
  };
});

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
