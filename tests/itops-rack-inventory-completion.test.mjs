import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Rack Device dialog has live graphical preview and 乖乖 size control", async () => {
  const dialog = await readFile(new URL("../src/modules/itops/RackItemDialog.tsx", import.meta.url), "utf8");
  const device = await readFile(new URL("../src/modules/itops/RackDevice.tsx", import.meta.url), "utf8");

  assert.match(dialog, /rack-item-preview/);
  assert.match(dialog, /kuaiguaiSize/);
  assert.match(dialog, /itops\.racks\.kuaiguaiSizeLabel/);
  assert.match(device, /kuaiguaiSize\?:/);
  assert.match(device, /data-kuaiguai-size/);
});

test("Rack Device property dialog omits removed relationship metadata", async () => {
  const dialog = await readFile(new URL("../src/modules/itops/RackItemDialog.tsx", import.meta.url), "utf8");
  const stage = await readFile(new URL("../src/modules/itops/RackStage.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(dialog, /auditRecordRows|addAuditRecord|relationshipLabel|ipamLabel/);
  assert.doesNotMatch(dialog, /connection-binding-list/);
  assert.match(stage, /connectionIds/);
});

test("Rack Device SNMP refresh path replaces the backend stub", async () => {
  const snmp = await readFile(new URL("../src-tauri/src/net/snmp.rs", import.meta.url), "utf8");
  const commands = await readFile(new URL("../src-tauri/src/itops/commands.rs", import.meta.url), "utf8");
  const tauri = await readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8");

  assert.doesNotMatch(snmp, /stub/i);
  assert.match(snmp, /SnmpPortSample/);
  assert.match(snmp, /parse_port_speed/);
  assert.match(commands, /itops_refresh_rack_item_snmp/);
  assert.match(tauri, /itops_refresh_rack_item_snmp/);
});

test("IT Ops manual documents real SNMP scope without promising background polling", async () => {
  const manual = await readFile(new URL("../docs/manual/12-it-ops.md", import.meta.url), "utf8");

  assert.match(manual, /SNMP/);
  assert.doesNotMatch(manual, /IPAM|rack-audit|relationship details/);
  assert.match(manual, /user-triggered|manual refresh/i);
  assert.doesNotMatch(manual, /background SNMP polling/i);
});
