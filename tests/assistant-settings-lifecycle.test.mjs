import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("settings navigation keeps the assistant panel mounted", async () => {
  const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const assistantRender = appSource.match(/\n\s*<AssistantPanel[\s\S]*?\n\s*\/>/);

  assert.ok(assistantRender, "App should render AssistantPanel.");
  assert.doesNotMatch(
    appSource,
    /activePage\s*!==\s*"settings"\s*\?\s*\(\s*<AssistantPanel/,
    "AssistantPanel must stay mounted when Settings is active so in-flight AI work can continue.",
  );
});

test("settings mode visually suppresses the mounted assistant panel", async () => {
  // Settings now renders as a full-viewport modal overlay that covers the
  // still-mounted assistant panel, rather than toggling its visibility.
  const settingsCss = await readFile(
    new URL("../src/modules/settings/settings.css", import.meta.url),
    "utf8",
  );

  const backdropMatch = settingsCss.match(/\.settings-backdrop\s*\{(?<body>[^}]+)\}/);
  assert.ok(backdropMatch?.groups?.body, "Settings should render through a .settings-backdrop overlay.");
  const backdrop = backdropMatch.groups.body;

  assert.match(backdrop, /position:\s*fixed;/, "The settings overlay must be fixed over the viewport.");
  assert.match(backdrop, /inset:\s*[^;]*0 0;/, "The settings overlay must stretch across the viewport.");
  assert.match(backdrop, /background:\s*[^;]+;/, "The settings overlay must dim the content behind it.");

  const backdropZ = Number(backdrop.match(/z-index:\s*(\d+);/)?.[1]);
  assert.ok(
    Number.isFinite(backdropZ) && backdropZ > 0,
    "The settings overlay should declare a positive z-index so it stacks above the mounted panels.",
  );
});
