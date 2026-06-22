import assert from "node:assert/strict";
import test from "node:test";
import { parseUrlProxyDraft, resolveUrlProxy } from "../src/modules/workspace/connections/webview/urlProxy";

test("URL proxy inheritance resolves global, direct, and custom modes", () => {
  const settings = { ignoreCertificateErrors: false, defaultProxyUrl: "http://proxy.example:3128" };

  assert.equal(resolveUrlProxy({ urlProxyInheritDefaults: true }, settings), "http://proxy.example:3128");
  assert.equal(resolveUrlProxy({ urlProxyInheritDefaults: false }, settings), undefined);
  assert.equal(
    resolveUrlProxy(
      { urlProxyInheritDefaults: false, urlProxy: "socks5://127.0.0.1:1080" },
      settings,
    ),
    "socks5://127.0.0.1:1080",
  );
});

test("URL proxy drafts accept only complete HTTP and SOCKS5 endpoints", () => {
  assert.equal(parseUrlProxyDraft("direct", "", ""), undefined);
  assert.equal(parseUrlProxyDraft("http", "proxy.example", "3128"), "http://proxy.example:3128");
  assert.equal(parseUrlProxyDraft("socks5", "127.0.0.1", "1080"), "socks5://127.0.0.1:1080");
  assert.throws(() => parseUrlProxyDraft("http", "", "3128"), /host/i);
  assert.throws(() => parseUrlProxyDraft("socks5", "proxy.example", "0"), /port/i);
});
