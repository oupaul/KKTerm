import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sites = await readFile(new URL("../src/modules/itops/SitesTab.tsx", import.meta.url), "utf8");
const library = await readFile(new URL("../src/modules/itops/TaskLibrary.tsx", import.meta.url), "utf8");
const hosts = await readFile(new URL("../src/modules/itops/HostsPanel.tsx", import.meta.url), "utf8");
const launcher = await readFile(new URL("../src/modules/itops/BatchRunDialog.tsx", import.meta.url), "utf8");
const schema = await readFile(new URL("../src-tauri/src/storage.rs", import.meta.url), "utf8");
const commands = await readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");

test("IT Ops navigator keeps Tasks global and Site operations virtual", () => {
  assert.match(sites, /itops\.navigation\.serverRooms/);
  assert.match(sites, /itops\.navigation\.runHistory/);
  assert.match(sites, /itops\.tasks\.heading/);
  assert.match(sites, /rootSurface === "tasks"/);
  assert.match(sites, /<TaskLibrary \/>/);
});

test("Server Room topology stays inside its destination and selection is exclusive", () => {
  const serverRoomsRow = sites.indexOf('label={t("itops.navigation.serverRooms")}');
  const topologyRows = sites.indexOf("siteTopo\n                          .filter", serverRoomsRow);
  const hostsRow = sites.indexOf('label={t("itops.tabs.hosts")}', serverRoomsRow);
  assert.ok(serverRoomsRow >= 0 && topologyRows > serverRoomsRow && hostsRow > topologyRows);
  assert.match(sites, /selectedDestination === "site"/);
  assert.match(sites, /selectedDestination === "serverRooms"/);
});

test("Collapse All closes every Site and Server Rooms container", () => {
  const collapseBlock = sites.match(/const collapseAllNodes = useCallback\([\s\S]*?\n  \}, \[racksBySite/)?.[0] ?? "";
  assert.match(collapseBlock, /next\.add\(siteId\);/);
  assert.match(collapseBlock, /next\.add\(`\$\{siteId\}:rooms`\);/);
  assert.doesNotMatch(collapseBlock, /if \(siteTopo\.length > 0\) \{\s*next\.add\(siteId\)/);
});

test("Task Library manages definitions while the Hosts launcher selects saved Tasks", () => {
  assert.doesNotMatch(library, /requestNewBatchRun/);
  assert.match(hosts, /requestNewBatchRun\(siteId, \{ hostIds: \[\.\.\.selectedHostIds\] \}\)/);
  assert.match(launcher, /const tasks = useItOpsStore/);
  assert.match(launcher, /itops\.batchRuns\.taskSourceLabel/);
  assert.match(library, /const createTask = useItOpsStore/);
  assert.match(library, /const updateTask = useItOpsStore/);
});

test("Task Library uses the shared destination page frame", () => {
  assert.match(sites, /rootSurface === "tasks"[\s\S]*className="hg-detail it-destination-page"/);
  assert.match(library, /className="it-task-library-page it-destination-surface"/);
  assert.match(library, /className="it-destination-page-head"/);
  assert.match(library, /itops\.tasks\.pageDescription/);
  assert.match(library, /className="it-btn primary"[\s\S]*itops\.tasks\.newTitle/);
});

test("Tasks are durable global rows with registered CRUD commands", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS itops_tasks/);
  const taskTable = schema.match(/CREATE TABLE IF NOT EXISTS itops_tasks \([\s\S]*?\n\);/)?.[0] ?? "";
  assert.doesNotMatch(taskTable, /site_id/);
  for (const command of ["itops_list_tasks", "itops_create_task", "itops_update_task", "itops_remove_task"]) {
    assert.match(commands, new RegExp(`task_commands::${command}`));
  }
});
