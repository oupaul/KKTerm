import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("terminal Ctrl-click opens http links externally through the typed opener", async () => {
  const rendererSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/renderer.ts", import.meta.url),
    "utf8",
  );
  const manualSource = await readFile(
    new URL("../docs/manual/05-terminal.md", import.meta.url),
    "utf8",
  );

  assert.match(rendererSource, /new WebLinksAddon\(handleTerminalLink\)/);
  assert.match(rendererSource, /function handleTerminalLink\(event: MouseEvent, uri: string\)/);
  assert.match(rendererSource, /if \(!event\.ctrlKey\)/);
  assert.match(rendererSource, /new URL\(uri\)/);
  assert.match(rendererSource, /url\.protocol !== "http:" && url\.protocol !== "https:"/);
  assert.match(rendererSource, /event\.preventDefault\(\)/);
  assert.match(rendererSource, /event\.stopPropagation\(\)/);
  assert.match(rendererSource, /openExternalUrl\(url\.href\)/);

  assert.match(manualSource, /Ctrl-click an `http` or `https` link/);
  assert.match(manualSource, /local, SSH, Telnet, and Serial terminal Sessions/);
});
