import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const manifestPath = new URL("../src/assets/file-icons/material-icon-theme/manifest.json", import.meta.url);
const iconDirPath = new URL("../src/assets/file-icons/material-icon-theme/icons", import.meta.url);
const resolverPath = new URL(
  "../src/modules/workspace/connections/sftp/materialFileIconResolver.ts",
  import.meta.url,
);
const finderGlyphsPath = new URL("../src/modules/workspace/connections/sftp/finderGlyphs.tsx", import.meta.url);

test("bundles Material Icon Theme mappings with every referenced SVG", async () => {
  assert.ok(existsSync(manifestPath), "expected vendored Material Icon Theme manifest");
  assert.ok(existsSync(iconDirPath), "expected vendored Material Icon Theme icon directory");

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  assert.equal(manifest.source.package, "material-icon-theme");
  assert.equal(manifest.source.version, "5.35.0");
  assert.equal(manifest.fileNames["package.json"], "nodejs");
  assert.equal(manifest.fileNames.dockerfile, "docker");
  assert.equal(manifest.fileExtensions.tsx, "react_ts");
  assert.equal(manifest.fileExtensions["d.ts"], "typescript-def");
  assert.equal(manifest.fileExtensions["spec.ts"], "test-ts");
  assert.equal(manifest.folderNames.src, "folder-src");

  const referencedIconIds = new Set([
    manifest.file,
    manifest.folder,
    ...Object.values(manifest.fileNames),
    ...Object.values(manifest.fileExtensions),
    ...Object.values(manifest.folderNames),
  ]);

  const iconDir = fileURLToPath(iconDirPath);
  for (const iconId of referencedIconIds) {
    const iconFileName = manifest.iconFiles[iconId];
    assert.ok(iconFileName, `missing SVG filename mapping for Material icon '${iconId}'`);
    const iconPath = join(iconDir, iconFileName);
    assert.ok(existsSync(iconPath), `missing SVG for Material icon '${iconId}'`);
  }
});

test("resolves exact names, longest suffix extensions, folder names, and fallbacks", async () => {
  assert.ok(existsSync(resolverPath), "expected Material file icon resolver");

  const resolverModule = await import(pathToFileURL(fileURLToPath(resolverPath)));
  const { materialFileIconIdFor } = resolverModule;

  assert.equal(materialFileIconIdFor({ name: "package.json", kind: "file" }), "nodejs");
  assert.equal(materialFileIconIdFor({ name: "Dockerfile", kind: "file" }), "docker");
  assert.equal(materialFileIconIdFor({ name: "component.spec.ts", kind: "file" }), "test-ts");
  assert.equal(materialFileIconIdFor({ name: "types.d.ts", kind: "file" }), "typescript-def");
  assert.equal(materialFileIconIdFor({ name: "Widget.tsx", kind: "file" }), "react_ts");
  assert.equal(materialFileIconIdFor({ name: "src", kind: "folder" }), "folder-src");
  assert.equal(materialFileIconIdFor({ name: "ordinary-folder", kind: "folder" }), "folder");
  assert.equal(materialFileIconIdFor({ name: "unknown.blob", kind: "file" }), "file");
  assert.equal(materialFileIconIdFor({ name: "link-without-extension", kind: "symlink" }), "file");
});

test("actual SFTP browser glyph component renders Material Icon Theme assets", async () => {
  const source = await readFile(finderGlyphsPath, "utf8");

  assert.match(source, /materialFileIconIdFor/, "FileGlyph should resolve through Material Icon Theme mappings");
  assert.match(source, /material-icon-theme\/icons\/\*\.svg/, "FileGlyph should load bundled Material SVG assets");
  assert.doesNotMatch(source, /function FolderGlyph/, "FileGlyph should not keep rendering the old drawn folder glyph");
  assert.doesNotMatch(source, /function DocGlyph/, "FileGlyph should not keep rendering the old drawn document glyph");
});
