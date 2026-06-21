import { readFile } from "node:fs/promises";

const [index, registry, tauriConfig, context] = await Promise.all([
  readFile("docs/manual/INDEX.md", "utf8"),
  readFile("src-tauri/src/manual.rs", "utf8"),
  readFile("src-tauri/tauri.conf.json", "utf8"),
  readFile("CONTEXT.md", "utf8"),
]);

const indexedChapters = new Set(
  [...index.matchAll(/\| \d+ \| \[([^\]]+\.md)\]/g)].map((match) => match[1]),
);
const registeredChapters = new Set(
  [...registry.matchAll(/filename: "(\d{2}-[^"]+\.md)"/g)].map((match) => match[1]),
);
const bundledChapters = new Set(
  [...tauriConfig.matchAll(/\.\.\/docs\/manual\/(\d{2}-[^"]+\.md)"/g)].map(
    (match) => match[1],
  ),
);

for (const chapter of indexedChapters) {
  if (!registeredChapters.has(chapter)) {
    throw new Error(`${chapter} is indexed but unavailable to the manual reader and AI Assistant.`);
  }
  if (!bundledChapters.has(chapter)) {
    throw new Error(`${chapter} is indexed but missing from the shipped Tauri resources.`);
  }
}

for (const chapter of [...registeredChapters, ...bundledChapters]) {
  if (!indexedChapters.has(chapter)) {
    throw new Error(`${chapter} is registered or bundled but missing from the manual index.`);
  }
}

const requiredModuleChapters = new Map([
  ["Dashboard Module", "10-dashboard.md"],
  ["IT Ops Module", "12-it-ops.md"],
  ["Install Helper Module", "18-installer.md"],
]);

for (const [moduleName, chapter] of requiredModuleChapters) {
  if (!context.includes(`**${moduleName}**`)) {
    throw new Error(`CONTEXT.md no longer defines ${moduleName}; update this coverage guard.`);
  }
  if (!indexedChapters.has(chapter)) {
    throw new Error(`${moduleName} has no indexed operation-manual chapter.`);
  }
}
