import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const [
  defaults,
  activityRail,
  generalSettings,
  workspaceSettings,
  installerSettings,
  settingsPage,
] = await Promise.all([
  source("../src/app-defaults.ts"),
  source("../src/app/ActivityRail.tsx"),
  source("../src/modules/settings/GeneralSettings.tsx"),
  source("../src/modules/settings/WorkspaceSettings.tsx"),
  source("../src/modules/settings/InstallerSettings.tsx"),
  source("../src/modules/settings/SettingsPage.tsx"),
]);

test("General settings owns all built-in Activity Rail visibility controls", () => {
  assert.match(generalSettings, /normalizeActivityRailOrder\(draft\.activityRailOrder\)\.map/);
  assert.match(generalSettings, /reorderActivityRailItems/);
  assert.match(generalSettings, /activity-rail-order-main/);
  for (const icon of ["LayoutDashboard", "Gauge", "Package", "ServerCog", "BedSingle"]) {
    assert.match(generalSettings, new RegExp(`\\b${icon}\\b`));
  }
  for (const setting of [
    "showWorkspaceOnRail",
    "showDashboardOnRail",
    "showInstallerOnRail",
    "showItOps",
    "showDontSleepOnRail",
  ]) {
    assert.match(generalSettings, new RegExp(`"${setting}"`));
  }

  assert.doesNotMatch(workspaceSettings, /draft\.showWorkspaceOnRail/);
  assert.doesNotMatch(installerSettings, /draft\.showInstallerOnRail/);
  assert.doesNotMatch(settingsPage, /ItOpsSettings/);
});

test("Activity Rail visibility defaults and rendering match the unified controls", () => {
  assert.match(defaults, /showWorkspaceOnRail:\s*true/);
  assert.match(defaults, /showDashboardOnRail:\s*true/);
  assert.match(defaults, /showInstallerOnRail:\s*true/);
  assert.match(defaults, /showItOps:\s*false/);
  assert.match(defaults, /showDontSleepOnRail:\s*true/);
  assert.match(defaults, /activityRailOrder:\s*\[\.\.\.DEFAULT_ACTIVITY_RAIL_ORDER\]/);

  assert.match(activityRail, /generalSettings\.showWorkspaceOnRail\s*\?/);
  assert.match(activityRail, /generalSettings\.showDashboardOnRail\s*\?/);
  assert.match(activityRail, /generalSettings\.showInstallerOnRail/);
  assert.match(activityRail, /generalSettings\.showItOps/);
  assert.match(activityRail, /generalSettings\.showDontSleepOnRail\s*\?/);
  assert.match(activityRail, /normalizeActivityRailOrder/);
  assert.match(activityRail, /activityRailItemStyle/);
});
