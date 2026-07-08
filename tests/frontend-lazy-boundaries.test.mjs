import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.tsx", import.meta.url);
const workspaceCanvasSourceUrl = new URL("../src/modules/workspace/WorkspaceCanvas.tsx", import.meta.url);
const terminalWorkspaceSourceUrl = new URL(
  "../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx",
  import.meta.url,
);
const connectionWidgetSourceUrl = new URL(
  "../src/modules/dashboard/widgets/builtin/connections/ConnectionWidget.tsx",
  import.meta.url,
);

test("App lazy-loads non-default Module pages instead of statically importing them", async () => {
  const source = await readFile(appSourceUrl, "utf8");

  for (const page of [
    "DashboardPage",
    "InstallerPage",
    "ItOpsPage",
    "SettingsPage",
  ]) {
    assert.match(
      source,
      new RegExp(`const\\s+${page}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(`),
      `${page} should be behind React.lazy`,
    );
    assert.doesNotMatch(
      source,
      new RegExp(`import\\s+\\{\\s*${page}\\s*\\}\\s+from\\s+["']\\./modules/`),
      `${page} should not be statically imported into the startup shell`,
    );
  }
});

test("WorkspaceCanvas lazy-loads heavyweight non-terminal workspace surfaces", async () => {
  const source = await readFile(workspaceCanvasSourceUrl, "utf8");

  for (const surface of [
    "SftpWorkspace",
    "FileViewerWorkspace",
    "WebViewWorkspace",
    "RemoteDesktopWorkspace",
    "GitBrowser",
    "CompareViewer",
    "FolderCompareView",
  ]) {
    assert.match(
      source,
      new RegExp(`const\\s+${surface}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(`),
      `${surface} should be behind React.lazy`,
    );
    assert.doesNotMatch(
      source,
      new RegExp(`import\\s+\\{\\s*${surface}\\s*\\}\\s+from\\s+["']`),
      `${surface} should not be statically imported into the default workspace bundle`,
    );
  }
});

test("TerminalWorkspace lazy-loads embedded non-terminal pane surfaces", async () => {
  const source = await readFile(terminalWorkspaceSourceUrl, "utf8");

  for (const surface of [
    "SftpWorkspace",
    "FileViewerWorkspace",
    "WebViewWorkspace",
    "RemoteDesktopWorkspace",
  ]) {
    assert.match(
      source,
      new RegExp(`const\\s+${surface}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(`),
      `${surface} should be behind React.lazy`,
    );
    assert.doesNotMatch(
      source,
      new RegExp(`import\\s+\\{\\s*${surface}\\s*\\}\\s+from\\s+["']`),
      `${surface} should not be statically imported into TerminalWorkspace`,
    );
  }
});

test("Dashboard Connection widget lazy-loads embedded native workspace surfaces", async () => {
  const source = await readFile(connectionWidgetSourceUrl, "utf8");

  for (const surface of ["WebViewWorkspace", "RemoteDesktopWorkspace"]) {
    assert.match(
      source,
      new RegExp(`const\\s+${surface}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(`),
      `${surface} should be behind React.lazy`,
    );
    assert.doesNotMatch(
      source,
      new RegExp(`import\\s+\\{\\s*${surface}\\s*\\}\\s+from\\s+["']`),
      `${surface} should not be statically imported into the Dashboard Connection widget`,
    );
  }
});
