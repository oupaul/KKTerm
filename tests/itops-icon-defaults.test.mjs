import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("IT Ops topology defaults use the requested Lucide icons", async () => {
  const icons = await read("src/modules/itops/icons.tsx");
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const siteDialog = await read("src/modules/itops/SiteDialog.tsx");
  const serverRoomDialog = await read("src/modules/itops/ServerRoomDialog.tsx");

  assert.match(icons, /import \{ Building2, Server, ShelvingUnit \} from "lucide-react"/);
  assert.match(icons, /site: \(p\) => LucideGlyph\(Building2, p\)/);
  assert.match(icons, /room: \(p\) => LucideGlyph\(Server, p\)/);
  assert.match(icons, /rack: \(p\) => LucideGlyph\(ShelvingUnit, p\)/);
  assert.match(sites, /return group\.filter \? "filter" : "site"/);
  assert.match(sites, /<ItIcon name="site" size=\{14\} \/>/);
  assert.match(sites, /<ItIcon name="rack" size=\{14\} \/>/);
  assert.match(sites, /icon="room"/);
  assert.match(sites, /icon="rack"/);
  assert.match(siteDialog, /DEFAULT_SITE_ICON_REF = lucideIconRefForName\("Building2"\)/);
  assert.match(siteDialog, /defaultIconDataUrl=\{DEFAULT_SITE_ICON_REF\}/);
  assert.match(serverRoomDialog, /DEFAULT_SERVER_ROOM_ICON_REF = lucideIconRefForName\("Server"\)/);
  assert.match(serverRoomDialog, /defaultIconDataUrl=\{DEFAULT_SERVER_ROOM_ICON_REF\}/);
});

test("shared Lucide icon selectors expose Site, Server Room, and Rack icons", async () => {
  const dashboardTypes = await read("src/modules/dashboard/types.ts");
  const workspaceIcons = await read("src/modules/workspace/workspaceIcons.tsx");
  const dashboardValidation = await read("src-tauri/src/dashboard_validation.rs");

  for (const iconName of ["Building2", "Server", "ShelvingUnit"]) {
    assert.match(dashboardTypes, new RegExp(`"${iconName}"`), `${iconName} missing from dashboard selector`);
    assert.match(workspaceIcons, new RegExp(`"${iconName}"`), `${iconName} missing from workspace selector`);
    assert.match(dashboardValidation, new RegExp(`"${iconName}"`), `${iconName} missing from dashboard validator`);
  }
});

test("Connection icon picker keeps Lucide background and foreground separate", async () => {
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
  // renders for Lucide-capable glyphs.
  assert.match(icon, /export function iconSupportsForegroundColor/);
  assert.match(icon, /lucideIconNameFromRef\(src\) !== null/);
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
