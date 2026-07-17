import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const hostSource = await readFile(
  new URL("../src/modules/dashboard/script/ScriptWidgetHost.tsx", import.meta.url),
  "utf8",
);

test("script widget bridge keeps the latest context-menu callback without reinstalling", () => {
  assert.match(
    hostSource,
    /const onWidgetContextMenuRef = useRef\(onWidgetContextMenu\);\s*onWidgetContextMenuRef\.current = onWidgetContextMenu;/,
  );
  assert.match(hostSource, /void onWidgetContextMenuRef\.current\(\{/);
  assert.match(
    hostSource,
    /\}, \[canUseNetworkTools, instance\.id, updateInstance, setWidgetHealth\]\);/,
  );
});

test("script widget network event listener follows permission and cleans up late registration", () => {
  const effectMatch = hostSource.match(
    /\/\/ Forward net:\/\/event Tauri events[\s\S]*?(useEffect\(\(\) => \{[\s\S]*?\}, \[canUseNetworkTools\]\);)/,
  );
  assert.ok(effectMatch, "network event effect should depend on effective permission");

  const effectSource = effectMatch[1];
  assert.match(effectSource, /if \(!canUseNetworkTools\) \{\s*return;\s*\}/);
  assert.match(effectSource, /\.then\(\(stopListening\) => \{/);
  assert.match(
    effectSource,
    /if \(!mounted\) \{\s*stopListening\(\);\s*return;\s*\}/,
    "a listener that resolves after effect cleanup must immediately unregister",
  );
  assert.match(effectSource, /mounted = false;\s*if \(unlisten\) unlisten\(\);/);
});
