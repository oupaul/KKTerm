import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL toolbar title keeps side breathing room and truncates before crowding controls", async () => {
  const source = await readFile(
    new URL("../src/App.css", import.meta.url),
    "utf8",
  );
  const match = source.match(/\.webview-pane\s*>\s*header\s*>\s*\.webview-title-center\s*\{(?<body>[^}]+)\}/);

  assert.ok(
    match?.groups?.body,
    "webview title CSS rule should be specific enough to override the generic terminal header span rule",
  );
  const body = match.groups.body;

  assert.match(body, /flex:\s*0\s+1\s+[^;]+;/);
  assert.match(body, /display:\s*block;/);
  assert.match(body, /max-width:\s*[^;]+;/);
  assert.match(body, /padding:\s*0\s+[^;]+;/);
  assert.match(body, /box-sizing:\s*border-box;/);
  assert.match(body, /text-overflow:\s*ellipsis;/);
  assert.match(body, /white-space:\s*nowrap;/);
});
