import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/workspace/connections/ImportDialog.tsx", import.meta.url),
  "utf8",
);

test("bookmark discovery does not cancel its own in-flight request", () => {
  // Regression: the discovery effect wrote `setBookmarksLoading(true)` while
  // `bookmarksLoading` was in its dependency array. That re-ran the effect,
  // whose cleanup flipped `cancelled = true`, so the resolved request bailed
  // out and the dialog hung on "Looking for browser bookmark sources…"
  // forever — even on machines with no Firefox / no matching browser at all.
  assert.match(
    source,
    /const bookmarkDiscoveryRef = useRef\(false\)/,
    "discovery must be de-duplicated with a ref, not by re-triggering on its own loading state",
  );
  assert.match(
    source,
    /source !== "bookmarks" \|\| bookmarksLoaded \|\| bookmarkDiscoveryRef\.current/,
    "discovery should be gated by the ref + loaded flag, never by the loading flag it writes",
  );
  assert.doesNotMatch(
    source,
    /\}, \[[^\]]*bookmarksLoading[^\]]*\]\);/,
    "the loading flag must not be a dependency of the discovery effect — that is what cancelled the in-flight request",
  );
  assert.match(
    source,
    /setBookmarksLoaded\(true\);/,
    "bookmark discovery should mark the request as settled when it resolves",
  );
});
