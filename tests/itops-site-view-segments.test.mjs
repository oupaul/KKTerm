import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Site View switcher sits in the drill toolbar with Overview / Batch Runs / Automations", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  // The segmented control renders inside the toolbar row, only at Site level.
  assert.match(
    sites,
    /className="it-drill-toolbar">[\s\S]*?!serverRoom && !rack \? \([\s\S]*?className="rm-segmented"/,
  );
  assert.match(sites, /aria-label=\{t\("itops\.sites\.viewLabel"\)\}/);
  assert.match(sites, /<ItIcon name="room" size=\{13\} \/>[\s\S]*?itops\.sites\.viewOverview/);
  assert.match(sites, /<ItIcon name="run" size=\{13\} \/>[\s\S]*?itops\.tabs\.runs/);
  assert.match(sites, /<ItIcon name="auto" size=\{13\} \/>[\s\S]*?itops\.tabs\.autos/);
  // Switching Sites or drilling resets the segment to the Overview surface.
  assert.match(sites, /setSiteView\("overview"\);[\s\S]*?\}, \[viewKey\]\)/);
});

test("Non-overview segments swap in the site-scoped tabs and hide topology actions", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  // The segments render the existing Batch Runs / Automations surfaces,
  // scoped to the selected Site's Connections.
  assert.match(
    sites,
    /<BatchRunsTab siteId=\{site\.id\} onNewBatchRun=\{\(\) => requestNewBatchRun\(site\.id\)\} \/>/,
  );
  assert.match(
    sites,
    /<AutomationsTab siteId=\{site\.id\} siteHosts=\{members\.map\(\(member\) => member\.host\)\} \/>/,
  );
  // Topology-only toolbar actions hide while a non-overview segment shows.
  assert.match(sites, /const siteSegmentActive = !serverRoom && !rack && siteView !== "overview";/);
  assert.match(sites, /!siteSegmentActive \? \([\s\S]*?<ItIcon name=\{editMode \? "check" : "edit"\}/);
  assert.match(sites, /!siteSegmentActive \? \([\s\S]*?className="it-drill-export"/);
  // The plus action follows the segment: new Batch Run / new Automation.
  assert.match(sites, /if \(siteView === "batchRuns"\) \{\s*requestNewBatchRun\(site\.id\);/);
  assert.match(sites, /if \(siteView === "automations"\) \{\s*requestNewAutomation\(\);/);
  assert.match(sites, /t\("itops\.actions\.newBatchRun"\)/);
  assert.match(sites, /t\("itops\.actions\.newAutomation"\)/);
});

test("Batch Runs and Automations tabs accept a Site scope", async () => {
  const runs = await read("src/modules/itops/BatchRunsTab.tsx");
  const autos = await read("src/modules/itops/AutomationsTab.tsx");

  // Batch Runs: the live run and history only show this Site's runs.
  assert.match(runs, /siteId\?: string;/);
  assert.match(runs, /allRunHistory\.filter\(\(entry\) => entry\.siteId === siteId\)/);
  assert.match(runs, /activeRun && \(!siteId \|\| activeRun\.siteId === siteId\)/);

  // Automations: bound to the Site via a runBatch action or a host-addressed
  // trigger watching one of the Site's resolved member hosts.
  assert.match(autos, /function automationBoundToSite\(/);
  assert.match(autos, /action\.kind === "runBatch" && action\.siteId === siteId/);
  assert.match(autos, /target\.kind === "ping" \|\| target\.kind === "tcpReachable"/);
  assert.match(autos, /siteHosts\?: string\[\];/);
  assert.match(
    autos,
    /allAutomations\.filter\(\(automation\) => automationBoundToSite\(automation, siteId, hostSet\)\)/,
  );
});
