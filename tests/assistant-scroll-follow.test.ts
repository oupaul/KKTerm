import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { shouldFollowAssistantChat } from "../src/ai/assistantScroll.ts";

test("assistant streaming follows only while the reader remains near the bottom", () => {
  assert.equal(
    shouldFollowAssistantChat({ scrollTop: 680, scrollHeight: 1000, clientHeight: 300 }),
    true,
    "a reader within the bottom threshold should keep following streamed content",
  );
  assert.equal(
    shouldFollowAssistantChat({ scrollTop: 500, scrollHeight: 1000, clientHeight: 300 }),
    false,
    "scrolling upward should pause streamed-content following",
  );
});

test("assistant chat viewport updates stream following from manual scrolling", async () => {
  const source = await readFile(
    new URL("../src/ai/AssistantPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /function handleAssistantChatScroll\(\)[\s\S]*?forceChatScrollToBottomRef\.current\s*=\s*shouldFollowAssistantChat\(chatLogRef\.current\)/,
  );
  assert.match(
    source,
    /className=\{`assistant-chat-log[\s\S]*?onScroll=\{handleAssistantChatScroll\}[\s\S]*?ref=\{chatLogRef\}/,
  );
});
