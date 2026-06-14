import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultLayoutFor, leafOrder, splitLayout } from "../src/modules/workspace/layout";
import type { LayoutNode, WorkspacePane } from "../src/types";

function pane(id: string): WorkspacePane {
  return { id } as WorkspacePane;
}

test("splitLayout docks beside the hovered (non-focused) pane, not the focused one", () => {
  const base = defaultLayoutFor([pane("a"), pane("b")]);
  assert.ok(base, "two panes should produce a layout");

  // Drag-to-dock onto pane "b" with a downward split while "a" is focused.
  const next = splitLayout(base, "b", "down", "c", ["a", "b"]);

  assert.deepEqual(leafOrder(next), ["a", "b", "c"]);
  assert.equal(next.type, "split");
  if (next.type !== "split") {
    return;
  }
  assert.equal(next.orientation, "horizontal");
  const [first, second] = next.children;
  assert.equal(first.type, "leaf");
  if (first.type === "leaf") {
    assert.equal(first.paneId, "a", "untouched pane stays in place");
  }
  // The new pane is grouped with the hovered pane "b" in a vertical split.
  assert.equal(second.type, "split");
  if (second.type === "split") {
    assert.equal(second.orientation, "vertical");
    assert.deepEqual(leafOrder(second), ["b", "c"]);
  }
});

test("splitLayout honors 'left' by inserting the new pane before the target", () => {
  const base = defaultLayoutFor([pane("a"), pane("b")]) as LayoutNode;
  const next = splitLayout(base, "a", "left", "c", ["a", "b"]);
  assert.deepEqual(leafOrder(next), ["c", "a", "b"]);
});

test("addConnectionToTerminalPane accepts an explicit targetPaneId and falls back to the focused pane", async () => {
  const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

  assert.match(
    storeSource,
    /addConnectionToTerminalPane: \([\s\S]*?targetPaneId\??: string,?\s*\) => void/,
    "the action signature should expose an optional targetPaneId",
  );
  assert.match(
    storeSource,
    /addConnectionToTerminalPane: \(tabId, connection, direction, targetPaneId\) =>/,
  );
  assert.match(
    storeSource,
    /targetPaneId && tab\.panes\.find\(\(pane\) => pane\.id === targetPaneId\)/,
    "an explicit target should win, falling back to the focused pane",
  );
});

test("the Connection Tree drag wires Connections onto Workspace Canvas dock targets", async () => {
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );
  const terminalSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const canvasSource = await readFile(
    new URL("../src/modules/workspace/WorkspaceCanvas.tsx", import.meta.url),
    "utf8",
  );

  // DOM markers the hit-test relies on.
  assert.match(terminalSource, /data-dock-pane-id=\{pane\.id\}/);
  assert.match(terminalSource, /data-dock-tab-id=\{tabId\}/);
  assert.match(canvasSource, /data-dock-empty-canvas/);

  // Drag resolution: a split targets the hovered pane; empty canvas opens a Tab.
  assert.match(sidebarSource, /canvasDropZoneFromElement\(/);
  assert.match(sidebarSource, /addConnectionToTerminalPane\(zone\.tabId, connection, zone\.direction, zone\.paneId\)/);
  assert.match(sidebarSource, /completeCanvasDrop\(dragged\.connectionId, canvasZone\)/);
  assert.match(sidebarSource, /<DockOverlay zone=\{canvasDropZone\} \/>/);
});
