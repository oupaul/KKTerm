import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("status bar exposes a clickable AI working indicator", async () => {
  const statusBarSource = await readFile(
    new URL("../src/workspace/StatusBar.tsx", import.meta.url),
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
