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
  assert.match(
    copyHandler,
    /terminalRendererRef\.current\?\.getSelection\(\) \|\| selectedTerminalTextRef\.current/,
  );
  assert.match(copyHandler, /void writeToClipboard\(text\)/);

  assert.match(workspaceSource, /updateTerminalSelection\(""\);/);
});
