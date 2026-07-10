import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHyperlinkRuleUrl,
  decodeOsc777Notification,
  findPromptNavigationTarget,
  parseOsc133Sequence,
} from "../src/modules/workspace/connections/terminal/oscSequences";

test("OSC 133 prompt/command sequences parse with exit codes", () => {
  assert.deepEqual(parseOsc133Sequence("A"), { kind: "A" });
  assert.deepEqual(parseOsc133Sequence("B"), { kind: "B" });
  assert.deepEqual(parseOsc133Sequence("C"), { kind: "C" });
  assert.deepEqual(parseOsc133Sequence("D"), { kind: "D" });
  assert.deepEqual(parseOsc133Sequence("D;0"), { kind: "D", exitCode: 0 });
  assert.deepEqual(parseOsc133Sequence("D;127"), { kind: "D", exitCode: 127 });
  assert.deepEqual(parseOsc133Sequence("A;special_key=1"), { kind: "A" });
  assert.equal(parseOsc133Sequence("Z"), null);
  assert.equal(parseOsc133Sequence(""), null);
});

test("prompt navigation uses the adjacent marker around its current anchor", () => {
  const promptLines = [5, 20, 42, 55];

  // The latest prompt can be below the viewport's top row. Previous must use
  // the cursor anchor so it does not skip prompts that are already visible.
  assert.equal(findPromptNavigationTarget(promptLines, 61, "previous"), 55);
  assert.equal(findPromptNavigationTarget(promptLines, 55, "previous"), 42);
  assert.equal(findPromptNavigationTarget(promptLines, 42, "next"), 55);
  assert.equal(findPromptNavigationTarget(promptLines, 55, "next"), null);
});

test("OSC 777 notify payloads decode title and body", () => {
  assert.deepEqual(decodeOsc777Notification("notify;Build;finished in 32s"), {
    title: "Build",
    body: "finished in 32s",
  });
  assert.deepEqual(decodeOsc777Notification("notify;just a message"), {
    title: null,
    body: "just a message",
  });
  // Body may itself contain semicolons.
  assert.deepEqual(decodeOsc777Notification("notify;t;a;b;c"), { title: "t", body: "a;b;c" });
  assert.equal(decodeOsc777Notification("other;x;y"), null);
  assert.equal(decodeOsc777Notification("notify;"), null);
});

test("hyperlink rule URL templates substitute and validate", () => {
  const match = "PROJ-123".match(/([A-Z]+)-(\d+)/);
  assert.ok(match);
  assert.equal(
    buildHyperlinkRuleUrl("https://tracker.example.com/browse/$0", match),
    "https://tracker.example.com/browse/PROJ-123",
  );
  assert.equal(
    buildHyperlinkRuleUrl("https://tracker.example.com/$1/$2", match),
    "https://tracker.example.com/PROJ/123",
  );
  assert.equal(buildHyperlinkRuleUrl("ftp://tracker.example.com/$0", match), null);
  assert.equal(buildHyperlinkRuleUrl("not a url $0", match), null);
});
