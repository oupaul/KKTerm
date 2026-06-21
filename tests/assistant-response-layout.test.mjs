import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/ai/assistant.css", import.meta.url), "utf8");

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{(?<body>[^}]*)\\}`));
  assert.ok(match?.groups?.body, `Missing CSS rule for ${selector}`);
  return match.groups.body;
}

test("AI Assistant responses shrink to the panel while wide code scrolls internally", () => {
  for (const selector of [
    ".assistant-message",
    ".assistant-message-content",
    ".assistant-message-bubble",
    ".markdown-content",
    ".markdown-code-block",
  ]) {
    const body = ruleBody(selector);
    assert.match(body, /min-width:\s*0;/, `${selector} must be allowed to shrink`);
    assert.match(body, /max-width:\s*100%;/, `${selector} must stay within the panel`);
  }

  assert.match(ruleBody(".assistant-message"), /width:\s*100%;/);
  assert.match(ruleBody(".assistant-message-content"), /width:\s*100%;/);
  assert.match(ruleBody(".assistant-message-bubble"), /width:\s*100%;/);
  assert.match(ruleBody(".markdown-content"), /width:\s*100%;/);
  assert.match(ruleBody(".markdown-code-block pre"), /overflow:\s*auto;/);
});
