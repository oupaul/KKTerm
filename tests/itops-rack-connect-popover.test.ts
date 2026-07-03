/// <reference types="node" />

// Rack-device connect popover (docs/SITE.md Rack View): binding collection is
// a pure function, and the popover wiring follows the overlay/native-surface
// rules — portaled to document.body, background-opens DOM surfaces with a
// Status Bar notice, and navigates to the Workspace for URL/RDP/VNC.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { RackItem } from "../src/types";
import { collectBoundConnectionIds } from "../src/modules/itops/rackInventory";

test("collectBoundConnectionIds merges the placed Connection with additional bindings", () => {
  const item = {
    id: "item-1",
    rackId: "rack-1",
    connectionId: "conn-primary",
    kind: "connection",
    label: "web-01",
    startU: 1,
    heightU: 1,
    metadata: { connectionIds: ["conn-extra", "conn-primary", " ", "conn-extra"] },
  } as RackItem;

  assert.deepEqual(collectBoundConnectionIds(item), ["conn-primary", "conn-extra"]);
});

test("collectBoundConnectionIds handles passive and unbound devices", () => {
  const passive = {
    id: "item-2",
    rackId: "rack-1",
    connectionId: null,
    kind: "switch",
    label: "sw-01",
    startU: 2,
    heightU: 1,
    metadata: { connectionIds: ["conn-mgmt"] },
  } as RackItem;
  const unbound = { ...passive, id: "item-3", metadata: {} } as RackItem;

  assert.deepEqual(collectBoundConnectionIds(passive), ["conn-mgmt"]);
  assert.deepEqual(collectBoundConnectionIds(unbound), []);
});

test("connect popover portals to body and splits DOM vs native-surface opens", async () => {
  const popover = await readFile(
    new URL("../src/modules/itops/RackItemConnectPopover.tsx", import.meta.url),
    "utf8",
  );

  // Overlay golden rule: escape the itops-page stacking context via the portal.
  assert.match(popover, /DialogPortal/);
  // Native-surface Sessions (WebView2/RDP/VNC) come up while the Workspace is
  // visible; DOM surfaces background-open with a Status Bar notice instead.
  assert.match(popover, /isRemoteDesktopConnectionType/);
  assert.match(popover, /connection\.type === "url"/);
  assert.match(popover, /showStatusBarNotice/);
  assert.match(popover, /itops\.racks\.connectOpenedNotice/);
  assert.match(popover, /itops\.racks\.goToSessionAction/);
  assert.match(popover, /itops\.racks\.connectAction/);
});

test("rack elevation opens the connect popover for any device with bindings", async () => {
  const elevation = await readFile(
    new URL("../src/modules/itops/RackElevation.tsx", import.meta.url),
    "utf8",
  );

  assert.match(elevation, /collectBoundConnectionIds\(item\)\.length > 0/);
  // The old kind gate is gone: bound passive devices are connectable too.
  assert.doesNotMatch(elevation, /kind === "connection" && !ghost && !!onOpenItem/);
});
