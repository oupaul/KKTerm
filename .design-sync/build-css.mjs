#!/usr/bin/env node
// Regenerates .design-sync/kkterm-ds.css (the /design-sync cssEntry) from the
// app's real stylesheets so the synced look never drifts from source.
// Run from the repo root:  node .design-sync/build-css.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

// colorSchemes.css ships 3 @font-face blocks with src/styles-relative url()s
// that wouldn't resolve from .design-sync/. Strip them; the preamble re-declares
// the brand fonts with .design-sync-relative paths instead.
const palette = read("src/styles/colorSchemes.css").replace(/@font-face\s*\{[^}]*\}\s*/g, "");

const dialogs = read("src/app/ui/dialog/dialogs.css");
const moduleHeader = read("src/app/moduleHeader.css");
const colorPicker = read("src/app/ui/colorPalettePicker.css");

// The toggle-switch lives inside the 2.6k-line settings.css; inline its
// canonical base rules here (small + stable) rather than slice by line range.
const toggle = `
/* ---- .toggle-switch (from src/modules/settings/settings.css) ---- */
.toggle-switch { flex: 0 0 auto; cursor: pointer; outline: none; }
.toggle-switch:focus-visible {
  border-radius: 12px;
  box-shadow: 0 0 0 2px var(--accent-ring, var(--accent));
}
.toggle-switch-track {
  display: block; position: relative; width: 36px; height: 20px;
  border-radius: 20px; background: var(--toggle-off-bg, var(--border));
  transition: background 0.2s ease;
}
.toggle-switch-on .toggle-switch-track { background: var(--accent); }
.toggle-switch-knob {
  display: block; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); transition: transform 0.2s ease;
}
.toggle-switch-on .toggle-switch-knob { transform: translateX(16px); }
.toggle-switch-disabled { cursor: not-allowed; opacity: 0.55; }
`;

const PREAMBLE = `/* ============================================================================
   KKTerm design-system stylesheet (flattened for /design-sync).
   Assembled by .design-sync/build-css.mjs from the app's real sources:
     src/styles/colorSchemes.css   (:root token palette + scheme variants)
     src/app/ui/dialog/dialogs.css (kk-* Apple/Finder dialog primitives)
     src/app/moduleHeader.css      (.module-header)
     src/app/ui/colorPalettePicker.css
     src/modules/settings/settings.css  (.toggle-switch slice, inlined)
   Do not hand-edit — re-run build-css.mjs instead.
   ========================================================================== */

/* --- brand fonts (paths relative to .design-sync/) ----------------------- */
@font-face {
  font-family: "Inter";
  src: url("../src/assets/fonts/inter/web/InterVariable.woff2") format("woff2");
  font-display: swap; font-weight: 100 900; font-style: normal;
}
@font-face {
  font-family: "Inter";
  src: url("../src/assets/fonts/inter/web/InterVariable-Italic.woff2") format("woff2");
  font-display: swap; font-weight: 100 900; font-style: italic;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url("../src/assets/fonts/jetbrains-mono/web/JetBrainsMono-Variable.woff2") format("woff2");
  font-display: swap; font-weight: 100 800; font-style: normal;
}

/* --- minimal reset + base typography (the app sets these globally) ------- */
* { box-sizing: border-box; }
html, body {
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
body {
  margin: 0; color: var(--text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 13px;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
button, input, select, textarea { font: inherit; }
button { border: 0; }
`;

const SEP = (label) => `\n\n/* ======================= ${label} ======================= */\n`;

const out = [
  PREAMBLE,
  SEP("colorSchemes.css — token palette"),
  palette,
  SEP("dialogs.css — kk-* Apple/Finder dialog primitives"),
  dialogs,
  SEP("moduleHeader.css"),
  moduleHeader,
  SEP("colorPalettePicker.css"),
  colorPicker,
  SEP("toggle-switch (inlined)"),
  toggle,
].join("");

writeFileSync(join(HERE, "kkterm-ds.css"), out);
console.error(`wrote .design-sync/kkterm-ds.css (${(out.length / 1024).toFixed(0)} KB)`);
