import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = encodeURIComponent(transpiled.outputText);
  return import(`data:text/javascript;charset=utf-8,${encoded}`);
}

test("script widget source is encoded as data before iframe execution", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const source = "document.body.innerHTML = `<div><script>alert(1)</script></div>`;";
  const srcdoc = buildSrcdoc({
    source,
    permissions: { network: false },
  });

  assert.match(srcdoc, /script-src 'unsafe-inline' blob:/);
  assert.match(srcdoc, /return injectScript\(/);
  assert.match(srcdoc, /padding:\s*4px;/);
  assert.doesNotMatch(srcdoc, /<script>alert\(1\)<\/script><\/div>`;/);
  assert.match(srcdoc, /\\u003cscript>alert\(1\)\\u003c\/script>\\u003c\/div>`;/);
});

test("script widget srcdoc declares UTF-8 for document and injected blobs", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const source = "document.getElementById('root').textContent = '中文テスト한글 café';";
  const srcdoc = buildSrcdoc({
    source,
    permissions: { network: false },
  });

  assert.match(srcdoc, /<meta charset="utf-8" \/>/);
  assert.match(srcdoc, /text\/javascript;charset=utf-8/);
  assert.match(srcdoc, /中文テスト한글 café/);
});

test("script widget CSP allows remote images only with network permission", async () => {
  const { buildCsp } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );

  assert.match(buildCsp({ network: true }), /img-src http: https: data: blob:/);
  assert.match(buildCsp({ network: true }), /connect-src \*/);
  assert.match(buildCsp({ network: true }), /script-src 'unsafe-inline' blob:/);
  assert.doesNotMatch(buildCsp({ network: true }), /script-src[^;]*https:/);
  assert.match(buildCsp({ network: false }), /img-src data: blob:/);
  assert.match(buildCsp({ network: false }), /connect-src 'none'/);
  assert.match(buildCsp({ network: false }), /script-src 'unsafe-inline' blob:/);
  assert.doesNotMatch(buildCsp({ network: false }), /script-src[^;]*https:/);
});

test("script widget host intercepts external links for parent opener bridge", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "document.getElementById('root').innerHTML = '<a href=\"https://example.com\">Example</a>';",
    permissions: { network: false },
  });

  assert.match(srcdoc, /openExternal: function \(url\)/);
  assert.match(srcdoc, /closest\('a\[href\]'\)/);
  assert.match(srcdoc, /type: 'openExternalUrl'/);
  assert.match(srcdoc, /url\.protocol === 'http:'/);
  assert.match(srcdoc, /url\.protocol === 'https:'/);
});

test("script widget host exposes keyed secret bridge", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "KK.getSecret('apiKey');",
    permissions: { network: false },
  });

  assert.match(srcdoc, /getSecret: function \(key\)/);
  assert.match(srcdoc, /type: 'getSecret'/);
  assert.match(srcdoc, /type !== 'secretValue'/);
  assert.doesNotMatch(srcdoc, /widget-api-key/);
});

test("script widget host exposes measured viewport bridge", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "const viewport = KK.getViewport(); KK.onViewportResize(() => {});",
    permissions: { network: false },
  });

  assert.match(srcdoc, /function readViewport\(\)/);
  assert.match(srcdoc, /getViewport: readViewport/);
  assert.match(srcdoc, /onViewportResize: function \(callback\)/);
  assert.match(srcdoc, /new ResizeObserver\(notify\)/);
});

test("script widget host exposes runtime theme contract without prompt payload bloat", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc(
    {
      source: "const theme = KK.getTheme();",
      permissions: { network: false },
    },
    "{}",
    [],
    {
      colorScheme: "dark",
      text: "#f8fafc",
      muted: "#cbd5e1",
      border: "#475569",
      surface: "#0f172a",
      surfaceMuted: "#1e293b",
      readableSurface: "rgba(15, 23, 42, 0.92)",
      readableSurfaceText: "#f8fafc",
      accent: "#38bdf8",
      accentSoft: "rgba(56, 189, 248, 0.18)",
      visualContext: {
        colorScheme: "dark",
        backgroundKind: "preset",
        backgroundTone: "dark",
        backgroundId: "graphite",
        requiresOpaqueTextSurface: false,
      },
    },
  );

  assert.match(srcdoc, /color-scheme: dark;/);
  assert.match(srcdoc, /--kk-readable-surface: rgba\(15, 23, 42, 0\.92\);/);
  assert.match(srcdoc, /getTheme: function \(\)/);
  assert.match(srcdoc, /\\"backgroundTone\\":\\"dark\\"/);
  assert.match(srcdoc, /\\"requiresOpaqueTextSurface\\":false/);
});

test("script widget host notifies generated animation code when visibility changes", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "KK.onVisibilityChange((visible) => { if (visible) requestAnimationFrame(() => {}); });",
    permissions: { network: false },
  });

  assert.match(srcdoc, /var _kkVisibilityCallbacks = new Set\(\)/);
  assert.match(srcdoc, /onVisibilityChange: function \(callback\)/);
  assert.match(srcdoc, /_kkVisibilityCallbacks\.add\(callback\)/);
  assert.match(srcdoc, /Array\.from\(_kkVisibilityCallbacks\)\.forEach/);
  assert.match(srcdoc, /notifyKkVisibilityCallbacks\(\)/);
  assert.match(srcdoc, /if \(_kkVisible !== nextVisible\)/);
});

test("script widget host caps animation and tight timer loops", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "requestAnimationFrame(() => {}); setInterval(() => {}, 0);",
    permissions: { network: false },
  });

  assert.match(srcdoc, /KK_RAF_MIN_INTERVAL_MS = 16/);
  assert.match(srcdoc, /window\.requestAnimationFrame = function \(callback\)/);
  assert.match(srcdoc, /Array\.from\(_kkRafCallbacks\.entries\(\)\)/);
  assert.match(srcdoc, /window\.setInterval = function \(handler, timeout\)/);
  assert.match(srcdoc, /KK_SET_INTERVAL_MIN_MS = 100/);
  assert.match(srcdoc, /if \(!_kkVisible\) return;/);
});

test("script widget host honors lifecycle minTickMs with a 16 ms floor", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const sixtyFpsSrcdoc = buildSrcdoc({
    source: "requestAnimationFrame(() => {});",
    permissions: { network: false },
    lifecycle: { kind: "animation", minTickMs: 16 },
  });
  const tooFastSrcdoc = buildSrcdoc({
    source: "requestAnimationFrame(() => {});",
    permissions: { network: false },
    lifecycle: { kind: "animation", minTickMs: 1 },
  });

  assert.match(sixtyFpsSrcdoc, /KK_RAF_MIN_INTERVAL_MS = 16/);
  assert.match(tooFastSrcdoc, /KK_RAF_MIN_INTERVAL_MS = 16/);
});

test("script widget parent bridge rate-limits expensive messages", async () => {
  const hostSource = await readFile(
    new URL("../src/modules/dashboard/script/ScriptWidgetHost.tsx", import.meta.url),
    "utf8",
  );

  assert.match(hostSource, /BRIDGE_RATE_LIMITS_MS/);
  assert.match(hostSource, /getPerformanceCounters:\s*1000/);
  assert.match(hostSource, /setSettings:\s*500/);
  assert.match(hostSource, /allowBridgeMessage\("getPerformanceCounters"\)/);
  assert.match(hostSource, /allowBridgeMessage\("setSettings"\)/);
});

test("script widget host resyncs iframe visibility after initial layout and load", async () => {
  const hostSource = await readFile(
    new URL("../src/modules/dashboard/script/ScriptWidgetHost.tsx", import.meta.url),
    "utf8",
  );

  assert.match(hostSource, /function iframeRectIsVisible\(el: HTMLIFrameElement\)/);
  assert.match(hostSource, /function postIframeVisibility\(el: HTMLIFrameElement, visible: boolean\)/);
  assert.match(hostSource, /syncVisibility\(\);[\s\S]*syncSoon\(\);/);
  assert.match(hostSource, /entry\.intersectionRatio > 0\.1\)[\s\S]*iframeRectIsVisible\(el\)/);
  assert.match(hostSource, /window\.requestAnimationFrame\(\(\) => \{/);
  assert.match(hostSource, /window\.setTimeout\(syncVisibility, 100\)/);
  assert.match(hostSource, /onLoad=\{syncVisibility\}/);
});

test("script widget host exposes app-owned UI primitives", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "document.getElementById('root').className = 'kk-shell';",
    permissions: { network: false },
  });

  for (const className of [
    "kk-shell",
    "kk-toolbar",
    "kk-panel",
    "kk-stat-value",
    "kk-stage",
    "kk-fill",
  ]) {
    assert.match(srcdoc, new RegExp(`\\.${className}`));
  }
});

test("script widget layout enforcement varies #root CSS by level", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const body = { source: "document.getElementById('root');", permissions: { network: false } };
  const theme = undefined;

  // Strict: #root becomes a flex column that forces its outermost child to
  // fill the surface and neutralizes shrink-to-content / centered-card CSS.
  const strict = buildSrcdoc(body, "{}", [], theme, false, "strict");
  assert.match(strict, /#root \{ display: flex; flex-direction: column; \}/);
  assert.match(strict, /#root > \* \{ flex: 1 1 auto;/);
  assert.match(strict, /max-width: none/);

  // Moderate is the historical default: no extra #root enforcement rules.
  const moderate = buildSrcdoc(body, "{}", [], theme, false, "moderate");
  assert.doesNotMatch(moderate, /#root \{ display: flex; flex-direction: column; \}/);
  assert.doesNotMatch(moderate, /overflow: visible/);

  // Low relaxes even the historical clamp so content may size naturally.
  const low = buildSrcdoc(body, "{}", [], theme, false, "low");
  assert.match(low, /#root \{ height: auto; min-height: 100%; overflow: visible; \}/);

  // The 6th argument defaults to moderate so existing callers are unchanged.
  const defaulted = buildSrcdoc(body, "{}", [], theme, false);
  assert.doesNotMatch(defaulted, /#root \{ display: flex; flex-direction: column; \}/);
});

test("script widget stage primitive does not impose a dark object background", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "document.getElementById('root').innerHTML = '<div class=\"kk-stage\"></div>';",
    permissions: { network: false },
  });

  assert.match(srcdoc, /\.kk-stage \{[\s\S]*background: transparent;/);
  assert.doesNotMatch(srcdoc, /\.kk-stage \{[\s\S]*background: #0f172a;/);
});

test("script widget host exposes file and folder drop-zone helper", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "KK.onFileDrop(document.getElementById('root'), () => {});",
    permissions: { network: false },
  });

  assert.match(srcdoc, /onFileDrop: function \(target, callback, options\)/);
  assert.match(srcdoc, /dragover/);
  assert.match(srcdoc, /webkitGetAsEntry/);
  assert.match(srcdoc, /readDirectoryEntries/);
  assert.match(srcdoc, /readAsArrayBuffer/);
});

test("script widget wraps user source in IIFE so top-level return is legal", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  // A realistic AI-generated body with effect-style cleanup return.
  const source = "let t = setInterval(() => {}, 100);\nreturn () => clearInterval(t);";
  const srcdoc = buildSrcdoc({ source, permissions: { network: false } });

  // The wrapper must appear in the injected call, with the source flanked by
  // the IIFE prefix and suffix.
  assert.match(
    srcdoc,
    /injectScript\('\(function\(\){' \+ "let t = setInterval[^\n]*?clearInterval\(t\);" \+ '\\n}\)\(\);'/,
  );

  // The wrapped script that would actually execute in the iframe must parse
  // as a top-level Program without "Illegal return statement".
  const wrapped = `(function(){${source}\n})();`;
  assert.doesNotThrow(() => new vm.Script(wrapped));
  // And the unwrapped form must still be illegal — proving the wrapper is
  // doing the work, not some lucky parser leniency.
  assert.throws(() => new vm.Script(source), /Illegal return/);
});

test("script widget signals smoke-test ready and bubbles runtime errors to parent", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "document.getElementById('root').textContent = 'ok';",
    permissions: { network: false },
  });

  // After the user source loads, the host posts a kk.ready signal so
  // ScriptWidgetHost can clear its 2s smoke-test watchdog. Without this
  // signal, every widget would appear unhealthy on first mount.
  assert.match(
    srcdoc,
    /window\.parent\.postMessage\(\{\s*kk:\s*true,\s*type:\s*'ready'\s*\},\s*'\*'\)/,
  );

  // The iframe's showError handler posts kk.runtimeError to the parent so
  // a thrown widget surfaces in the dashboard health state and the
  // assistant context payload, not only in an in-iframe <pre>.
  assert.match(
    srcdoc,
    /window\.parent\.postMessage\(\{\s*kk:\s*true,\s*type:\s*'runtimeError',\s*error:\s*serialized\s*\},\s*'\*'\)/,
  );
});

test("script widget rAF wrapper emits throttled motionTick heartbeat for stall watchdog", async () => {
  const { buildSrcdoc } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/permissions.ts", import.meta.url),
  );
  const srcdoc = buildSrcdoc({
    source: "function frame(){ requestAnimationFrame(frame); } requestAnimationFrame(frame);",
    permissions: { network: false },
  });

  // The wrapper centralises rAF dispatch in runKkRafPump; the heartbeat
  // post must live inside that function so every iframe gets a stall
  // signal whether or not the user source calls rAF.
  assert.match(srcdoc, /KK_MOTION_TICK_MIN_MS\s*=\s*500/);
  assert.match(
    srcdoc,
    /window\.parent\.postMessage\(\{\s*kk:\s*true,\s*type:\s*'motionTick',\s*ticks:\s*_kkMotionTickCounter\s*\},\s*'\*'\)/,
  );
  // Throttle gate: the post must be guarded by a timestamp comparison so
  // a 60 fps widget produces ~2 messages/s, not 60.
  assert.match(srcdoc, /if\s*\(\s*timestamp\s*-\s*_kkLastMotionTickPostAt\s*>=\s*KK_MOTION_TICK_MIN_MS\s*\)/);
});

test("script widget infers common local libraries from legacy generated source", async () => {
  const { resolveWidgetLibraryKeys } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/widgetLibraries.ts", import.meta.url),
  );

  assert.deepEqual(
    resolveWidgetLibraryKeys(undefined, "mermaid.initialize({ startOnLoad: false }); anime.timeline();"),
    ["animejs"],
  );
});

test("script widget resolver accepts every advertised local library", async () => {
  const { WIDGET_LIBRARIES, resolveWidgetLibraryKeys } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/widgetLibraries.ts", import.meta.url),
  );

  const keys = Object.keys(WIDGET_LIBRARIES);
  assert.ok(keys.length > 20);
  assert.ok(!keys.includes("mermaid"));
  assert.ok(keys.includes("uplot"));
  assert.ok(keys.includes("fusejs"));
  assert.ok(keys.includes("simplestatistics"));
  assert.deepEqual(resolveWidgetLibraryKeys(keys, ""), keys);
});

test("script widget library catalog documents search, statistics, and time-series helpers", async () => {
  const { libraryCatalogForAi } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/widgetLibraries.ts", import.meta.url),
  );

  const catalog = libraryCatalogForAi();
  assert.doesNotMatch(catalog, /mermaid \(global: mermaid\)/);
  assert.match(catalog, /uplot \(global: uPlot\)/);
  assert.match(catalog, /fusejs \(global: Fuse\)/);
  assert.match(catalog, /simplestatistics \(global: ss\)/);
});

test("script widget library catalog documents qrcode canvas target contract", async () => {
  const { libraryCatalogForAi } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/widgetLibraries.ts", import.meta.url),
  );

  const catalog = libraryCatalogForAi();
  assert.match(catalog, /qrcode \(global: QRCode\)/);
  assert.match(catalog, /QRCode\.toCanvas, pass a real <canvas> element, not a wrapper div/);
});

test("script widget library catalog documents Matter.js physics contract", async () => {
  const { libraryCatalogForAi } = await importTypeScriptModule(
    new URL("../src/modules/dashboard/script/widgetLibraries.ts", import.meta.url),
  );

  const catalog = libraryCatalogForAi();
  assert.match(catalog, /matter \(global: Matter\)/);
  assert.match(catalog, /2D physics engine/);
  assert.match(catalog, /explicit wall\/floor bodies sized from KK\.getViewport\(\)/);
});
