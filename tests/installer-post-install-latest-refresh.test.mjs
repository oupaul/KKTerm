import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/modules/installer/InstallerPage.tsx", import.meta.url),
  "utf8",
);

test("completed installs immediately refresh the selected provider latest version", () => {
  const redetectStart = source.indexOf(
    'void invokeCommand("installer_redetect"',
  );
  const redetectBranch = source.slice(
    redetectStart,
    source.indexOf(".catch(() => {", redetectStart),
  );

  assert.match(
    redetectBranch,
    /setOneDetected\(toolId, next\)[\s\S]*event\.payload\.kind === "completed"[\s\S]*recipeSupportsManagedLatestVersion\(completedRecipe, next\)[\s\S]*invokeCommand\("installer_check_latest_versions",\s*\{\s*toolIds:\s*\[toolId\]/,
    "a completed update must re-detect provenance before replacing stale latest-version state",
  );
});
