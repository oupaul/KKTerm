import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const terminalWorkspace = await readFile(
  new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
  "utf8",
);
const terminalBackgroundPopover = await readFile(
  new URL("../src/modules/workspace/connections/terminal/TerminalBackgroundPopover.tsx", import.meta.url),
  "utf8",
);
const dashboardBackgroundPopover = await readFile(
  new URL("../src/modules/dashboard/edit/BackgroundPopover.tsx", import.meta.url),
  "utf8",
);
const sharedBackgroundPopover = await readFile(
  new URL("../src/modules/dashboard/edit/SharedBackgroundPopover.tsx", import.meta.url),
  "utf8",
);
const dynamicBackgroundRegistry = await readFile(
  new URL("../src/modules/dashboard/registry/dynamicBackgrounds.tsx", import.meta.url),
  "utf8",
);
const dynamicBackgroundPreviewArt = await readFile(
  new URL("../src/modules/dashboard/registry/dynamicBackgroundPreviewArt.tsx", import.meta.url),
  "utf8",
);
const workspaceSettings = await readFile(
  new URL("../src/modules/settings/WorkspaceSettings.tsx", import.meta.url),
  "utf8",
);
const appDefaults = await readFile(
  new URL("../src/app-defaults.ts", import.meta.url),
  "utf8",
);
const typesSource = await readFile(
  new URL("../src/types.ts", import.meta.url),
  "utf8",
);
const layoutSource = await readFile(
  new URL("../src/modules/workspace/layout.ts", import.meta.url),
  "utf8",
);
const storeSource = await readFile(
  new URL("../src/store.ts", import.meta.url),
  "utf8",
);
const architecture = await readFile(
  new URL("../docs/ARCHITECTURE.md", import.meta.url),
  "utf8",
);
const terminalManual = await readFile(
  new URL("../docs/manual/05-terminal.md", import.meta.url),
  "utf8",
);
const terminalCss = await readFile(
  new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
  "utf8",
);
const dashboardCss = await readFile(
  new URL("../src/modules/dashboard/dashboard.css", import.meta.url),
  "utf8",
);

test("Workspace settings exposes split terminal background scope defaulted off", () => {
  assert.match(typesSource, /separateSplitTerminalBackgrounds:\s*boolean/);
  assert.match(appDefaults, /separateSplitTerminalBackgrounds:\s*false/);
  assert.match(workspaceSettings, /settings\.separateSplitTerminalBackgrounds/);
  assert.match(workspaceSettings, /settings\.terminalBackgrounds/);
});

test("terminal background paints once at workspace scope unless split pane backgrounds are enabled", () => {
  assert.match(
    terminalWorkspace,
    /generalSettings\.separateSplitTerminalBackgrounds/,
  );
  assert.match(
    terminalWorkspace,
    /<TerminalBackgroundLayer\s+active=\{isActive\}\s+background=\{workspaceTerminalBackground\}/,
  );
  assert.match(terminalWorkspace, /terminal-workspace-has-background/);
  assert.match(
    terminalWorkspace,
    /background=\{usePaneTerminalBackgrounds \? terminalBackground : null\}/,
  );
  assert.match(
    terminalCss,
    /\.terminal-connection-background\s*\{[\s\S]*inset:\s*0;/,
    "shared terminal backgrounds must fill the full workspace surface",
  );
  assert.match(
    terminalCss,
    /\.quick-command-bar\s*\{[\s\S]*z-index:\s*1;/,
    "the quick command bar must remain above shared terminal backgrounds",
  );
});

test("split terminal pane backgrounds serialize with stored layouts", () => {
  assert.match(typesSource, /terminalBackground\?:\s*DashboardBackground\s*\|\s*null/);
  assert.match(layoutSource, /terminalBackground:\s*"terminalBackground" in pane/);
  assert.match(storeSource, /terminalBackground:\s*storedPane\.terminalBackground/);
});

test("terminal and Dashboard background pickers share the same component and datasource", () => {
  assert.match(terminalBackgroundPopover, /SharedBackgroundPopover/);
  assert.match(dashboardBackgroundPopover, /SharedBackgroundPopover/);
  assert.match(sharedBackgroundPopover, /extensions:\s*\[[^\]]*"svg"/);
  assert.doesNotMatch(terminalBackgroundPopover, /BACKGROUND_PRESETS\.map/);
  assert.doesNotMatch(terminalBackgroundPopover, /DYNAMIC_BACKGROUNDS\.map/);
});

test("dynamic background live preview stages selection and animates only one tile", () => {
  const previewDialog = sharedBackgroundPopover.slice(sharedBackgroundPopover.indexOf("function DynamicBackgroundPreviewDialog"));
  assert.match(sharedBackgroundPopover, /backgroundLivePreview/);
  assert.match(sharedBackgroundPopover, /DynamicBackgroundPreviewDialog/);
  assert.match(sharedBackgroundPopover, /zClassName="dw-bg-preview-backdrop"/);
  assert.match(sharedBackgroundPopover, /DYNAMIC_BACKGROUNDS\.map/);
  assert.match(sharedBackgroundPopover, /DynamicBackgroundPreviewArt id=\{backgroundOption\.id\}/);
  assert.match(dynamicBackgroundPreviewArt, /export function DynamicBackgroundPreviewArt/);
  assert.match(dynamicBackgroundPreviewArt, /export function dynamicBackgroundPreviewSvg/);
  assert.doesNotMatch(dynamicBackgroundRegistry, /dynamicBackgroundStaticPreviewStyle/);
  assert.doesNotMatch(dynamicBackgroundRegistry, /STATIC_PREVIEW_STYLES/);
  assert.match(previewDialog, /setDraft\(backgroundOption\.id\)/);
  assert.match(previewDialog, /onApply\(draft\)/);
  assert.match(
    sharedBackgroundPopover,
    /onApply=\{\(dynamicId\) => \{\s*applyDynamic\(dynamicId\);\s*setLivePreviewOpen\(false\);\s*onClose\(\);/s,
    "applying from the live preview should close the parent background picker",
  );
  assert.match(
    previewDialog,
    /selectedTile \? \(\s*<DashboardDynamicBackground id=\{backgroundOption\.id\} active \/>/s,
    "only the selected preview tile should mount an animated background",
  );
  assert.doesNotMatch(
    previewDialog,
    /applyDynamic\(backgroundOption\.id\)/,
    "preview tiles should stage selection until OK applies it",
  );
  assert.doesNotMatch(sharedBackgroundPopover, /backgroundLivePreviewHint/);
  assert.match(dashboardCss, /\.dw-bg-popover\s*\{[\s\S]*z-index:\s*200;/);
  assert.match(dashboardCss, /\.kk-dlg-backdrop\.dw-bg-preview-backdrop\s*\{[\s\S]*z-index:\s*220;/);
  assert.match(dashboardCss, /\.dw-bg-preview-art\s*\{[\s\S]*pointer-events:\s*none;/);
  assert.match(dashboardCss, /\.dw-bg-preview-frame \.dw-canvas-bg\s*\{[\s\S]*pointer-events:\s*none;/);
  assert.match(dashboardCss, /@keyframes driftX\s*\{/);
  assert.match(dashboardCss, /@keyframes sweep\s*\{/);
  assert.match(dashboardCss, /@keyframes dwbg_blob\s*\{[\s\S]*translate\(14px,\s*-10px\) scale\(1\.18\)/);
  assert.match(dashboardCss, /@keyframes dwbg_sway\s*\{[\s\S]*rotate\(-5deg\)[\s\S]*rotate\(5deg\)/);
});

test("docs make shared terminal background scope and datasource explicit", () => {
  assert.match(architecture, /shared background picker datasource/i);
  assert.match(architecture, /separateSplitTerminalBackgrounds/);
  assert.match(terminalManual, /terminal workspace content area/i);
  assert.match(terminalManual, /per-Pane terminal backgrounds/i);
});
