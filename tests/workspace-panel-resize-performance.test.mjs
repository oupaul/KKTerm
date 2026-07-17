import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutSource = await readFile(
  new URL("../src/app/workspaceChromeLayout.tsx", import.meta.url),
  "utf8",
);
const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("workspace panel dragging updates CSS at most once per animation frame", () => {
  assert.match(
    layoutSource,
    /pendingMove = pointerEvent;[\s\S]*?requestAnimationFrame\(flushPendingMove\)/,
    "pointer moves should be coalesced to the browser paint cadence",
  );
  assert.match(
    layoutSource,
    /--connection-panel-width", `\$\{nextWidth\}px`/,
    "the Connections panel should resize without a React render for every pointer event",
  );
  assert.match(
    layoutSource,
    /--ai-panel-width", `\$\{nextWidth\}px`/,
    "the AI panel should resize without a React render for every pointer event",
  );
});

test("workspace panel dragging flushes and persists the exact final width", () => {
  assert.match(
    layoutSource,
    /if \(animationFrame !== null\)[\s\S]*?cancelAnimationFrame\(animationFrame\)[\s\S]*?flushPendingMove\(\);\s*onEnd\(persistImmediately\);/,
    "drag completion should flush the last pending pointer move before committing state",
  );
  assert.match(layoutSource, /pointercancel", handlePointerEnd/);
  assert.match(layoutSource, /lostpointercapture", handleLostPointerCapture/);
  assert.match(layoutSource, /activeDragRef\.current\?\.\(true\)/);
  assert.match(
    layoutSource,
    /if \(persistImmediately\) \{\s*persistPanelLayout\(CONNECTION_PANEL_LAYOUT_KEY/,
    "an app unmount during a drag should still save the final Connections width",
  );
  assert.match(
    layoutSource,
    /if \(persistImmediately\) \{\s*persistPanelLayout\(AI_PANEL_LAYOUT_KEY/,
    "an app unmount during a drag should still save the final AI width",
  );
  assert.match(
    appSource,
    /useWorkspaceChromeLayout\(\s*resetAllLayouts,\s*appShellRef,/,
    "the layout hook needs the shell node for render-free drag updates",
  );
});

test("clicking a resize handle without moving preserves the panel layout", () => {
  assert.equal(
    layoutSource.match(/if \(!hasMoved\) \{\s*return;\s*\}/g)?.length,
    2,
    "both panel commit paths should ignore click-only resize gestures",
  );
});
