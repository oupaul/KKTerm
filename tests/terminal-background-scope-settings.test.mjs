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
  assert.match(
    terminalWorkspace,
    /background=\{usePaneTerminalBackgrounds \? terminalBackground : null\}/,
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
  assert.doesNotMatch(terminalBackgroundPopover, /BACKGROUND_PRESETS\.map/);
  assert.doesNotMatch(terminalBackgroundPopover, /DYNAMIC_BACKGROUNDS\.map/);
});

test("docs make shared terminal background scope and datasource explicit", () => {
  assert.match(architecture, /shared background picker datasource/i);
  assert.match(architecture, /separateSplitTerminalBackgrounds/);
  assert.match(terminalManual, /terminal workspace content area/i);
  assert.match(terminalManual, /per-Pane terminal backgrounds/i);
});
