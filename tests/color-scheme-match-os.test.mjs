import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Match OS resolves the applied scheme at startup or scheme switch only", async () => {
  const shellEffectsSource = await readFile(
    new URL("../src/app/appShellEffects.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    shellEffectsSource,
    /resolveAppliedColorScheme\(colorScheme\)/,
    "app shell should resolve match-os before writing data-color-scheme",
  );
  assert.match(
    shellEffectsSource,
    /document\.documentElement\.setAttribute\("data-color-scheme", appliedColorScheme\);/,
    "portal-mounted dialogs should inherit the resolved light or dark scheme",
  );
  assert.doesNotMatch(
    shellEffectsSource,
    /matchMedia\([^)]*\)\.addEventListener/,
    "Match OS should not subscribe to OS theme changes after startup",
  );
});

test("Match OS can read a system accent through the typed command boundary", async () => {
  const [tauriSource, shellEffectsSource] = await Promise.all([
    readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/appShellEffects.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    tauriSource,
    /get_system_accent_color:\s*\{\s*args:\s*undefined;\s*result:\s*SystemAccentColor \| null;/s,
    "system accent color should use a typed Tauri command",
  );
  assert.match(
    shellEffectsSource,
    /if \(appearanceSettings\.colorScheme !== "match-os"\) \{/,
    "system accent reads should be limited to the Match OS scheme",
  );
  assert.doesNotMatch(
    shellEffectsSource,
    /setInterval\([^)]*get_system_accent_color/s,
    "system accent color should not be polled",
  );
});

test("App UI font is applied through the root design token", async () => {
  const shellEffectsSource = await readFile(
    new URL("../src/app/appShellEffects.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    shellEffectsSource,
    /document\.documentElement\.style\.setProperty\("--app-ui-font-family", appearanceSettings\.appFontFamily\);/,
    "custom App UI fonts should update the root token used by titlebar, settings popups, and portals",
  );
  assert.doesNotMatch(
    shellEffectsSource,
    /node\.style\.setProperty\("--app-ui-font-family"/,
    "the App UI font token should not be scoped only to .app-shell",
  );
});

test("Appearance Settings exposes Match OS as a color scheme option", async () => {
  const [gridSource, localeSource] = await Promise.all([
    readFile(new URL("../src/modules/settings/ThemeSchemeGrid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  ]);

  assert.match(
    gridSource,
    /\{ value: "match-os", labelKey: "settings\.schemeMatchOs" \}/,
    "the theme scheme grid should list Match OS as a color scheme card",
  );
  assert.match(
    localeSource,
    /"schemeMatchOs": "Match OS"/,
    "the Match OS option should have an English label",
  );
});
