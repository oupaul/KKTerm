// Behavioral tests for the composer helper module extracted from
// AssistantPanel.tsx: intent inference, intent prompt wrapping, and run
// manifest verification status.
import assert from "node:assert/strict";
import test from "node:test";
import {
  assistantAgentIntent,
  assistantIntentForPrompt,
  assistantPromptForIntent,
  createAssistantRunManifest,
  sampleRandom,
} from "../src/ai/assistantComposer.ts";

test("chat prompts only upgrade to extension drafts when asking to build one", () => {
  assert.equal(
    assistantIntentForPrompt("chat", "Create an extension that pings my hosts"),
    "extensionCreation",
  );
  assert.equal(assistantIntentForPrompt("chat", "What is a KKTerm extension?"), "chat");
  assert.equal(assistantIntentForPrompt("chat", "build a plugin for tmux"), "extensionCreation");
  // Explicit intents are never overridden by keyword inference.
  assert.equal(assistantIntentForPrompt("watchdog", "create an extension"), "watchdog");
});

test("intent prompts wrap widget and watchdog requests for the agent", () => {
  assert.match(
    assistantPromptForIntent("watchdog", "alert me when CPU > 90%"),
    /^Configure or draft a Watchdog for this monitoring request:\n/,
  );
  assert.match(
    assistantPromptForIntent("createWidget", "a world clock"),
    /^Create a Dashboard widget for this request:\n/,
  );
  assert.equal(assistantPromptForIntent("chat", "hello"), "hello");
});

test("agent intent narrows panel intents to the backend's accepted values", () => {
  assert.equal(assistantAgentIntent("extensionCreation"), "extensionCreation");
  assert.equal(assistantAgentIntent("createWidget"), "chat");
  assert.equal(assistantAgentIntent("watchdog"), "chat");
  assert.equal(assistantAgentIntent("chat"), "chat");
});

test("run manifest verification reflects tool outcomes", () => {
  const startedAt = "2026-01-01T00:00:00.000Z";
  const failed = createAssistantRunManifest("goal", "chat", [
    { toolId: "1", toolName: "web_search", status: "completed", error: "boom", startedAt },
  ]);
  assert.equal(failed.verificationStatus, "failed");

  const running = createAssistantRunManifest("goal", "chat", [
    { toolId: "1", toolName: "web_search", status: "running", startedAt },
  ]);
  assert.equal(running.verificationStatus, "pending");

  const passed = createAssistantRunManifest("goal", "chat");
  assert.equal(passed.verificationStatus, "passed");
  assert.equal(passed.scope, "assistant.chat");
});

test("sampleRandom returns n distinct items drawn from the source", () => {
  const items = ["a", "b", "c", "d", "e"];
  const sampled = sampleRandom(items, 3);
  assert.equal(sampled.length, 3);
  assert.equal(new Set(sampled).size, 3);
  for (const item of sampled) {
    assert.ok(items.includes(item));
  }
  // Sampling never mutates the source.
  assert.deepEqual(items, ["a", "b", "c", "d", "e"]);
});
