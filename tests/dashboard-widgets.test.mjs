import assert from "node:assert/strict";
import test from "node:test";
import { DASHBOARD_BUILTIN_WIDGETS } from "../src/modules/dashboard/widgets.ts";

test("App Launcher is available as a built-in Dashboard widget", () => {
  const widget = DASHBOARD_BUILTIN_WIDGETS.find((entry) => entry.id === "app-launcher");

  assert.deepEqual(widget, {
    id: "app-launcher",
    kind: "appLauncher",
    category: "quick",
    titleKey: "appLauncher.title",
    summaryKey: "appLauncher.subtitle",
    createdBy: "builtIn",
  });
});
