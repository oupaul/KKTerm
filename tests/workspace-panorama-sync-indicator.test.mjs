import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const terminalCss = await readFile(
  new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
  "utf8",
);
const connectionsCss = await readFile(
  new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
  "utf8",
);
const sidebarSource = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
  "utf8",
);

assert.match(
  terminalCss,
  /\.terminal-layout-split\s*\{[^}]*gap:\s*2px;/s,
  "split Pane and panorama layouts should retain the narrow 2px gutter",
);
assert.match(
  sidebarSource,
  /syncInputEnabled && isConnectedTerminal/,
  "the radio indicator should require both sync input and a connected terminal",
);
for (const connectionType of ["local", "ssh", "mosh", "telnet", "serial"]) {
  assert.match(
    sidebarSource,
    new RegExp(`\\["local", "ssh", "mosh", "telnet", "serial"\\]\\.includes\\(connectionType\\)`),
    `${connectionType} Connections should participate in the sync indicator gate`,
  );
}
assert.match(
  connectionsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.status-sync-input\s*\{[^}]*animation:\s*none;/,
  "the pulsing indicator should respect reduced-motion preferences",
);

console.log("workspace panorama spacing and sync indicator checks passed");
