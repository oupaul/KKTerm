import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Host bindings list Connections across every Workspace", async () => {
  const source = await readFile("src/modules/itops/HostBindingsDialog.tsx", "utf8");

  assert.match(source, /invokeCommand\("list_connection_tree"\)/);
  assert.doesNotMatch(source, /workspaceId/);
});
