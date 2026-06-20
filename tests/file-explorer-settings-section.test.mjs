import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("File Explorer settings have a dedicated colored navigation section", async () => {
  const [settingsPage, workspaceSettings, fileExplorerSettings, assistantContext] =
    await Promise.all([
      readFile(new URL("../src/modules/settings/SettingsPage.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/modules/settings/WorkspaceSettings.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/modules/settings/FileExplorerSettings.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../src/modules/settings/settingsAssistantContext.ts", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(settingsPage, /"file-explorer-settings"/);
  assert.match(
    settingsPage,
    /id: "file-explorer-settings", Icon: FolderOpen, color: "#[0-9a-f]{6}", labelKey: "settings\.fileExplorer"/i,
  );
  assert.match(
    settingsPage,
    /renderSettingsSection\("file-explorer-settings", <FileExplorerSettings \/>\)/,
  );
  assert.match(fileExplorerSettings, /settings\.fileExplorerOpenMode/);
  assert.match(fileExplorerSettings, /settings\.fileExplorerTerminal/);
  assert.doesNotMatch(workspaceSettings, /SftpSettings|fileExplorerOpenMode|fileExplorerTerminal/);
  assert.match(assistantContext, /"file-explorer-settings"/);
});
