import assert from "node:assert/strict";
import test from "node:test";
import { globalWebviewProxy, parseUrlProxyDraft, resolveUrlDataPartition, resolveUrlProxy } from "../src/modules/workspace/connections/webview/urlProxy";

test("URL proxy inheritance follows the global app proxy or a per-connection override", () => {
  const manual = { proxyMode: "manual" as const, proxyUrl: "http://proxy.example:3128" };

  // Inheriting follows the global app proxy.
  assert.equal(resolveUrlProxy({ urlProxyInheritDefaults: true }, manual), "http://proxy.example:3128");
  // A per-connection override with no value is direct.
  assert.equal(resolveUrlProxy({ urlProxyInheritDefaults: false }, manual), undefined);
  // A per-connection override value wins over the global proxy.
  assert.equal(
    resolveUrlProxy(
      { urlProxyInheritDefaults: false, urlProxy: "socks5://127.0.0.1:1080" },
      manual,
    ),
    "socks5://127.0.0.1:1080",
  );
});

test("global webview proxy maps each app proxy mode", () => {
  assert.equal(globalWebviewProxy({ proxyMode: "system" }), undefined);
  assert.equal(globalWebviewProxy({ proxyMode: "none" }), "direct://");
  assert.equal(
    globalWebviewProxy({ proxyMode: "manual", proxyUrl: "socks5://127.0.0.1:1080" }),
    "socks5://127.0.0.1:1080",
  );
  assert.equal(globalWebviewProxy({ proxyMode: "manual", proxyUrl: "" }), undefined);
});

test("URL data partition inheritance resolves global and custom values", () => {
  const settings = {
    ignoreCertificateErrors: false,
    defaultDataPartition: "ops",
  };

  assert.equal(resolveUrlDataPartition({ urlProxyInheritDefaults: true }, settings), "ops");
  assert.equal(resolveUrlDataPartition({ urlProxyInheritDefaults: false }, settings), undefined);
  assert.equal(
    resolveUrlDataPartition({ urlProxyInheritDefaults: false, dataPartition: "lab" }, settings),
    "lab",
  );
});

test("URL proxy drafts accept only complete HTTP and SOCKS5 endpoints", () => {
  assert.equal(parseUrlProxyDraft("direct", "", ""), undefined);
  assert.equal(parseUrlProxyDraft("http", "proxy.example", "3128"), "http://proxy.example:3128");
  assert.equal(parseUrlProxyDraft("socks5", "127.0.0.1", "1080"), "socks5://127.0.0.1:1080");
  assert.throws(() => parseUrlProxyDraft("http", "", "3128"), /host/i);
  assert.throws(() => parseUrlProxyDraft("socks5", "proxy.example", "0"), /port/i);
});
