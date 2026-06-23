import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldPromptForEncryptedStoreOnLaunch,
  type EncryptedStoreLaunchPromptPolicy,
} from "../src/lib/encryptedStoreLaunchPromptPolicy";

const launchedAt = new Date("2026-06-23T08:00:00.000Z").getTime();

test("encrypted store launch prompt policy preserves manual-only never behavior", () => {
  assert.equal(
    shouldPromptForEncryptedStoreOnLaunch({
      policy: "never",
      lastUnlockAt: undefined,
      launchedAt,
    }),
    false,
  );
});

test("encrypted store launch prompt policy asks every time when requested", () => {
  assert.equal(
    shouldPromptForEncryptedStoreOnLaunch({
      policy: "everyTime",
      lastUnlockAt: launchedAt - 1,
      launchedAt,
    }),
    true,
  );
});

test("encrypted store launch prompt policy waits for the selected interval", () => {
  const cases: Array<[EncryptedStoreLaunchPromptPolicy, number]> = [
    ["oneHour", 60 * 60 * 1000],
    ["fourHours", 4 * 60 * 60 * 1000],
    ["twentyFourHours", 24 * 60 * 60 * 1000],
  ];

  for (const [policy, intervalMs] of cases) {
    assert.equal(
      shouldPromptForEncryptedStoreOnLaunch({
        policy,
        lastUnlockAt: launchedAt - intervalMs + 1,
        launchedAt,
      }),
      false,
      `${policy} should not prompt before its interval expires`,
    );
    assert.equal(
      shouldPromptForEncryptedStoreOnLaunch({
        policy,
        lastUnlockAt: launchedAt - intervalMs,
        launchedAt,
      }),
      true,
      `${policy} should prompt once its interval expires`,
    );
  }
});

test("encrypted store launch prompt policy prompts when timed policy has no previous unlock", () => {
  assert.equal(
    shouldPromptForEncryptedStoreOnLaunch({
      policy: "oneHour",
      lastUnlockAt: undefined,
      launchedAt,
    }),
    true,
  );
});
