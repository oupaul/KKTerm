import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("adding a saved Connection does not show a success notification", async () => {
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  const submitHandler = sidebarSource.slice(
    sidebarSource.indexOf("async function handleConnectionSubmit("),
    sidebarSource.indexOf("async function handleConnectionUpdate("),
  );
  assert.ok(submitHandler, "handleConnectionSubmit implementation should be discoverable");
  assert.match(
    submitHandler,
    /await handleConnectionSaved\(connection\);/,
    "adding a saved Connection should still refresh Connection state",
  );
  assert.doesNotMatch(
    submitHandler,
    /createConnectionComplete|showConnectionSuccessStatus/,
    "successful saved Connection creation should stay quiet",
  );
});
