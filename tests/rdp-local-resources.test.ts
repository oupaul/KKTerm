import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeRdpDriveSelection,
  normalizeRdpSharedLocalFolders,
} from "../src/modules/workspace/connections/remote-desktop/rdpLocalResources";

test("RDP selected drives normalize roots, case, and duplicates", () => {
  assert.deepEqual(
    normalizeRdpDriveSelection({ mode: "selected", drives: ["D:\\", "c:", "D:", "not-a-drive"] }),
    { mode: "selected", drives: ["C:", "D:"] },
  );
});

test("missing RDP drive selection remains backward-compatible with all drives", () => {
  assert.deepEqual(normalizeRdpDriveSelection(undefined), { mode: "all" });
});

test("RDP shared folders trim, deduplicate, and accept the legacy single folder", () => {
  assert.deepEqual(normalizeRdpSharedLocalFolders([" /tmp/a ", "/tmp/b", "/tmp/a"]), ["/tmp/a", "/tmp/b"]);
  assert.deepEqual(normalizeRdpSharedLocalFolders(undefined, " /tmp/legacy "), ["/tmp/legacy"]);
});
