import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync("src/modules/itops/AutomationEditor.tsx", "utf8");
const batchRuns = readFileSync("src/modules/itops/BatchRunsTab.tsx", "utf8");
const runner = readFileSync("src-tauri/src/itops/runner.rs", "utf8");
const state = readFileSync("src/modules/itops/state.ts", "utf8");

test("the Automation editor round-trips session-based trigger kinds", () => {
  assert.match(editor, /type TriggerType =[\s\S]*"sshSessionOutputSilence"/);
  assert.match(editor, /type TriggerType =[\s\S]*"outputMatch"/);
  assert.match(editor, /case "sshSessionOutputSilence":/);
  assert.match(editor, /case "outputMatch":/);
});

test("the Automation editor does not crash when editing a mock trigger", () => {
  assert.match(editor, /type TriggerType =[\s\S]*"mock"/);
  assert.match(editor, /case "mock":/);
  assert.doesNotMatch(editor, /throw new Error\("mock Automations cannot be edited"\)/);
});

test("Batch Run transport failures do not display a fabricated exit code", () => {
  assert.match(batchRuns, /host\.exitCode != null/);
  assert.match(batchRuns, /itops\.batchRuns\.codeFailed/);
});

test("SSH transport failures retain output streamed before the failure", () => {
  assert.match(runner, /outcome_from_streaming_result/);
  assert.match(runner, /streamed_output/);
});

test("live Batch Run output is bounded in frontend state", () => {
  assert.match(state, /MAX_LIVE_OUTPUT/);
  assert.match(state, /appendLiveOutput/);
});
