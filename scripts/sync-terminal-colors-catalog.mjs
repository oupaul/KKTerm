import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://terminalcolors.com";
const OUTPUT_URL = new URL(
  "../src/modules/workspace/connections/terminal/terminalColorsCatalog.generated.ts",
  import.meta.url,
);
const FAMILY_NAMES = new Map([
  ["ayu", "Ayu"],
  ["catppuccin", "Catppuccin"],
  ["cobalt2", "Cobalt2"],
  ["github", "GitHub"],
  ["night-owl", "Night Owl"],
  ["one-half", "One Half"],
  ["rose-pine", "Rosé Pine"],
  ["seoul256", "Seoul256"],
]);
const EXISTING_IDS = new Set([
  "ayu-dark",
  "catppuccin-latte",
  "catppuccin-mocha",
  "cobalt2",
  "dracula",
  "everforest-dark",
  "github-dark",
  "gruvbox-dark",
  "gruvbox-light",
  "nord",
  "one-dark",
  "one-light",
  "rose-pine",
  "solarized-dark",
  "solarized-light",
  "tokyo-night",
]);
const EXISTING_VARIANT_PATHS = new Set(["/themes/kanagawa/wave/"]);
const REQUIRED_PALETTE_KEYS = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
];

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetching ${url} failed with HTTP ${response.status}.`);
  }
  return response.text();
}

function uniqueMatches(source, pattern, transform = (match) => match[0]) {
  return [...new Set([...source.matchAll(pattern)].map(transform))];
}

async function inBatches(values, batchSize, task) {
  const results = [];
  for (let index = 0; index < values.length; index += batchSize) {
    results.push(...await Promise.all(values.slice(index, index + batchSize).map(task)));
  }
  return results;
}

function titleCaseSlug(value) {
  return value
    .split("-")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(" ");
}

function schemeIdentity(variantPath) {
  const [, familySlug, variantSlug] = /^\/themes\/([^/]+)\/([^/]+)\/$/.exec(variantPath) ?? [];
  if (!familySlug || !variantSlug) {
    throw new Error(`Unexpected TerminalColors variant path: ${variantPath}`);
  }
  const familyName = FAMILY_NAMES.get(familySlug) ?? titleCaseSlug(familySlug);
  return {
    familySlug,
    id: variantSlug === "default" ? familySlug : `${familySlug}-${variantSlug}`,
    name: variantSlug === "default" ? familyName : `${familyName} ${titleCaseSlug(variantSlug)}`,
  };
}

function parseAlacrittyPalette(source, sourceUrl) {
  const sections = new Map();
  let section = "";
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1];
      sections.set(section, {});
      continue;
    }
    const valueMatch = /^(\w+)\s*=\s*["'](#[0-9a-fA-F]{6})["']$/.exec(line);
    if (valueMatch && section) {
      sections.get(section)[valueMatch[1]] = valueMatch[2].toLowerCase();
    }
  }

  const primary = sections.get("colors.primary") ?? {};
  const normal = sections.get("colors.normal") ?? {};
  const bright = sections.get("colors.bright") ?? {};
  const cursor = sections.get("colors.cursor") ?? {};
  const selection = sections.get("colors.selection") ?? {};
  const palette = {
    background: primary.background,
    foreground: primary.foreground,
    cursor: cursor.cursor,
    selectionBackground: selection.background,
    black: normal.black,
    red: normal.red,
    green: normal.green,
    yellow: normal.yellow,
    blue: normal.blue,
    magenta: normal.magenta,
    cyan: normal.cyan,
    white: normal.white,
    brightBlack: bright.black,
    brightRed: bright.red,
    brightGreen: bright.green,
    brightYellow: bright.yellow,
    brightBlue: bright.blue,
    brightMagenta: bright.magenta,
    brightCyan: bright.cyan,
    brightWhite: bright.white,
  };
  for (const key of ["background", "foreground", ...REQUIRED_PALETTE_KEYS]) {
    if (!palette[key]) {
      throw new Error(`${sourceUrl} is missing ${key}.`);
    }
  }
  return Object.fromEntries(Object.entries(palette).filter(([, value]) => Boolean(value)));
}

async function loadVariant(variantPath) {
  const pageUrl = `${SITE_ORIGIN}${variantPath}`;
  const page = await fetchText(pageUrl);
  const identity = schemeIdentity(variantPath);
  const previewName = page.match(/alt="([^"]+) Terminal Color Scheme"/)?.[1]
    ?.replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"');
  const downloadPath = page.match(/\/downloads\/alacritty\/[^"' ]+\.toml/)?.[0];
  if (!downloadPath) {
    throw new Error(`${pageUrl} does not expose an Alacritty download.`);
  }
  const sourceUrl = `${SITE_ORIGIN}${downloadPath}`;
  const palette = parseAlacrittyPalette(await fetchText(sourceUrl), sourceUrl);
  const name = previewName
    ? identity.id === identity.familySlug
      ? previewName.replace(/ Default$/, "")
      : previewName
    : identity.name;
  return { ...identity, name, palette, sourceUrl };
}

function serializeScheme(scheme) {
  const paletteLines = Object.entries(scheme.palette)
    .map(([key, value]) => `      ${key}: ${JSON.stringify(value)},`)
    .join("\n");
  return `  {\n    id: ${JSON.stringify(scheme.id)},\n    name: ${JSON.stringify(scheme.name)},\n    palette: {\n${paletteLines}\n    },\n  },`;
}

const homepage = await fetchText(`${SITE_ORIGIN}/`);
const familySlugs = uniqueMatches(homepage, /\/themes\/([^/"' ]+)\//g, (match) => match[1]);
const familyPages = await inBatches(
  familySlugs,
  10,
  (familySlug) => fetchText(`${SITE_ORIGIN}/themes/${familySlug}/`),
);
const variantPaths = uniqueMatches(
  familyPages.join("\n"),
  /\/themes\/[^/"' ]+\/[^/"' ]+\//g,
).sort();
const importedPaths = variantPaths.filter((variantPath) => {
  const { id } = schemeIdentity(variantPath);
  return !EXISTING_IDS.has(id) && !EXISTING_VARIANT_PATHS.has(variantPath);
});
const schemes = (await inBatches(importedPaths, 10, loadVariant))
  .sort((left, right) => left.name.localeCompare(right.name));
const duplicateIds = schemes.filter((scheme, index) =>
  schemes.findIndex((candidate) => candidate.id === scheme.id) !== index
);
if (duplicateIds.length > 0) {
  throw new Error(`Duplicate generated scheme IDs: ${duplicateIds.map(({ id }) => id).join(", ")}`);
}

const output = `// Generated by scripts/sync-terminal-colors-catalog.mjs. Do not edit manually.\n// Source: https://terminalcolors.com/ (${variantPaths.length} downloadable variants; ${schemes.length} added after deduplication).\nimport type { TerminalColorScheme } from "./colorSchemes";\n\nexport const TERMINAL_COLORS_CATALOG_SCHEMES = [\n${schemes.map(serializeScheme).join("\n")}\n] as const satisfies readonly TerminalColorScheme[];\n`;
await writeFile(OUTPUT_URL, output, "utf8");
console.log(`Wrote ${schemes.length} schemes to ${fileURLToPath(OUTPUT_URL)}.`);
