import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ACTIVITY_RAIL_ORDER,
  normalizeActivityRailOrder,
  reorderActivityRailItems,
} from "../src/app/activityRailOrder";

test("Activity Rail order defaults and repairs incomplete saved values", () => {
  assert.deepEqual(DEFAULT_ACTIVITY_RAIL_ORDER, [
    "workspace",
    "dashboard",
    "installer",
    "itops",
    "dontSleep",
  ]);
  assert.deepEqual(normalizeActivityRailOrder(["dontSleep", "workspace", "unknown"]), [
    "dontSleep",
    "workspace",
    "dashboard",
    "installer",
    "itops",
  ]);
});

test("Activity Rail items can be dragged into a new persisted order", () => {
  assert.deepEqual(
    reorderActivityRailItems(DEFAULT_ACTIVITY_RAIL_ORDER, "dontSleep", "dashboard"),
    ["workspace", "dontSleep", "dashboard", "installer", "itops"],
  );
});
