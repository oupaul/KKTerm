import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const colorSchemesCss = await readFile(
  new URL("../src/styles/colorSchemes.css", import.meta.url),
  "utf8",
);
const workspaceCss = await readFile(
  new URL("../src/modules/workspace/workspace.css", import.meta.url),
  "utf8",
);

test("status popup icons and progress bar use the same semantic tone colors", () => {
  for (const token of ["info", "success", "warning", "error"]) {
    assert.equal(
      colorSchemesCss.match(new RegExp(`--notice-${token}:`, "g"))?.length,
      25,
      `Each color scheme should define --notice-${token}.`,
    );
  }

  assert.match(colorSchemesCss, /--notice-info:\s*#0a84ff;/);
  assert.match(colorSchemesCss, /--notice-success:\s*var\(--green\);/);
  assert.match(colorSchemesCss, /--notice-warning:\s*var\(--amber\);/);
  assert.match(colorSchemesCss, /--notice-error:\s*var\(--red\);/);

  assert.match(workspaceCss, /\.status-popup\.info\s*\{\s*--notice-tone:\s*var\(--notice-info\);/);
  assert.match(workspaceCss, /\.status-popup\.success\s*\{\s*--notice-tone:\s*var\(--notice-success\);/);
  assert.match(workspaceCss, /\.status-popup\.warning\s*\{\s*--notice-tone:\s*var\(--notice-warning\);/);
  assert.match(workspaceCss, /\.status-popup\.error\s*\{\s*--notice-tone:\s*var\(--notice-error\);/);
  assert.match(
    workspaceCss,
    /\.status-popup-icon[\s\S]*color:\s*var\(--notice-tone\);[\s\S]*\.status-popup-icon svg[\s\S]*stroke:\s*var\(--notice-tone\);/,
  );
  assert.match(
    workspaceCss,
    /\.status-popup-progress > i[\s\S]*background:\s*var\(--notice-tone\);/,
  );
});
