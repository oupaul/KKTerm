import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("rack device explicit metallic black overrides a white rack shell", async () => {
  const [deviceSource, cssSource] = await Promise.all([
    readFile(new URL("../src/modules/itops/RackDevice.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/itops/itops.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    deviceSource,
    /data-shell=\{shell \?\? undefined\}/,
    "RackDevice should emit data-shell for an explicit black device shell",
  );
  assert.match(
    cssSource,
    /\.itops-page \.rkd\[data-shell="black"\]\s*\{[\s\S]*--rkd-face-mid:\s*#28282b;/,
    "explicit black devices need their own palette so they do not inherit a white cabinet palette",
  );
});

test("rack shell finish does not override default metallic black device faceplates", async () => {
  const cssSource = await readFile(new URL("../src/modules/itops/itops.css", import.meta.url), "utf8");
  const cabinetWhiteRule = cssSource.match(/\.itops-page \.rk\[data-shell="white"\]\s*\{(?<body>[\s\S]*?)\n\}/);
  const cabinetGreyRule = cssSource.match(/\.itops-page \.rk\[data-shell="grey"\]\s*\{(?<body>[\s\S]*?)\n\}/);

  assert.ok(cabinetWhiteRule?.groups?.body, "white rack shell rule should exist");
  assert.ok(cabinetGreyRule?.groups?.body, "grey rack shell rule should exist");
  assert.doesNotMatch(
    cabinetWhiteRule.groups.body,
    /--rkd-/,
    "white cabinet finish should not repaint devices that have no per-device shell",
  );
  assert.doesNotMatch(
    cabinetGreyRule.groups.body,
    /--rkd-/,
    "grey cabinet finish should not repaint devices that have no per-device shell",
  );
});

test("rack network ports fit inside compact one-unit faceplates", async () => {
  const cssSource = await readFile(new URL("../src/modules/itops/itops.css", import.meta.url), "utf8");
  const portsRule = cssSource.match(/\.itops-page \.rkd-ports\s*\{(?<body>[\s\S]*?)\n\}/);
  const portRule = cssSource.match(/\.itops-page \.rkd-port\s*\{(?<body>[\s\S]*?)\n\}/);
  const routerRule = cssSource.match(/\.itops-page \.rkd-router\s*\{(?<body>[\s\S]*?)\n\}/);

  assert.ok(portsRule?.groups?.body, "shared port group rule should exist");
  assert.ok(portRule?.groups?.body, "shared port well rule should exist");
  assert.ok(routerRule?.groups?.body, "router layout rule should exist");
  assert.match(portsRule.groups.body, /gap:\s*2px;/, "two rows of ports need a compact gap in 1U");
  assert.match(portsRule.groups.body, /padding:\s*0;/, "port rows should not add vertical padding inside 1U");
  assert.match(portRule.groups.body, /width:\s*10px;/, "network port wells should stay compact");
  assert.match(portRule.groups.body, /height:\s*8px;/, "two network port rows should fit inside a 1U faceplate");
  assert.match(routerRule.groups.body, /gap:\s*5px;/, "router WAN and LAN sections should not crowd the port rows");
});

test("one-unit PDU controls fit inside the faceplate height", async () => {
  const [deviceSource, cssSource] = await Promise.all([
    readFile(new URL("../src/modules/itops/RackDevice.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/itops/itops.css", import.meta.url), "utf8"),
  ]);
  const pduRule = cssSource.match(
    /\.itops-page \.rkd-pdu\[data-height-u="1"\]\s*\{(?<body>[\s\S]*?)\n\}/,
  );
  const outletRule = cssSource.match(
    /\.itops-page \.rkd-pdu\[data-height-u="1"\] \.rkd-outlet\s*\{(?<body>[\s\S]*?)\n\}/,
  );
  const loadPctRule = cssSource.match(
    /\.itops-page \.rkd-pdu\[data-height-u="1"\] \.rkd-load-pct\s*\{(?<body>[\s\S]*?)\n\}/,
  );

  assert.match(
    deviceSource,
    /className="rkd-pdu" data-height-u=\{heightU\}/,
    "PDU artwork should expose its U height for scoped compact geometry",
  );
  assert.ok(pduRule?.groups?.body, "one-unit PDU layout rule should exist");
  assert.ok(outletRule?.groups?.body, "one-unit PDU outlet rule should exist");
  assert.ok(loadPctRule?.groups?.body, "one-unit PDU load-label rule should exist");

  const gap = Number(pduRule.groups.body.match(/gap:\s*([\d.]+)px;/)?.[1]);
  const outletHeight = Number(outletRule.groups.body.match(/height:\s*([\d.]+)px;/)?.[1]);
  const loadFontSize = Number(loadPctRule.groups.body.match(/font-size:\s*([\d.]+)px;/)?.[1]);
  assert.match(loadPctRule.groups.body, /line-height:\s*1;/, "load text should not add normal line-height overflow");
  assert.ok(
    outletHeight + gap + loadFontSize <= 22,
    "outlet row, gap, and load row should fit the usable height of a one-unit faceplate",
  );
});

test("placed rack servers render model text and compact drive bays", async () => {
  const [elevationSource, cssSource] = await Promise.all([
    readFile(new URL("../src/modules/itops/RackElevation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/itops/itops.css", import.meta.url), "utf8"),
  ]);
  const diskRowRule = cssSource.match(/\.itops-page \.rkd-disks-row\s*\{(?<body>[\s\S]*?)\n\}/);
  const diskBayRule = cssSource.match(/\.itops-page \.rkd-disk-bay\s*\{(?<body>[\s\S]*?)\n\}/);

  assert.match(
    elevationSource,
    /const model = item\.metadata\?\.vendor\?\.trim\(\) \|\| null;[\s\S]*subLabel=\{model \?\? hostFor\?\.\(item\) \?\? null\}/,
    "placed Rack View faceplates should show the saved model before falling back to host text",
  );
  assert.ok(diskRowRule?.groups?.body, "server disk row rule should exist");
  assert.ok(diskBayRule?.groups?.body, "server disk bay rule should exist");
  assert.match(
    diskRowRule.groups.body,
    /--rkd-disk-bay-h:\s*clamp\(9px,\s*calc\(\(100% - 5px\) \/ 2\),\s*18px\);/,
    "drive bays should shrink to two unclipped rows inside the available faceplate height",
  );
  assert.match(
    diskBayRule.groups.body,
    /height:\s*var\(--rkd-disk-bay-h\);/,
    "individual drive bays should use the row-aware compact height",
  );
});
