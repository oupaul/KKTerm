import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("IT Ops topology defaults use the requested line icons", async () => {
  const icons = await read("src/modules/itops/icons.tsx");
  const activityRail = await read("src/app/ActivityRail.tsx");
  const itopsModule = await read("src/modules/itops/ItOpsModule.tsx");
  const itopsCss = await read("src/modules/itops/itops.css");
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const siteDialog = await read("src/modules/itops/SiteDialog.tsx");
  const serverRoomDialog = await read("src/modules/itops/ServerRoomDialog.tsx");

  assert.match(icons, /from "\.\.\/\.\.\/lib\/reicon"/);
  assert.match(icons, /Cabinet/);
  assert.match(icons, /ServerSquare/);
  assert.match(icons, /export function ItOpsModuleIcon/);
  assert.match(icons, /<ServerSquare size=\{size\} strokeWidth=\{sw \?\? 1\.7\} weight="Filled" \/>/);
  assert.match(icons, /site: \(p\) => LineIconGlyph\(Buildings2, p\)/);
  assert.match(icons, /room: \(p\) => LineIconGlyph\(ServerSquare, p, "Filled"\)/);
  assert.match(icons, /rack: \(p\) => LineIconGlyph\(Cabinet, p\)/);
  assert.match(icons, /rows: \(p\) => LineIconGlyph\(Rows3, p\)/);
  assert.match(icons, /grid: \(p\) => LineIconGlyph\(Grid2x2, p\)/);
  assert.match(icons, /cube: \(p\) => LineIconGlyph\(Box, p\)/);
  assert.match(activityRail, /import \{ ItOpsModuleIcon \} from "\.\.\/modules\/itops\/icons"/);
  assert.match(activityRail, /<ItOpsModuleIcon size=\{18\} \/>/);
  assert.doesNotMatch(activityRail, /<ItIcon name="ops"/);
  assert.match(itopsModule, /import \{ ItOpsModuleIcon \} from "\.\/icons"/);
  assert.match(itopsModule, /<ModuleHeaderLead className="it-head-txt">/);
  assert.match(itopsModule, /<ItOpsModuleIcon size=\{16\} \/>/);
  const sideHeadBlock = itopsCss.match(/\.itops-page \.it-side-head \{(?<body>[\s\S]*?)\}/)?.groups?.body ?? "";
  assert.doesNotMatch(sideHeadBlock, /padding:/);
  assert.match(sites, /return group\.filter \? "filter" : "site"/);
  assert.match(sites, /<ItIcon name="site" size=\{14\} \/>/);
  assert.match(sites, /<ItIcon name="rack" size=\{14\} \/>/);
  assert.match(sites, /icon="room"/);
  assert.match(sites, /icon="rack"/);
  assert.match(siteDialog, /DEFAULT_SITE_ICON_REF = reiconIconRefForName\("Buildings2"\)/);
  assert.match(siteDialog, /defaultIconDataUrl=\{DEFAULT_SITE_ICON_REF\}/);
  assert.match(serverRoomDialog, /DEFAULT_SERVER_ROOM_ICON_REF = reiconIconRefForName\("ServerSquare"\)/);
  assert.match(serverRoomDialog, /defaultIconDataUrl=\{DEFAULT_SERVER_ROOM_ICON_REF\}/);
});

test("shared line icon selectors expose Site, Server Room, and Rack icons", async () => {
  const reiconNames = await read("src/lib/reiconNames.ts");
  const workspaceIcons = await read("src/modules/workspace/workspaceIcons.tsx");
  const dashboardValidation = await read("src-tauri/src/dashboard_validation.rs");

  for (const iconName of ["Buildings2", "ServerSquare", "Cabinet"]) {
    assert.match(reiconNames, new RegExp(`"${iconName}"`), `${iconName} missing from dashboard selector`);
    assert.match(workspaceIcons, new RegExp(`"${iconName}"`), `${iconName} missing from workspace selector`);
    assert.match(dashboardValidation, new RegExp(`"${iconName}"`), `${iconName} missing from dashboard validator`);
  }
});

test("Connection icon picker keeps line-icon background and foreground separate", async () => {
  const picker = await read("src/modules/workspace/connections/ConnectionIconPicker.tsx");
  const palette = await read("src/modules/workspace/connections/ConnectionIconBackgroundPicker.tsx");
  const icon = await read("src/modules/workspace/connections/ConnectionIcon.tsx");
  const css = await read("src/modules/workspace/connections/connections.css");
  const types = await read("src/types.ts");
  const tauri = await read("src/lib/tauri.ts");

  assert.match(palette, /ConnectionIconColorPicker/);
  assert.match(palette, /kind=\{[\s\S]*?"foreground"[\s\S]*\}/);
  assert.match(picker, /iconColor\?: string \| null/);
  assert.match(picker, /iconColor=\{iconColor\}/);
  // The foreground palette now lives inside the icon selector popover and only
  // renders for foreground-capable line glyphs.
  assert.match(icon, /export function iconSupportsForegroundColor/);
  assert.match(icon, /reiconIconNameFromRef\(src\) \?\? lucideIconNameFromRef\(src\)/);
  assert.match(icon, /getReiconIconComponent\(iconName\) !== null/);
  assert.match(picker, /reiconIconRefForName/);
  assert.match(picker, /import \{ ConnectionIconColorPicker \} from "\.\/ConnectionIconBackgroundPicker"/);
  assert.match(picker, /onIconColorChange\?: \(iconColor: string \| null\) => void/);
  assert.match(picker, /const supportsForeground = iconSupportsForegroundColor\(/);
  assert.match(picker, /onIconColorChange && supportsForeground \? \([\s\S]*?ConnectionIconColorPicker color=\{iconColor\} kind="foreground"/);
  assert.match(picker, /defaultIconDataUrl\?: string \| null/);
  assert.match(picker, /previewIconDataUrl = currentIconDataUrl \?\? defaultIconDataUrl \?\? null/);
  assert.match(picker, /iconDataUrl=\{previewIconDataUrl\}/);
  assert.match(icon, /"--connection-icon-fg": iconColor \?\? \(hasBackground/);
  assert.match(icon, /function iconForegroundForBackground/);
  assert.match(css, /color: var\(--connection-icon-fg\);[\s\S]*background: var\(--connection-icon-bg\);/);
  assert.match(types, /iconColor\?: string \| null;[\s\S]*iconDataUrl\?: string \| null;[\s\S]*iconBackgroundColor\?: string \| null;/);
  assert.match(tauri, /update_connection_icon_color/);
});

test("IT Ops topology icons choose a readable default foreground for light backgrounds", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.match(sites, /function iconForegroundForBackground/);
  assert.match(
    sites,
    /background: customIcon\.iconBackgroundColor,[\s\S]*color: iconForegroundForBackground\(customIcon\.iconBackgroundColor\)/,
    "Site and Server Room glyphs should not stay white when their selected background is light",
  );
});
