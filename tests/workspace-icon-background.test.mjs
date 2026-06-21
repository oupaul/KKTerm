import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const iconSource = await readFile(
  new URL("../src/modules/workspace/workspaceIcons.tsx", import.meta.url),
  "utf8",
);
const activityRailSource = await readFile(
  new URL("../src/app/ActivityRail.tsx", import.meta.url),
  "utf8",
);
const sidebarSource = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
  "utf8",
);
const appCss = await readFile(new URL("../src/app/app.css", import.meta.url), "utf8");

test("Workspace icon backgrounds separate glyph size from chip padding", () => {
  assert.match(
    iconSource,
    /shellSize\?: number;/,
    "WorkspaceIcon should let callers keep the default glyph size while choosing the colored chip footprint",
  );
  assert.match(iconSource, /"--workspace-icon-size": `\$\{size\}px`/);
  assert.match(iconSource, /"--workspace-icon-shell-size": `\$\{resolvedShellSize\}px`/);
});

test("Activity Rail Workspace icons keep the padded rail chip", () => {
  assert.match(activityRailSource, /const WORKSPACE_RAIL_ICON_SIZE = 18;/);
  assert.match(activityRailSource, /const WORKSPACE_RAIL_ICON_SHELL_SIZE = 24;/);
  assert.match(
    activityRailSource,
    /<WorkspaceIcon[\s\S]*?size=\{WORKSPACE_RAIL_ICON_SIZE\}[\s\S]*?shellSize=\{WORKSPACE_RAIL_ICON_SHELL_SIZE\}/,
    "custom Workspace icons in the rail should keep the same padded chip footprint as the default rail control",
  );
});

test("sidebar Workspace title icon covers the green module tile without enlarging the glyph", () => {
  assert.match(sidebarSource, /const WORKSPACE_HEADER_ICON_SIZE = 16;/);
  assert.match(sidebarSource, /const WORKSPACE_HEADER_ICON_SHELL_SIZE = 26;/);
  assert.match(
    sidebarSource,
    /<ModuleIconTile className=\{workspaceHeaderTileClassName\} module="workspace">/,
    "custom Workspace icons need a header tile class that disables the default green module tint",
  );
  assert.match(
    sidebarSource,
    /workspaceHeaderTileClassName[\s\S]*activeWorkspace\?\.isDefault[\s\S]*activeWorkspaceId === DEFAULT_WORKSPACE_ID[\s\S]*sidebar-workspace-custom-icon-tile/,
    "non-default Workspace icons should suppress the shared green Workspace tile chrome",
  );
  assert.match(
    appCss,
    /\.connection-sidebar \.module-header__tile\.sidebar-workspace-custom-icon-tile\s*\{[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none;/,
    "the custom Workspace header tile should not leave the green ModuleIconTile fill or shadow behind the custom icon",
  );
  assert.match(
    sidebarSource,
    /<WorkspaceIcon[\s\S]*?size=\{WORKSPACE_HEADER_ICON_SIZE\}[\s\S]*?shellSize=\{WORKSPACE_HEADER_ICON_SHELL_SIZE\}/,
    "custom Workspace icons in the title tile should cover the module tint while keeping the default 16px glyph",
  );
});
