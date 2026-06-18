import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Document unsupported files show explicit inline choices", async () => {
  const [workspaceSource, cssSource, enSource] = await Promise.all([
    readFile(
      new URL("../src/modules/workspace/connections/file-viewer/FileViewerWorkspace.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/modules/workspace/connections/file-viewer/file-viewer.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  ]);

  assert.match(
    workspaceSource,
    /function UnsupportedFileChoice[\s\S]*workspace\.fileViewer\.unsupportedTitle[\s\S]*onOpenText[\s\S]*onOpenHex[\s\S]*onOpenExternal/,
    "unsupported inline files should render a choice page with Text, Hex, and external-open actions",
  );
  assert.match(
    workspaceSource,
    /case "unsupported":[\s\S]*<UnsupportedFileChoice/,
    "unsupported must be a first-class viewer state instead of falling through to Hex",
  );
  assert.match(
    cssSource,
    /\.fv-unsupported-card/,
    "the unsupported choice page should use Document viewer styling",
  );
  assert.match(enSource, /"unsupportedTitle": "Unsupported file"/);
  assert.match(enSource, /"openAsText": "Open as Text"/);
  assert.match(enSource, /"openAsBinary": "Open as Binary"/);
  assert.match(enSource, /"openExternalEditor": "Open in External Editor"/);
});
