// Behavioral tests for the Dashboard AI Created Widget sandbox policy.
// Unlike the source-grep guards, these call the real functions and assert the
// security-relevant output, so they survive refactors of the implementation.
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCsp,
  buildKkNetSnippet,
  layoutEnforcementCss,
} from "../src/modules/dashboard/script/permissions.ts";

test("buildCsp denies all network when the widget has no network permission", () => {
  const csp = buildCsp({ network: false } as never);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /connect-src 'none'/);
  // No http(s) image origins are granted without the network permission.
  assert.match(csp, /img-src data: blob:/);
  assert.doesNotMatch(csp, /connect-src \*/);
  assert.doesNotMatch(csp, /img-src[^;]*https:/);
});

test("buildCsp opens connect/img origins only when network is granted", () => {
  const csp = buildCsp({ network: true } as never);
  assert.match(csp, /connect-src \*/);
  assert.match(csp, /img-src http: https: data: blob:/);
});

test("buildCsp always forbids inline navigation and keeps a locked-down base", () => {
  for (const network of [false, true]) {
    const csp = buildCsp({ network } as never);
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /script-src 'unsafe-inline' blob:/);
    assert.match(csp, /style-src 'unsafe-inline'/);
    assert.match(csp, /font-src data:/);
  }
});

test("buildKkNetSnippet is empty unless explicitly enabled", () => {
  assert.equal(buildKkNetSnippet(false), "");
  assert.ok(buildKkNetSnippet(true).length > 0);
});

test("layoutEnforcementCss emits root constraints for strict, nothing for none", () => {
  assert.match(layoutEnforcementCss("strict"), /#root/);
  assert.match(layoutEnforcementCss("low"), /#root/);
  assert.equal(layoutEnforcementCss("none" as never), "");
});
