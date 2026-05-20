import type { AiCodingUsageProviderState } from "./types";

export const AI_CODING_USAGE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const CLAUDE_USAGE_RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;

export function providersDueForAiCodingUsageRefresh(
  providers: AiCodingUsageProviderState[],
  nowMs = Date.now(),
) {
  return providers.filter((provider) =>
    isAiCodingUsageRefreshAllowed(provider, nowMs),
  );
}

export function isAiCodingUsageRefreshAllowed(
  provider: AiCodingUsageProviderState,
  nowMs = Date.now(),
) {
  if (provider.authState !== "connected") {
    return false;
  }
  const retryAt = nextAiCodingUsageRefreshAt(provider, nowMs);
  return retryAt === null || nowMs >= retryAt;
}

export function nextAiCodingUsageRefreshAt(
  provider: AiCodingUsageProviderState,
  nowMs = Date.now(),
) {
  if (provider.provider !== "claudeCode" || !isClaudeUsageRateLimitError(provider.lastError)) {
    return null;
  }
  const lastRefreshMs = parseTimestampMs(provider.lastRefreshAt);
  if (lastRefreshMs === null) {
    return nowMs + CLAUDE_USAGE_RATE_LIMIT_COOLDOWN_MS;
  }
  return lastRefreshMs + claudeUsageRateLimitCooldownMs(provider.lastError);
}

function claudeUsageRateLimitCooldownMs(message?: string | null) {
  const retryAfterSeconds = retryAfterSecondsFromError(message);
  if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
    return Math.max(retryAfterSeconds * 1000, AI_CODING_USAGE_REFRESH_INTERVAL_MS);
  }
  return CLAUDE_USAGE_RATE_LIMIT_COOLDOWN_MS;
}

function isClaudeUsageRateLimitError(message?: string | null) {
  return Boolean(message?.match(/HTTP\s+429|Too Many Requests/i));
}

function retryAfterSecondsFromError(message?: string | null) {
  const match = message?.match(/retry after\s+(\d+)\s*(?:s|sec|second|seconds)?/i);
  if (!match) {
    return null;
  }
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : null;
}

function parseTimestampMs(value?: string | null) {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}
