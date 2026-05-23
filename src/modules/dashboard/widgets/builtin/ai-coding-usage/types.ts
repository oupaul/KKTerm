export type AiCodingUsageProvider = "codex" | "claudeCode";
export type AiCodingUsageAuthState = "disconnected" | "connected" | "expired" | "error";

export interface AiCodingUsageQuotaWindow {
  usedPercent?: number | null;
  resetsAt?: string | null;
}

export interface AiCodingUsageProviderState {
  provider: AiCodingUsageProvider;
  authState: AiCodingUsageAuthState;
  accountLabel?: string | null;
  accountEmail?: string | null;
  subscriptionPlan?: string | null;
  fiveHour: AiCodingUsageQuotaWindow;
  weekly: AiCodingUsageQuotaWindow;
  lastRefreshAt?: string | null;
  lastError?: string | null;
}

export interface AiCodingUsageState {
  providers: AiCodingUsageProviderState[];
}
