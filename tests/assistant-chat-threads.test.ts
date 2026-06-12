// Behavioral tests for the chat-thread persistence module extracted from
// AssistantPanel.tsx: SQLite record round-trips, defensive normalization of
// persisted data, and history ordering.
import assert from "node:assert/strict";
import test from "node:test";
import {
  assistantChatThreadFromRecord,
  assistantChatThreadToRecord,
  normalizeAssistantChatThread,
  sanitizeAssistantThreadTitle,
  upsertAssistantChatThread,
} from "../src/ai/assistantChatThreads.ts";
import type { AssistantChatThread } from "../src/ai/assistantTypes.ts";

function thread(id: string, updatedAt: string): AssistantChatThread {
  return {
    id,
    title: `Thread ${id}`,
    contextLabel: "Workspace",
    messages: [
      {
        id: `user-${id}`,
        role: "user",
        content: "hello",
        createdAt: updatedAt,
      },
    ],
    createdAt: updatedAt,
    updatedAt,
  };
}

test("thread records round-trip through SQLite serialization", () => {
  const original = thread("assistant-chat-1", "2026-01-01T00:00:00.000Z");
  original.messages.push({
    id: "assistant-1",
    role: "assistant",
    content: "Use df -h.",
    createdAt: "2026-01-01T00:00:05.000Z",
    toolCalls: [
      {
        toolId: "call_1",
        toolName: "session_state",
        status: "completed",
        startedAt: "2026-01-01T00:00:01.000Z",
        endedAt: "2026-01-01T00:00:02.000Z",
      },
    ],
  });
  const record = assistantChatThreadToRecord(original);
  const restored = assistantChatThreadFromRecord(record);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].id, original.id);
  assert.equal(restored[0].title, original.title);
  assert.equal(restored[0].messages.length, 2);
  assert.equal(restored[0].messages[1].content, "Use df -h.");
  assert.equal(restored[0].messages[1].toolCalls?.[0].toolName, "session_state");
});

test("corrupt records and malformed messages are dropped, not thrown", () => {
  assert.deepEqual(
    assistantChatThreadFromRecord({
      id: "x",
      title: "broken",
      contextLabel: "Workspace",
      messagesJson: "{not json",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    [],
  );
  assert.deepEqual(normalizeAssistantChatThread(null), []);
  assert.deepEqual(normalizeAssistantChatThread({ messages: [] }), []);

  const normalized = normalizeAssistantChatThread({
    messages: [
      { role: "user", content: "keep me", createdAt: "2026-01-01T00:00:00.000Z" },
      { role: "system", content: "drop unknown role" },
      { role: "assistant", content: "   " },
    ],
  });
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].messages.length, 1);
  assert.equal(normalized[0].messages[0].content, "keep me");
});

test("upsert replaces by id and keeps newest-first ordering", () => {
  const older = thread("a", "2026-01-01T00:00:00.000Z");
  const newer = thread("b", "2026-01-02T00:00:00.000Z");
  const updatedOlder = { ...older, updatedAt: "2026-01-03T00:00:00.000Z" };
  const result = upsertAssistantChatThread([older, newer], updatedOlder);
  assert.deepEqual(
    result.map((item) => item.id),
    ["a", "b"],
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].updatedAt, "2026-01-03T00:00:00.000Z");
});

test("generated thread titles are sanitized and capped", () => {
  assert.equal(sanitizeAssistantThreadTitle('Title: "Server health check"'), "Server health check");
  assert.equal(sanitizeAssistantThreadTitle("   "), "");
  assert.equal(sanitizeAssistantThreadTitle("first line\nsecond line"), "first line");
  const long = sanitizeAssistantThreadTitle("x".repeat(80));
  assert.equal(long.length, 56);
  assert.ok(long.endsWith("..."));
});
