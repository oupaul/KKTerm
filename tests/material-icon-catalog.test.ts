import assert from "node:assert/strict";
import test from "node:test";

import {
  isMaterialIconRef,
  lucideIconNameFromRef,
  lucideIconRefForName,
  materialIconIdFromRef,
  materialIconRefForId,
  searchMaterialIcons,
} from "../src/lib/iconCatalog.ts";

test("material icon refs are explicit and reject unsafe ids", () => {
  assert.equal(materialIconRefForId("folder-server"), "material:folder-server");
  assert.equal(materialIconIdFromRef("material:folder-server"), "folder-server");
  assert.equal(isMaterialIconRef("material:folder-server"), true);
  assert.equal(isMaterialIconRef("material:../folder-server"), false);
  assert.equal(isMaterialIconRef("Folder"), false);
  assert.equal(lucideIconRefForName("Server"), "lucide:Server");
  assert.equal(lucideIconNameFromRef("lucide:Server"), "Server");
  assert.equal(lucideIconNameFromRef("lucide:../Server"), null);
});

test("material icon search matches ids and manifest-derived tags", () => {
  assert.equal(searchMaterialIcons("folder server", 8)[0]?.id, "folder-server");
  assert.ok(
    searchMaterialIcons("inventory", 12).some((icon) => icon.id === "folder-server"),
    "folder-name aliases should be searchable",
  );
  assert.ok(
    searchMaterialIcons("tsx", 12).some((icon) => icon.id.includes("typescript") || icon.id.includes("react")),
    "file-extension aliases should be searchable",
  );
});
