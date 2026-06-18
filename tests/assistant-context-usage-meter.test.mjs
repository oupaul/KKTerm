import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("AssistantPanel renders context usage meter from stream events", async () => {
  const source = await readFile("src/ai/AssistantPanel.tsx", "utf8");

  assert.match(
    source,
    /event\.type === "contextUsage"[\s\S]*setContextUsage\(event\.usage\)/,
    "contextUsage stream events should update panel state",
  );
  assert.match(
    source,
    /className="assistant-context-usage-button"/,
    "assistant composer footer should render the context usage meter button",
  );
  assert.match(
    source,
    /className="assistant-context-usage-popover"/,
    "clicking the meter should expose the detailed context usage popover",
  );
  assert.match(
    source,
    /t\("ai\.contextUsageTokens"/,
    "usage details should be localized instead of hard-coded",
  );
});
