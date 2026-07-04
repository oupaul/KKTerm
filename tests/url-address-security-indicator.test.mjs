import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync("src/modules/workspace/connections/webview/WebViewWorkspace.tsx", "utf8");
const css = readFileSync("src/modules/workspace/connections/webview/webview.css", "utf8");

test("URL address bar distinguishes secure, insecure HTTPS, and plain HTTP states", () => {
  assert.match(workspace, /import \{[^}]*Lock[^}]*Unlock[^}]*\} from "lucide-react"/);
  assert.ok(workspace.includes("const isHttpsAddress = /^https:\\/\\//i.test(trimmedAddress);"));
  assert.ok(workspace.includes("const isHttpAddress = /^http:\\/\\//i.test(trimmedAddress);"));
  assert.match(workspace, /isHttpsAddress && ignoreCertificateErrors/);
  assert.match(workspace, /isHttpAddress \? <Unlock size=\{13\} \/>/);
});

test("URL address bar colors insecure HTTPS orange and plain HTTP red", () => {
  assert.match(
    css,
    /\.webview-address-bar\.is-insecure-https\s+\.webview-address-lock,\s*\.webview-address-bar\.is-insecure-https\s+\.webview-address-input\s*\{[^}]*color:\s*var\(--orange\);/s,
  );
  assert.match(
    css,
    /\.webview-address-bar\.is-http\s+\.webview-address-lock,\s*\.webview-address-bar\.is-http\s+\.webview-address-input\s*\{[^}]*color:\s*var\(--red\);/s,
  );
});
