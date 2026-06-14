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

test("Quick Command blocking dialogs portal to the app window via the dialog kit", async () => {
  const source = await readFile(
    new URL("../src/modules/workspace/connections/terminal/QuickCommandBar.tsx", import.meta.url),
    "utf8",
  );
  // DialogShell createPortals to document.body, so the manager/add/library
  // dialogs escape the contained terminal pane just like the legacy portal.
  assert.match(source, /DialogShell/, "Quick Command dialogs should mount through the dialog-kit DialogShell");
  for (const dialog of ["QuickCommandManagerDialog", "CustomCommandDialog", "PresetLibraryDialog"]) {
    assert.match(source, new RegExp(`function ${dialog}`), `Quick Command should still render ${dialog}`);
  }
  // The add/library subdialogs opt into the stacking scrim class.
  assert.match(
    source,
    /zClassName="kk-qc-subdialog"/,
    "Quick Command add/library subdialogs should request the stacking backdrop class",
  );

  const shellSource = await readFile(new URL("../src/app/ui/dialog/Sheet.tsx", import.meta.url), "utf8");
  assert.match(
    shellSource,
    /createPortal\([\s\S]*document\.body/,
    "DialogShell should portal its backdrop to document.body",
  );
});

test("Quick Command subdialogs stack above the manager dialog", async () => {
  const dialogStyles = await readFile(new URL("../src/app/ui/dialog/dialogs.css", import.meta.url), "utf8");
  const baseBackdropZIndex = Number(
    dialogStyles.match(/\.kk-dlg-backdrop\s*\{[^}]*z-index:\s*(\d+);/s)?.[1] ?? Number.NaN,
  );
  const subdialogBackdropRule =
    dialogStyles.match(/\.kk-dlg-backdrop\.kk-qc-subdialog\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
  const subdialogBackdropZIndex = Number(subdialogBackdropRule.match(/z-index:\s*(\d+);/)?.[1] ?? Number.NaN);

  assert.ok(Number.isFinite(baseBackdropZIndex), "shared dialog-kit backdrop should define a z-index");
  assert.ok(Number.isFinite(subdialogBackdropZIndex), "Quick Command subdialog backdrop should define a z-index");
  assert.ok(
    subdialogBackdropZIndex > baseBackdropZIndex,
    "Quick Command add/library dialogs should stack above the manager dialog backdrop",
  );
  assert.match(
    subdialogBackdropRule,
    /background:\s*transparent;/,
    "Quick Command add/library dialogs should not stack another visual dim over the manager backdrop",
  );
  assert.doesNotMatch(
    subdialogBackdropRule,
    /backdrop-filter:/,
    "Quick Command add/library dialogs should keep the parent dialog's blur/dim level unchanged",
  );
});

test("Assistant image preview escapes the AI Assistant Panel and remains RDP-blocking", async () => {
  const assistantSource = await readFile(new URL("../src/ai/AssistantMessageView.tsx", import.meta.url), "utf8");
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
