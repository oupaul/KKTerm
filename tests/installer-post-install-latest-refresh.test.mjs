import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/modules/installer/InstallerPage.tsx", import.meta.url),
  "utf8",
);

test("completed installs immediately refresh the selected provider latest version", () => {
  const completedBranch = source.slice(
    source.indexOf('if (event.payload.kind === "completed")'),
    source.indexOf('void invokeCommand("installer_redetect"'),
  );

  assert.match(
    completedBranch,
    /invokeCommand\("installer_check_latest_versions",\s*\{\s*toolIds:\s*\[toolId\]/,
    "a completed update must replace stale latest-version state without waiting for the next interval sweep",
  );
});
