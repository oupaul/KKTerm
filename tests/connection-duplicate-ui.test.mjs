import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sidebar = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
  "utf8",
);

test("Connection Tree Duplicate opens an editable draft and persists only on submit", () => {
  assert.match(
    sidebar,
    /label: t\("connections\.duplicate"\)[\s\S]*?label: t\("connections\.delete"\)/,
  );
  assert.match(sidebar, /function handleTreeMenuDuplicate[\s\S]*?setDuplicateConnection\(\{/);
  assert.match(
    sidebar,
    /function handleConnectionDuplicate[\s\S]*?invokeCommand\("duplicate_connection"/,
  );
  assert.match(
    sidebar,
    /initialConnection=\{duplicateConnection\.connection\}[\s\S]*?onSubmit=\{handleConnectionDuplicate\}/,
  );
  assert.doesNotMatch(
    sidebar,
    /function handleTreeMenuDuplicate[\s\S]*?invokeCommand\("duplicate_connection"/,
  );
});
