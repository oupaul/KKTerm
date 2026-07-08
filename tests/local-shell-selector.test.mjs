import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/modules/workspace/connections/connection-dialog/LocalConnectionFields.tsx", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /role="tablist"[\s\S]*aria-label=\{t\("connections\.shell"\)\}/,
  "Local shell should render as an accessible tabbed selector.",
);

assert.match(
  source,
  /<input\s+name="localShell"\s+type="hidden"\s+value=\{submittedLocalShell\}\s+\/>/,
  "Local shell selector should keep submitting the selected localShell value with the form.",
);

assert.match(
  source,
  /installer_wsl_list_distros/,
  "Selecting WSL should load installed distributions for the local Connection form.",
);

assert.match(
  source,
  /name="wslDistro"/,
  "The local Connection form should expose an installed WSL distro picker.",
);

assert.match(
  source,
  /buildWslDistributionShell/,
  "The local Connection form should submit distro-specific WSL shell command lines.",
);

const sidebarSource = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
  "utf8",
);

const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

assert.match(
  sidebarSource,
  /defaultWslConnectionName\(distroFromWslShell\(selectedLocalShell\)\)/,
  "Blank local WSL distro Connection names should default to WSL - <distro>.",
);

assert.match(
  storeSource,
  /function localTerminalToolbarTitle\(connection: Connection\) \{\s*return connection\.name;\s*\}/,
  "Local terminal toolbar titles should use the saved Connection name, not the launch shell command.",
);

assert.match(
  source,
  /data-local-shell=\{selectedLocalShell\}/,
  "Local shell selector should expose the selected shell for the animated indicator.",
);

assert.match(
  source,
  /--shell-option-count/,
  "Local shell selector should size the animated indicator from the number of shell options.",
);

assert.match(
  source,
  /--shell-option-index/,
  "Local shell selector should position the animated indicator from the selected shell index.",
);

for (const variable of ["--shell-option-columns", "--shell-option-rows", "--shell-option-column", "--shell-option-row"]) {
  assert.match(
    source,
    new RegExp(variable),
    `Local shell selector should expose ${variable} for the two-row animated indicator.`,
  );
}

assert.doesNotMatch(
  source,
  /<select\s+name="localShell"/,
  "Local shell should not be a dropdown select.",
);

assert.match(source, /SquareTerminal/, "Command Prompt should have a monochrome line icon.");
assert.match(source, /Command/, "PowerShell should have a monochrome line icon.");
assert.match(source, /Shell/, "WSL should have a monochrome line icon.");

const css = await readFile(
  new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
  "utf8",
);

assert.match(
  css,
  /\.connection-option-fields \.local-shell-selector::before/,
  "Local shell selector should use an animated selected-pill indicator.",
);

assert.match(
  css,
  /\.connection-option-fields \.option-mode-row\.local-shell-mode-row\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0, 1fr\)/,
  "Local shell selector row should use a dedicated two-column header layout.",
);

assert.match(
  css,
  /\.connection-option-fields \.local-shell-selector\s*\{[\s\S]*grid-column:\s*1 \/ -1/,
  "Local shell selector should span the full row width to avoid overlapping shell labels.",
);

assert.match(
  css,
  /\.connection-option-fields \.local-shell-selector\s*\{[\s\S]*grid-template-columns:\s*repeat\(var\(--shell-option-columns, 1\), minmax\(0, 1fr\)\)/,
  "Local shell selector should use a two-column grid when multiple shell options are available.",
);

assert.match(
  css,
  /height:\s*calc\(\(100% - 8px\) \/ var\(--shell-option-rows, 1\)\)/,
  "Local shell selector selected-pill height should follow the number of rows.",
);

assert.match(
  css,
  /translate\(\s*calc\(var\(--shell-option-column, 0\) \* 100%\),\s*calc\(var\(--shell-option-row, 0\) \* 100%\)\s*\)/,
  "Local shell selector selected-pill should animate across both columns and rows.",
);

assert.match(
  css,
  /transition:\s*transform 0\.2s/,
  "Local shell selector indicator should animate with a Mac-style quick slide.",
);
