import { useEffect } from "react";
import { create } from "zustand";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { AI_CODING_USAGE_PROVIDER_ORDER } from "./settings";
import type {
  AiCodingUsageProviderState,
  AiCodingUsageState,
} from "./types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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

  subscribe() {
    const next = get().subscriberCount + 1;
    set({ subscriberCount: next });
    if (next === 1) {
      void get().load();
      const timer = setInterval(() => void get().refreshAll(), REFRESH_INTERVAL_MS);
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
    if (!isTauriRuntime()) {
      return;
    }
    const connected = get().state.providers.filter(
      (provider) => provider.authState === "connected",
    );
    if (connected.length === 0) {
      return;
    }
    try {
      let nextState = get().state;
      for (const provider of connected) {
        nextState = await invokeCommand("ai_coding_usage_refresh", {
          provider: provider.provider,
        });
      }
      set({ state: nextState, error: "" });
    } catch (error) {
      set({ error: errorMessage(error) });
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
