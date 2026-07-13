import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Site overview is topology-only without the old segmented control", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.doesNotMatch(sites, /itops\.sites\.viewLabel/);
  assert.doesNotMatch(sites, /const \[siteView|siteView ===|setSiteView/);
  assert.doesNotMatch(sites, /siteSegmentActive/);
  // The Server Room layout switcher remains; it is not Site navigation.
  assert.match(sites, /aria-label=\{t\("itops\.floorPlan\.viewLabel"\)\}/);
});

test("Hosts, Automations, and Run History render as separate destination pages", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.match(sites, /selectedDestination === "hosts"[\s\S]*?<HostsPanel siteId=\{activeGroup\.id\} \/>/);
  assert.match(sites, /selectedDestination === "automations"[\s\S]*?<AutomationsTab siteId=\{activeGroup\.id\}/);
  assert.match(sites, /selectedDestination === "runHistory"[\s\S]*?<BatchRunsTab siteId=\{activeGroup\.id\} \/>/);
  assert.match(sites, /className="hg-detail it-destination-page"/);
});

test("Run History and Automations pages accept a Site scope", async () => {
  const runs = await read("src/modules/itops/BatchRunsTab.tsx");
  const autos = await read("src/modules/itops/AutomationsTab.tsx");

  // Run History: live and completed runs only show this Site's records.
  assert.match(runs, /siteId\?: string;/);
  assert.match(runs, /allRunHistory\.filter\(\(entry\) => entry\.siteId === siteId\)/);
  assert.match(runs, /activeRun && \(!siteId \|\| activeRun\.siteId === siteId\)/);
  assert.doesNotMatch(runs, /onNewBatchRun/);

  // Automations: the durable siteId binding wins; legacy rows without one
  // fall back to inference (runBatch action target, or a host-addressed
  // trigger watching one of the Site's resolved member hosts).
  assert.match(autos, /function automationBoundToSite\(/);
  assert.match(
    autos,
    /if \(automation\.siteId != null\) \{\s*return automation\.siteId === siteId;/,
  );
  assert.match(autos, /action\.kind === "runBatch" && action\.siteId === siteId/);
  assert.match(autos, /target\.kind === "ping" \|\| target\.kind === "tcpReachable"/);
  assert.match(autos, /siteHosts\?: string\[\];/);
  assert.match(
    autos,
    /allAutomations\.filter\(\(automation\) => automationBoundToSite\(automation, siteId, hostSet\)\)/,
  );
});

test("Hosts page owns selected-Host Task launches", async () => {
  const hosts = await read("src/modules/itops/HostsPanel.tsx");
  const dialog = await read("src/modules/itops/BatchRunDialog.tsx");
  const rustTypes = await read("src-tauri/src/itops/types.rs");
  const storage = await read("src-tauri/src/itops/storage.rs");

  assert.match(hosts, /selectedHostIds/);
  assert.match(hosts, /requestNewBatchRun\(siteId, \{ hostIds: \[\.\.\.selectedHostIds\] \}\)/);
  assert.match(hosts, /connection\.type === "ssh"/);
  assert.match(dialog, /scope\.hostIds\?\.length/);
  assert.match(rustTypes, /pub host_ids: Vec<String>/);
  assert.match(storage, /first SSH binding/);
});

test("Automation editor owns the durable Site binding", async () => {
  const autos = await read("src/modules/itops/AutomationsTab.tsx");
  const editor = await read("src/modules/itops/AutomationEditor.tsx");
  const state = await read("src/modules/itops/state.ts");

  // The Site segment's editor preselects that Site for new Automations.
  assert.match(autos, /defaultSiteId=\{siteId\}/);
  assert.match(editor, /defaultState\(defaultSiteId\)/);
  // The header Site select edits the binding; a blank choice saves as null.
  assert.match(editor, /className="au-editor-site"/);
  assert.match(editor, /aria-label=\{t\("itops\.editor\.siteLabel"\)\}/);
  assert.match(editor, /\{ value: "", label: t\("itops\.editor\.siteNone"\) \}/);
  assert.match(editor, /const siteId = state\.siteId \|\| null;/);
  // The store forwards the binding to both persistence commands.
  assert.match(state, /createAutomation\(name, config, actions, enabled, siteId\)/);
  assert.match(state, /updateAutomation\(id, name, config, actions, siteId\)/);
});
