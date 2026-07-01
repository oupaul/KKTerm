import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("status bar exposes a clickable AI working indicator", async () => {
  const statusBarSource = await readFile(
    new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
    "utf8",
  );
  const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const assistantSource = await readFile(
    new URL("../src/ai/AssistantPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    statusBarSource,
    /function\s+AssistantWorkingStatusButton/,
    "StatusBar should render a dedicated AI working indicator.",
  );
  assert.match(
    statusBarSource,
    /assistantWorking/,
    "StatusBar should read the shared assistant working state.",
  );
  assert.match(
    statusBarSource,
    /onOpenAssistant/,
    "Clicking the status indicator should ask App to open the Assistant panel.",
  );
  assert.match(
    appSource,
    /function\s+openAssistantPanel/,
    "App should own the actual Assistant panel opening behavior.",
  );
  assert.match(
    assistantSource,
    /setAssistantWorking\(isSendingPrompt\)/,
    "AssistantPanel should publish in-flight work to shared state.",
  );
});

test("assistant renders in-chat tool approval controls", async () => {
  const assistantSource = await readFile(
    new URL("../src/ai/AssistantPanel.tsx", import.meta.url),
    "utf8",
  );
  const approvalCardsSource = await readFile(
    new URL("../src/ai/AssistantToolApprovalCards.tsx", import.meta.url),
    "utf8",
  );
  const tauriSource = await readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8");

  assert.match(
    assistantSource,
    /assistant-tool-approval-request/,
    "AssistantPanel should listen for backend tool approval requests.",
  );
  assert.match(
    assistantSource,
    /complete_assistant_tool_approval_request/,
    "AssistantPanel should complete the approval request instead of changing global settings.",
  );
  assert.match(
    approvalCardsSource,
    /assistant-tool-approval-card/,
    "AssistantPanel should render an in-chat approval card.",
  );
  assert.match(
    assistantSource,
    /function denyAssistantToolApproval[\s\S]*cancel_assistant_streams[\s\S]*completeAssistantToolApproval\(request\.requestId, false\)/,
    "Deny should cancel the backend turn before rejecting its pending tool call.",
  );
  assert.match(
    approvalCardsSource,
    /toolApprovalAllowSession/,
    "AssistantPanel should offer an Allow in this session action.",
  );
  assert.match(
    assistantSource,
    /allowedToolApprovalsForCurrentChatRef\.current\.add\(toolName\)/,
    "Allow in this session should remember approval for the active chat.",
  );
  assert.doesNotMatch(
    approvalCardsSource,
    /common\.yes|common\.no|cancelPrompt/,
    "The approval card should use Allow, Allow in this session, and Deny only.",
  );
  assert.match(
    tauriSource,
    /complete_assistant_tool_approval_request/,
    "typed Tauri wrappers should include the approval completion command.",
  );
});

test("stopping an assistant reply finalizes the in-flight streaming message", async () => {
  const assistantSource = await readFile(
    new URL("../src/ai/AssistantPanel.tsx", import.meta.url),
    "utf8",
  );

  const stopFunctionMatch = assistantSource.match(
    /function handleStopAssistantPrompt\(\)[\s\S]*?\n  }\n/,
  );
  assert.ok(stopFunctionMatch, "handleStopAssistantPrompt should exist.");
  const stopFunctionSource = stopFunctionMatch[0];
  const finalizerMatch = assistantSource.match(
    /function finalizeActiveStreamingMessages\(completedAt: string\)[\s\S]*?\n  }\n/,
  );
  assert.ok(finalizerMatch, "finalizeActiveStreamingMessages should exist.");
  const finalizerSource = finalizerMatch[0];

  assert.match(
    stopFunctionSource,
    /finalizeActiveStreamingMessages\(new Date\(\)\.toISOString\(\)\)/,
    "Stop should finalize chat messages, not just the isSendingPrompt flag.",
  );
  assert.match(
    finalizerSource,
    /isStreaming:\s*false/,
    "Stop must clear isStreaming on the active message so its work panel stops " +
      "showing a running 'thinking' indicator after the request id has been " +
      "bumped (which makes the stream channel ignore any later done/error event).",
  );
  assert.match(
    finalizerSource,
    /messagesRef\.current\s*=\s*finalizedMessages/,
    "Stop must update the mutable message ref so the next assistant turn cannot reuse " +
      "a stale streaming transcript.",
  );
  assert.match(
    finalizerSource,
    /saveChatMessages\(/,
    "Stop must persist the finalized partial assistant message into chat history.",
  );
});

test("stale assistant stream flushes cannot revive a stopped message", async () => {
  const assistantSource = await readFile(
    new URL("../src/ai/AssistantPanel.tsx", import.meta.url),
    "utf8",
  );

  const flushFunctionMatch = assistantSource.match(
    /const flushStreamingSnapshot = \(\) => \{[\s\S]*?\n      \};/,
  );
  assert.ok(flushFunctionMatch, "flushStreamingSnapshot should exist.");
  const flushFunctionSource = flushFunctionMatch[0];

  assert.match(
    flushFunctionSource,
    /activeAssistantRequestIdRef\.current !== requestId[\s\S]*return;/,
    "A pending coalesced stream flush must no-op after Stop bumps the request id.",
  );
});
