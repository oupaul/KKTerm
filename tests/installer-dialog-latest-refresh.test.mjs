import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dialog = await readFile(
  new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
  "utf8",
);

test("each structured latest-version detail row can refresh only its recipe", () => {
  const refreshCalls = dialog.match(
    /installer_check_latest_versions",\s*\{\s*toolIds: \[recipe\.id\]/g,
  );
  assert.equal(
    refreshCalls?.length,
    2,
    "installed and not-installed details should each refresh only the open recipe",
  );
  assert.match(dialog, /function LatestVersionValue/);
  assert.match(dialog, /t\("installer\.refresh"\)/);
  assert.match(dialog, /disabled=\{checking\}/);
  assert.match(dialog, /installer-tool-dialog__latest-value/);
});
