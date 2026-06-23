import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Assistant composer exposes Create Widget and Watchdog intent chips", async () => {
  const assistantSource = await readFile(
    new URL("../src/ai/AssistantPanel.tsx", import.meta.url),
    "utf8",
  );
  const intentTypesSource = await readFile(
    new URL("../src/ai/assistantTypes.ts", import.meta.url),
    "utf8",
  );
  const locale = JSON.parse(
    await readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  );

  assert.match(
    intentTypesSource,
    /type AssistantPromptIntent = "chat" \| "extensionCreation" \| "createWidget" \| "watchdog"/,
    "AssistantPromptIntent should include the selectable composer intents.",
  );
  assert.match(
    assistantSource,
    /assistant-intent-chip/,
    "AssistantPanel should render a visible intent chip in the composer.",
  );
  assert.match(
    assistantSource,
    /assistant-intent-examples/,
    "AssistantPanel should render example bubbles when an intent is selected.",
  );
  assert.equal(locale.ai.createWidget, "Create Widget");
  assert.equal(locale.ai.watchdog, "Watchdog");
  // The example bubbles are curated copy that grows over time, so assert the
  // shape (a non-empty list of strings) rather than pinning volatile contents.
  for (const key of ["createWidgetExamples", "watchdogExamples"]) {
    assert.ok(Array.isArray(locale.ai[key]), `locale.ai.${key} should be an array`);
    assert.ok(locale.ai[key].length > 0, `locale.ai.${key} should not be empty`);
    assert.ok(
      locale.ai[key].every((example) => typeof example === "string" && example.trim().length > 0),
      `locale.ai.${key} entries should be non-empty strings`,
    );
  }
});
