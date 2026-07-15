import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRdpDriveSelection } from "../src/modules/workspace/connections/remote-desktop/rdpLocalResources";

test("RDP selected drives normalize roots, case, and duplicates", () => {
  assert.deepEqual(
    normalizeRdpDriveSelection({ mode: "selected", drives: ["D:\\", "c:", "D:", "not-a-drive"] }),
    { mode: "selected", drives: ["C:", "D:"] },
  );
});

test("missing RDP drive selection remains backward-compatible with all drives", () => {
  assert.deepEqual(normalizeRdpDriveSelection(undefined), { mode: "all" });
});
