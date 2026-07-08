import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync("src/modules/workspace/connections/webview/WebViewWorkspace.tsx", "utf8");
const css = readFileSync("src/modules/workspace/connections/webview/webview.css", "utf8");

test("URL address bar distinguishes secure HTTPS and plain HTTP states", () => {
  assert.match(workspace, /import \{[^}]*Lock[^}]*Unlock[^}]*\} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/reicon"/);
  assert.ok(workspace.includes("const isHttpsAddress = /^https:\\/\\//i.test(trimmedAddress);"));
  assert.ok(workspace.includes("const isHttpAddress = /^http:\\/\\//i.test(trimmedAddress);"));
  assert.doesNotMatch(workspace, /hasInvalidCertificate/);
  assert.doesNotMatch(workspace, /is-insecure-https/);
  assert.match(workspace, /isHttpAddress \? <Unlock size=\{13\} \/>/);
});

test("URL address bar colors plain HTTP red", () => {
  assert.doesNotMatch(css, /is-insecure-https/);
  assert.match(
    css,
    /\.webview-address-bar\.is-http\s+\.webview-address-lock,\s*\.webview-address-bar\.is-http\s+\.webview-address-input\s*\{[^}]*color:\s*var\(--red\);/s,
  );
});
