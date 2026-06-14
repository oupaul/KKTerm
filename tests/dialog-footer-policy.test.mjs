import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

// Guard for the dialog footer paradigm (docs/DESIGN_LANGUAGE.md → "Footer &
// buttons"). The legacy `connection-dialog-footer` class has NO CSS rule, so any
// dialog that uses it falls back to default block flow: footer buttons stack to
// the left, with no gap, no bottom-right anchor, and no consistent sizing. New
// dialogs must build footers from the dialog-kit `Actions`/`Sheet` footer, or —
// for legacy `.connection-dialog` surfaces — the styled, right-anchored
// `.dialog-actions` row. Confirmations must use `ConfirmSheet`.

const SRC_ROOT = new URL("../src/", import.meta.url);

async function sourceFiles(directory, pattern = /\.(tsx|ts)$/) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const childUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) {
        return sourceFiles(childUrl, pattern);
      }
      if (pattern.test(entry.name) && !entry.name.endsWith(".test.ts")) {
        return [childUrl];
      }
      return [];
    }),
  );
  return files.flat();
}

test("no dialog uses the unstyled `connection-dialog-footer` class", async () => {
  const files = await sourceFiles(SRC_ROOT);
  const offenders = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (source.includes("connection-dialog-footer")) {
      offenders.push(file.pathname.replace(/.*\/src\//, "src/"));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `connection-dialog-footer is a dead class with no CSS — it renders a left-aligned, ` +
      `gap-less, icon-less footer. Use the dialog-kit Actions/Sheet footer (or the styled ` +
      `.dialog-actions row for legacy .connection-dialog surfaces) instead. Offending files: ` +
      offenders.join(", "),
  );
});

test("Delete Workspace confirmation uses the shared ConfirmSheet template", async () => {
  const source = await readFile(
    new URL("modules/workspace/WorkspaceRailDialogs.tsx", SRC_ROOT),
    "utf8",
  );
  assert.match(
    source,
    /<ConfirmSheet[\s\S]*tone="danger"/,
    "DeleteWorkspaceDialog must render through ConfirmSheet (tone=\"danger\"), not hand-rolled markup",
  );
});
