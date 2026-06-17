import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The main window is built with `disable_drag_drop_handler()` (required so the
// app's HTML5 drag-and-drop works on Windows), so Tauri's `onDragDropEvent`
// never fires and OS file drops never report a path. The SFTP remote pane must
// therefore NOT rely on that dead event stream for uploads — uploads come from
// the in-app pane-to-pane drag (`handleDropTransfer`) and the center transfer
// arrows instead.
test("SFTP workspace does not rely on the non-firing Tauri OS drag-drop stream", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/sftp/SftpWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /onDragDropEvent/,
    "OS drag-drop via Tauri never fires with the drag-drop handler disabled — it must not be reintroduced.",
  );
  assert.doesNotMatch(
    source,
    /isPositionOverRemotePane|enqueueDroppedLocalPaths/,
    "the dead OS-drop upload helpers should not return.",
  );
  assert.match(
    source,
    /onDropTransfer=\{isConnected && !isTransferring \? handleDropTransfer : undefined\}/,
    "uploads should still flow through the in-app pane-to-pane drag.",
  );
});
