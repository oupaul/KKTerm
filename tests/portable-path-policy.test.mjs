import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const rustRoot = path.join(repositoryRoot, "src-tauri", "src");

async function rustSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return rustSources(entryPath);
      return entry.isFile() && entry.name.endsWith(".rs") ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

test("KKTerm-owned durable paths go through the portable-aware path boundary", async () => {
  const directTauriPathUsers = [];
  for (const sourcePath of await rustSources(rustRoot)) {
    const source = await readFile(sourcePath, "utf8");
    if (/\.app_(?:data|cache)_dir\s*\(/.test(source)) {
      directTauriPathUsers.push(path.relative(repositoryRoot, sourcePath).replaceAll("\\", "/"));
    }
  }

  assert.deepEqual(
    directTauriPathUsers,
    ["src-tauri/src/app_paths.rs"],
    "new KKTerm-owned app-data/cache paths must be resolved through app_paths",
  );
});

test("Install Helper managed web apps remain machine-local in portable mode", async () => {
  const managedApps = await readFile(
    path.join(rustRoot, "installer", "managed_app.rs"),
    "utf8",
  );

  assert.match(managedApps, /var_os\("LOCALAPPDATA"\)/);
  assert.match(managedApps, /join\("KKTerm"\)\.join\("installer"\)\.join\("apps"\)/);
  assert.doesNotMatch(
    managedApps,
    /app_paths|kkterm-portable\.marker/,
    "managed app runtimes and services must not depend on the portable data root",
  );
});
