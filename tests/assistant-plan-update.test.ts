// Behavioral tests for the model-published work plan: planUpdate stream
// events become a model-sourced run manifest that synthesized manifests must
// never overwrite, and persisted plans survive normalization.
import assert from "node:assert/strict";
import test from "node:test";
import { applyAssistantStreamEventToMessage } from "../src/ai/streamMessage.ts";
import { normalizeAssistantRunManifest } from "../src/ai/assistantChatThreads.ts";

const options = {
  errorPrefix: "Error",
  now: () => "2026-06-12T00:00:01.000Z",
  workStartedAt: "2026-06-12T00:00:00.000Z",
};

test("planUpdate events build a model-sourced run manifest", () => {
  let message = applyAssistantStreamEventToMessage(
    { content: "", isStreaming: true },
    {
      type: "planUpdate",
      goal: "Create and verify a clock widget",
      steps: [
        { id: "create", label: "Create the widget", status: "running" },
        { id: "verify", label: "Check widget health", status: "pending" },
      ],
    },
    options,
  );
  assert.equal(message.runManifest?.source, "model");
  assert.equal(message.runManifest?.goal, "Create and verify a clock widget");
  assert.equal(message.runManifest?.verificationStatus, "pending");
  assert.equal(message.runManifest?.steps.length, 2);

  // A later update marks everything completed -> verification passes, and
  // the goal/runId persist when the update omits the goal.
  const runId = message.runManifest?.runId;
  message = applyAssistantStreamEventToMessage(
    message,
    {
      type: "planUpdate",
      steps: [
        { id: "create", label: "Create the widget", status: "completed" },
        { id: "verify", label: "Check widget health", status: "completed" },
      ],
    },
    options,
  );
  assert.equal(message.runManifest?.runId, runId);
  assert.equal(message.runManifest?.goal, "Create and verify a clock widget");
  assert.equal(message.runManifest?.verificationStatus, "passed");

  // Blocked steps fail verification.
  message = applyAssistantStreamEventToMessage(
    message,
    {
      type: "planUpdate",
      steps: [{ id: "create", label: "Create the widget", status: "blocked" }],
    },
    options,
  );
  assert.equal(message.runManifest?.verificationStatus, "failed");

  // Malformed/empty step lists never clobber the existing plan.
  const before = message.runManifest;
  message = applyAssistantStreamEventToMessage(
    message,
    { type: "planUpdate", steps: [] },
    options,
  );
  assert.deepEqual(message.runManifest, before);
});

test("model-sourced manifests survive persistence normalization", () => {
  const normalized = normalizeAssistantRunManifest({
    runId: "assistant-run-1",
    goal: "goal",
    scope: "assistant.chat",
    definitionOfDone: "done",
    verificationStatus: "pending",
    steps: [{ id: "a", label: "step", status: "running" }],
    updatedAt: "2026-06-12T00:00:00.000Z",
    source: "model",
  });
  assert.equal(normalized?.source, "model");

  const synthesized = normalizeAssistantRunManifest({
    runId: "assistant-run-2",
    goal: "goal",
    scope: "assistant.chat",
    definitionOfDone: "done",
    verificationStatus: "pending",
    steps: [],
    updatedAt: "2026-06-12T00:00:00.000Z",
    source: "weird-value",
  });
  assert.equal(synthesized?.source, undefined);
});
