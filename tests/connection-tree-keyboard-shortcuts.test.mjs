import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
  "utf8",
);

test("Connection Tree handles F2 rename and Delete on the focused connection row", () => {
  // The handler is wired on the tree container so it only fires when the tree
  // (not a terminal or text field) has keyboard focus.
  assert.match(source, /className=\{`tree-list [\s\S]*?onKeyDown=\{handleTreeKeyDown\}/);
  assert.match(source, /function handleTreeKeyDown\(event: ReactKeyboardEvent<HTMLDivElement>\)/);
  assert.match(source, /if \(event\.repeat\) \{\s*event\.preventDefault\(\);\s*return;/);
  // F2 renames on every platform; delete is the Delete key everywhere plus
  // Backspace / Cmd+Backspace on macOS (Finder convention).
  assert.match(source, /const isRename = event\.key === "F2";/);
  assert.match(
    source,
    /const isDelete =\s*event\.key === "Delete" \|\| \(isMacPlatform\(\) && event\.key === "Backspace"\);/,
  );
  // Typing in an input/textarea/editable is never hijacked.
  assert.match(source, /target\.closest\("input, textarea, \[contenteditable='true'\]"\)/);
  // An active inline rename (connection or child) is left alone.
  assert.match(source, /if \(inlineRenameTarget \|\| inlineChildRenameTarget\) \{\s*return;/);
  // Target resolves from the focused row, falling back to the current selection.
  assert.match(
    source,
    /\.connection-row\[data-connection-id\]"\)\?\.dataset\.connectionId;\s*const connectionId = rowConnectionId \?\? selectedConnectionId;/,
  );
  // F2 starts an inline rename; delete reuses the shared confirm-then-delete flow.
  assert.match(source, /if \(isRename\) \{[\s\S]*?setInlineRenameTarget\(\{ kind: "connection", id: connection\.id \}\)/);
  assert.match(source, /void requestDeleteTarget\(\{ kind: "connection", connection \}\)/);
});

test("Delete confirmation flow is shared between the context menu and the keyboard shortcut", () => {
  // requestDeleteTarget owns the native-dialog-or-fallback confirmation, and
  // the tree context menu delegates to it rather than duplicating the flow.
  assert.match(source, /async function requestDeleteTarget\(target: DeleteTarget\)/);
  assert.match(source, /async function handleTreeMenuDelete\(menu: TreeContextMenuState\)[\s\S]*?await requestDeleteTarget\(target\);/);
});
