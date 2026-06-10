// Behavioral tests for Dashboard script-widget schema validation. These call
// the real validators with concrete inputs and assert the accept/reject
// decisions, which is the contract callers actually depend on.
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseJsonObject,
  validateScriptWidgetBody,
} from "../src/modules/dashboard/schema.ts";

test("parseJsonObject distinguishes invalid JSON, non-objects, and objects", () => {
  assert.deepEqual(parseJsonObject('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.deepEqual(parseJsonObject("not json"), { ok: false, reason: "invalidJson" });
  assert.deepEqual(parseJsonObject("[1,2]"), { ok: false, reason: "invalidObject" });
});

test("validateScriptWidgetBody accepts a minimal well-formed body", () => {
  const result = validateScriptWidgetBody({ source: "const x = 1;", permissions: {} });
  assert.equal(result.ok, true);
});

test("validateScriptWidgetBody rejects missing/empty source and non-objects", () => {
  assert.deepEqual(validateScriptWidgetBody(null), { ok: false, reason: "invalidScriptBody" });
  assert.deepEqual(validateScriptWidgetBody({ permissions: {} }), {
    ok: false,
    reason: "invalidScriptBody",
  });
  assert.deepEqual(validateScriptWidgetBody({ source: "   ", permissions: {} }), {
    ok: false,
    reason: "invalidScriptBody",
  });
});

test("validateScriptWidgetBody rejects malformed permissions, lifecycle, and libraries", () => {
  assert.deepEqual(
    validateScriptWidgetBody({ source: "x", permissions: { pollSeconds: "soon" } }),
    { ok: false, reason: "invalidPollSeconds" },
  );
  assert.deepEqual(
    validateScriptWidgetBody({ source: "x", permissions: {}, lifecycle: { kind: "bogus" } }),
    { ok: false, reason: "invalidScriptBody" },
  );
  assert.deepEqual(
    validateScriptWidgetBody({ source: "x", permissions: {}, libraries: ["NotAValidKey!"] }),
    { ok: false, reason: "invalidLibraries" },
  );
});
