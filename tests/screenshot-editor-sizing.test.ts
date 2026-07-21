import assert from "node:assert/strict";
import test from "node:test";
import { fitImageDimensions } from "../src/modules/screenshots/editorSizing";

test("Fit mode contains a large image inside the padded editor stage", () => {
  assert.deepEqual(
    fitImageDimensions(3840, 2160, 1960, 900, 18),
    { width: 1536, height: 864 },
  );
});

test("Fit mode does not enlarge images that already fit", () => {
  assert.deepEqual(
    fitImageDimensions(640, 480, 1000, 800, 18),
    { width: 640, height: 480 },
  );
});
