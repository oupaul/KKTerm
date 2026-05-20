import { useEffect } from "react";
import { create } from "zustand";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { AI_CODING_USAGE_PROVIDER_ORDER } from "./settings";
import {
  AI_CODING_USAGE_REFRESH_INTERVAL_MS,
  providersDueForAiCodingUsageRefresh,
} from "./refreshPolicy";
import type {
  AiCodingUsageProviderState,
  AiCodingUsageState,
} from "./types";

const EMPTY_STATE: AiCodingUsageState = {
  providers: AI_CODING_USAGE_PROVIDER_ORDER.map((provider) => ({
    provider,
    authState: "disconnected",
    accountLabel: null,
    accountEmail: null,
    subscriptionPlan: null,
    fiveHour: {},
    weekly: {},
    lastRefreshAt: null,
    lastError: null,
  })),
};

interface AiCodingUsageStoreState {
  state: AiCodingUsageState;
  error: string;
  loaded: boolean;
  subscriberCount: number;
  refreshTimer: ReturnType<typeof setInterval> | null;
  refreshInFlight: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  load: () => Promise<void>;
  refreshAll: () => Promise<void>;
  applyProvider: (next: AiCodingUsageProviderState) => void;
  setError: (message: string) => void;
}

export const useAiCodingUsageStore = create<AiCodingUsageStoreState>((set, get) => ({
  state: EMPTY_STATE,
  error: "",
  loaded: false,
  subscriberCount: 0,
  refreshTimer: null,
  refreshInFlight: false,

  subscribe() {
    const next = get().subscriberCount + 1;
    set({ subscriberCount: next });
    if (next === 1) {
      void get().load();
      const timer = setInterval(
        () => void get().refreshAll(),
        AI_CODING_USAGE_REFRESH_INTERVAL_MS,
      );
      set({ refreshTimer: timer });
    }
  },

  unsubscribe() {
    const next = Math.max(0, get().subscriberCount - 1);
    set({ subscriberCount: next });
    if (next === 0) {
      const timer = get().refreshTimer;
      if (timer) {
        clearInterval(timer);
      }
      set({ refreshTimer: null });
    }
  },

  async load() {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const state = await invokeCommand("ai_coding_usage_load");
      set({ state, error: "", loaded: true });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  async refreshAll() {
    if (!isTauriRuntime() || get().refreshInFlight) {
      return;
    }
    const due = providersDueForAiCodingUsageRefresh(
      get().state.providers,
      Date.now(),
    );
    if (due.length === 0) {
      return;
    }
    set({ refreshInFlight: true });
    try {
      let nextState = get().state;
      for (const provider of due) {
        nextState = await invokeCommand("ai_coding_usage_refresh", {
          provider: provider.provider,
        });
      }
      set({ state: nextState, error: "" });
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ refreshInFlight: false });
    }
  },

  applyProvider(next) {
    set((current) => ({
      state: {
        providers: AI_CODING_USAGE_PROVIDER_ORDER.map((id) =>
          id === next.provider
            ? next
            : current.state.providers.find((candidate) => candidate.provider === id) ??
              EMPTY_STATE.providers.find((candidate) => candidate.provider === id)!,
        ),
      },
    }));
  },

  setError(message) {
    set({ error: message });
  },
}));

export function useAiCodingUsageSubscription() {
  const subscribe = useAiCodingUsageStore((s) => s.subscribe);
  const unsubscribe = useAiCodingUsageStore((s) => s.unsubscribe);
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
