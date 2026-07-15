import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const viewerUrl = new URL(
  "../src/modules/workspace/connections/file-viewer/viewers/HexViewer.tsx",
  import.meta.url,
);
const workerUrl = new URL(
  "../src/modules/workspace/connections/file-viewer/viewers/hexWorker.ts",
  import.meta.url,
);

test("Document hex view decodes off-thread and mounts only a virtual row window", async () => {
  const [viewer, worker] = await Promise.all([
    readFile(viewerUrl, "utf8"),
    readFile(workerUrl, "utf8"),
  ]);

  assert.match(viewer, /decodeHexBase64InWorker\(base64\)/);
  assert.match(viewer, /const OVERSCAN_ROWS = \d+/);
  assert.match(viewer, /const virtualRows = useMemo/);
  assert.match(viewer, /style=\{\{ height: rowCount \* ROW_HEIGHT \}\}/);
  assert.match(viewer, /style=\{\{ top: row \* ROW_HEIGHT \}\}/);
  assert.doesNotMatch(viewer, /for \(let start = 0; start < bytes\.length/);

  assert.match(worker, /const binary = atob\(base64\)/);
  assert.match(worker, /\[bytes\.buffer\]/);
});
