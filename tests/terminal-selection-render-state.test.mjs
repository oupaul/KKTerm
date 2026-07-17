import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceSource = await readFile(
  new URL(
    "../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("terminal selection text stays outside React render state", () => {
  assert.match(workspaceSource, /const selectedTerminalTextRef = useRef\(""\);/);
  assert.match(
    workspaceSource,
    /const \[hasTerminalSelection, setHasTerminalSelection\] = useState\(false\);/,
  );
  assert.match(
    workspaceSource,
    /function updateTerminalSelection\(selection: string\) \{\s*selectedTerminalTextRef\.current = selection;\s*setHasTerminalSelection\(Boolean\(selection\)\);\s*\}/,
  );
  assert.doesNotMatch(workspaceSource, /setSelectedTerminalText/);
  assert.match(workspaceSource, /disabled=\{!hasTerminalSelection\}/);
});

test("terminal copy paths retain the latest full selection", () => {
  const selectionHandler =
    workspaceSource.match(/terminal\.onSelectionChange\(\(\) => \{([\s\S]*?)\n    \}\)/)?.[1] ?? "";
  assert.match(selectionHandler, /updateTerminalSelection\(selection\)/);
  assert.match(selectionHandler, /void writeToClipboard\(selection\)/);

  const copyHandler =
    workspaceSource.match(/function handleCopyTerminalSelection\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  // The fork reads through readActiveTerminalSelection(), which reads the xterm
  // selection, then the native DOM selection (SSH panes on macOS produce a
  // browser selection xterm does not track), then falls back to the saved ref.
  assert.match(copyHandler, /readActiveTerminalSelection\(\)/);
  assert.match(copyHandler, /void writeToClipboard\(text\)/);

  // The ref fallback (retaining the latest full selection after WKWebView
  // clears it on mouse release) lives in readActiveTerminalSelection.
  const readSelectionHelper =
    workspaceSource.match(/function readActiveTerminalSelection\(\)[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.match(readSelectionHelper, /selectedTerminalTextRef\.current/);

  assert.match(workspaceSource, /updateTerminalSelection\(""\);/);
});
