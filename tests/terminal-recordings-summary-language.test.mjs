import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/workspace/connections/terminal/TerminalRecordingsDialog.tsx", import.meta.url),
  "utf8",
);

test("recording summaries use the configured Assistant output-language resolver", () => {
  assert.match(source, /resolveAssistantOutputLanguage/);
  assert.match(source, /aiProviderSettings\.outputLanguage/);
  assert.match(
    source,
    /outputLanguage:\s*resolveAssistantOutputLanguage\(aiProviderSettings\.outputLanguage\)/,
  );
  assert.doesNotMatch(source, /outputLanguage:\s*i18next\./);
});

test("completed recording summaries expose an explicit forced regenerate action", () => {
  assert.match(source, /terminal\.recordingsRegenerateSummary/);
  assert.match(source, /terminal-recordings-summary-regenerate/);
  assert.match(source, /summarize\(row, false, true\)/);
});
