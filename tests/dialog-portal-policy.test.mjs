import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const portalBackdrops = [
  {
    name: "ConnectionSidebar blocking dialogs",
    path: "../src/modules/workspace/connections/ConnectionSidebar.tsx",
    backdrops: [
      "connection-dialog child-connection-properties-dialog",
      'usesTwoColumnOptions ? "connection-dialog connection-dialog-wide" : "connection-dialog"',
      "connection-dialog ssh-key-email-dialog",
      "connection-dialog ssh-public-key-dialog",
    ],
  },
  {
    name: "Connection import dialog",
    path: "../src/modules/workspace/connections/ImportDialog.tsx",
    backdrops: ["connection-dialog import-dialog"],
  },
  {
    name: "Terminal Quick Command blocking dialogs",
    path: "../src/modules/workspace/connections/terminal/QuickCommandBar.tsx",
    backdrops: [
      "quick-command-dialog quick-command-manager-dialog",
      "quick-command-dialog quick-command-custom-dialog",
      "quick-command-dialog quick-command-preset-dialog",
    ],
  },
];

test("blocking dialogs mounted from contained panes use the app-window DialogPortal", async () => {
  for (const entry of portalBackdrops) {
    const source = await readFile(new URL(entry.path, import.meta.url), "utf8");
    assert.match(source, /DialogPortal/, `${entry.name} should import/use DialogPortal`);

    for (const backdropMarker of entry.backdrops) {
      const markerIndex = source.indexOf(backdropMarker);
      assert.notEqual(markerIndex, -1, `${entry.name} should still render ${backdropMarker}`);
      const precedingSource = source.slice(Math.max(0, markerIndex - 260), markerIndex);
      assert.match(
        precedingSource,
        /<DialogPortal>\s*<div className="dialog-backdrop connection-dialog-backdrop/,
        `${entry.name} should portal ${backdropMarker} to document.body instead of the containing pane`,
      );
    }
  }
});

test("Quick Command subdialogs stack above the manager dialog", async () => {
  const terminalStyles = await readFile(new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url), "utf8");
  const baseStyles = await readFile(new URL("../src/styles/base.css", import.meta.url), "utf8");

  const managerBackdropZIndex = Number(
    baseStyles.match(/\.connection-dialog-backdrop\s*\{[^}]*z-index:\s*(\d+);/s)?.[1] ?? Number.NaN,
  );
  const subdialogBackdropZIndex = Number(
    terminalStyles.match(/\.quick-command-subdialog-backdrop\s*\{[^}]*z-index:\s*(\d+);/s)?.[1] ?? Number.NaN,
  );

  assert.ok(Number.isFinite(managerBackdropZIndex), "shared connection dialog backdrop should define a z-index");
  assert.ok(Number.isFinite(subdialogBackdropZIndex), "Quick Command subdialog backdrop should define a z-index");
  assert.ok(
    subdialogBackdropZIndex > managerBackdropZIndex,
    "Quick Command add/library dialogs should stack above the manager dialog backdrop",
  );
});

test("Assistant image preview escapes the AI Assistant Panel and remains RDP-blocking", async () => {
  const assistantSource = await readFile(new URL("../src/ai/AssistantPanel.tsx", import.meta.url), "utf8");
  const assistantStyles = await readFile(new URL("../src/ai/assistant.css", import.meta.url), "utf8");
  const nativeOverlaySource = await readFile(new URL("../src/modules/workspace/nativeOverlay.ts", import.meta.url), "utf8");

  assert.match(
    assistantSource,
    /createPortal\(\s*<div\s+className="assistant-image-preview-backdrop"[\s\S]*?,\s*document\.body,\s*\)/,
    "Assistant image preview should be mounted at document.body, not inside the AI Assistant Panel",
  );
  assert.match(
    assistantStyles,
    /\.assistant-image-preview-backdrop\s*\{[^}]*position:\s*fixed;/s,
    "Assistant image preview backdrop should be fixed to the app viewport",
  );
  assert.match(
    nativeOverlaySource,
    /"\.assistant-image-preview-backdrop"/,
    "RDP native overlay parking should treat the Assistant image preview as a blocking overlay",
  );
});
