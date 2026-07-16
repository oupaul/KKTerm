import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const activityRailSource = await readFile(
  new URL("../src/app/ActivityRail.tsx", import.meta.url),
  "utf8",
);

function sourceBetween(start, end) {
  const startIndex = activityRailSource.indexOf(start);
  const endIndex = activityRailSource.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing source marker: ${end}`);
  return activityRailSource.slice(startIndex, endIndex);
}

test("connected Activity Rail drag reuses an equivalent drop-target state", () => {
  const pointerMoveSource = sourceBetween(
    "function handleConnectedRailPointerMove(",
    "function handleConnectedRailPointerEnd(",
  );

  assert.match(
    pointerMoveSource,
    /setConnectionRailDropTarget\(\(currentTarget\) =>[\s\S]*currentTarget\?\.connectionId === targetConnectionId\.connectionId &&[\s\S]*currentTarget\.position === targetConnectionId\.position[\s\S]*\? currentTarget[\s\S]*: targetConnectionId/,
  );
  assert.match(
    pointerMoveSource,
    /if \(targetConnectionId\.connectionId !== drag\.connectionId\) \{\s*reorderConnectedRailItem\(drag\.connectionId, targetConnectionId\);/,
    "crossing to another target must still perform the live reorder",
  );
});

test("connected Activity Rail drag persists only a changed order", () => {
  const reorderSource = sourceBetween(
    "function reorderConnectedRailItem(",
    "function getConnectionRailDropTarget(",
  );

  assert.match(
    reorderSource,
    /nextOrder\.length === currentOrder\.length &&\s*nextOrder\.every\(\(connectionId, index\) => connectionId === currentOrder\[index\]\)/,
  );
  assert.match(
    reorderSource,
    /if \(orderUnchanged\) \{\s*return currentOrder;\s*\}\s*persistConnectionRailOrder\(nextOrder\);\s*return nextOrder;/,
    "an unchanged order must reuse state before the localStorage write",
  );
});
