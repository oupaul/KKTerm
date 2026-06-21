import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Connections Panel heading follows the active Workspace title", async () => {
  const [sidebarSource, enLocaleSource] = await Promise.all([
    readFile(
      new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  ]);
  const enLocale = JSON.parse(enLocaleSource);

  assert.equal(enLocale.workspace.defaultWorkspaceTitle, "Default Workspace");
  assert.match(
    sidebarSource,
    /state\.workspaces\.find\(\(workspace\) => workspace\.id === state\.activeWorkspaceId\)/,
    "the Connections Panel should read the active Workspace record",
  );
  assert.match(
    sidebarSource,
    /activeWorkspace\?\.isDefault \|\| activeWorkspaceId === DEFAULT_WORKSPACE_ID[\s\S]*t\("workspace\.defaultWorkspaceTitle"\)/,
    "the Default Workspace should use the full localized panel title",
  );
  assert.match(
    sidebarSource,
    /activeWorkspace\?\.name \|\| t\("connections\.title"\)/,
    "non-default Workspaces should use their saved Workspace name with a generic fallback",
  );
  assert.match(
    sidebarSource,
    /<ModuleHeaderTitle>\{panelTitle\}<\/ModuleHeaderTitle>/,
    "the sidebar heading should render the derived panel title through the shared Module header",
  );
});
