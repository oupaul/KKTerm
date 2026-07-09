import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadRefreshPolicyModule() {
  const source = await readFile(
    new URL("../src/modules/dashboard/widgets/builtin/ai-coding-usage/refreshPolicy.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module });
  return module.exports;
}

function connectedProvider(overrides = {}) {
  return {
    provider: "claudeCode",
    authState: "connected",
    accountLabel: "Claude Code",
    accountEmail: null,
    subscriptionPlan: null,
    fiveHour: {},
    weekly: {},
    lastRefreshAt: null,
    lastError: null,
    ...overrides,
  };
}

test("AI coding usage refresh backs off Claude Code after 429", async () => {
  const {
    CLAUDE_USAGE_RATE_LIMIT_COOLDOWN_MS,
    isAiCodingUsageRefreshAllowed,
  } = await loadRefreshPolicyModule();
  const lastRefreshAt = "2026-05-20T00:00:00.000Z";
  const lastRefreshMs = Date.parse(lastRefreshAt);
  const provider = connectedProvider({
    lastRefreshAt,
    lastError: "Claude usage endpoint returned HTTP 429 Too Many Requests.",
  });

  assert.equal(
    isAiCodingUsageRefreshAllowed(
      provider,
      lastRefreshMs + CLAUDE_USAGE_RATE_LIMIT_COOLDOWN_MS - 1,
    ),
    false,
  );
  assert.equal(
    isAiCodingUsageRefreshAllowed(
      provider,
      lastRefreshMs + CLAUDE_USAGE_RATE_LIMIT_COOLDOWN_MS,
    ),
    true,
  );
});

test("AI coding usage refresh honors Claude retry-after longer than poll interval", async () => {
  const { isAiCodingUsageRefreshAllowed } = await loadRefreshPolicyModule();
  const lastRefreshAt = "2026-05-20T00:00:00.000Z";
  const lastRefreshMs = Date.parse(lastRefreshAt);
  const provider = connectedProvider({
    lastRefreshAt,
    lastError:
      "Claude usage endpoint returned HTTP 429 Too Many Requests; retry after 1200s.",
  });

  assert.equal(
    isAiCodingUsageRefreshAllowed(provider, lastRefreshMs + 1199 * 1000),
    false,
  );
  assert.equal(
    isAiCodingUsageRefreshAllowed(provider, lastRefreshMs + 1200 * 1000),
    true,
  );
});

test("AI coding usage background refresh only treats connected stale providers as due", async () => {
  const {
    AI_CODING_USAGE_REFRESH_INTERVAL_MS,
    providersDueForAiCodingUsageBackgroundRefresh,
  } = await loadRefreshPolicyModule();
  const nowMs = Date.parse("2026-05-20T00:05:00.000Z");
  const recent = connectedProvider({
    provider: "codex",
    lastRefreshAt: new Date(nowMs - 60 * 1000).toISOString(),
  });
  const exactlyFiveMinutes = connectedProvider({
    provider: "codex",
    lastRefreshAt: new Date(nowMs - AI_CODING_USAGE_REFRESH_INTERVAL_MS).toISOString(),
  });
  const stale = connectedProvider({
    provider: "codex",
    lastRefreshAt: new Date(nowMs - AI_CODING_USAGE_REFRESH_INTERVAL_MS - 1).toISOString(),
  });

  assert.deepEqual(
    providersDueForAiCodingUsageBackgroundRefresh(
      [recent, exactlyFiveMinutes, stale, connectedProvider({ authState: "disconnected" })],
      nowMs,
    ).map((provider) => provider.lastRefreshAt),
    [stale.lastRefreshAt],
  );
});

test("AI coding usage background refresh uses the longer Claude Code interval", async () => {
  const {
    AI_CODING_USAGE_REFRESH_INTERVAL_MS,
    CLAUDE_USAGE_REFRESH_INTERVAL_MS,
    providersDueForAiCodingUsageBackgroundRefresh,
  } = await loadRefreshPolicyModule();
  assert.ok(CLAUDE_USAGE_REFRESH_INTERVAL_MS > AI_CODING_USAGE_REFRESH_INTERVAL_MS);
  const nowMs = Date.parse("2026-05-20T01:00:00.000Z");
  const claudeWithinInterval = connectedProvider({
    provider: "claudeCode",
    lastRefreshAt: new Date(nowMs - CLAUDE_USAGE_REFRESH_INTERVAL_MS).toISOString(),
  });
  const claudeStale = connectedProvider({
    provider: "claudeCode",
    lastRefreshAt: new Date(nowMs - CLAUDE_USAGE_REFRESH_INTERVAL_MS - 1).toISOString(),
  });
  const codexSameAge = connectedProvider({
    provider: "codex",
    lastRefreshAt: claudeWithinInterval.lastRefreshAt,
  });

  assert.deepEqual(
    providersDueForAiCodingUsageBackgroundRefresh(
      [claudeWithinInterval, claudeStale, codexSameAge],
      nowMs,
    ).map((provider) => [provider.provider, provider.lastRefreshAt]),
    [
      ["claudeCode", claudeStale.lastRefreshAt],
      ["codex", codexSameAge.lastRefreshAt],
    ],
  );
});
