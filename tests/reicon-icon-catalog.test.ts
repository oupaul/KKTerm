import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function fromRoot(relativePath: string) {
  return path.join(root, relativePath);
}

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "src-tauri") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(fullPath));
    } else if (/\.[cm]?[tj]sx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test("app icon imports route through the Reicon adapter", async () => {
  const packageJson = JSON.parse(await readFile(fromRoot("package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  assert.ok(packageJson.dependencies?.["reicon-react"], "reicon-react should be a runtime dependency");

  const imports: string[] = [];
  for (const file of await sourceFiles(fromRoot("src"))) {
    const source = await readFile(file, "utf8");
    if (source.includes('from "lucide-react"')) {
      imports.push(path.relative(root, file).replace(/\\/g, "/"));
    }
  }

  assert.deepEqual(imports, ["src/lib/reicon.tsx"]);
});

test("Reicon picker catalog adds 300+ project-relevant icons and keeps bilingual search", async () => {
  assert.ok(existsSync(fromRoot("src/lib/reiconCatalog.tsx")), "src/lib/reiconCatalog.tsx should exist");

  const catalog = await import("../src/lib/reiconCatalog.tsx") as typeof import("../src/lib/reiconCatalog");
  assert.ok(
    catalog.REICON_PICKER_ICON_NAMES.length >= 400,
    "picker should include the existing curated set plus at least 300 more Reicon icons",
  );

  const databaseResults = catalog.searchReiconPickerIcons("資料庫", "zh-TW", 20).map((icon) => icon.name);
  assert.ok(databaseResults.includes("Database"), "zh-TW database search should find the English Database icon");

  const englishResults = catalog.searchReiconPickerIcons("database", "zh-TW", 20).map((icon) => icon.name);
  assert.ok(englishResults.includes("Database"), "English search should keep working in a non-English UI");
});
