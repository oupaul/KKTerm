import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/lib/durableUiState.ts", import.meta.url),
  "utf8",
);

test("startup durable-state reconciliation indexes database values once with first-record semantics", () => {
  const hydration = source.slice(source.indexOf("export async function hydrateDurableUiState"));

  assert.match(hydration, /const databaseValues = new Map<string, string>\(\);/);
  assert.match(
    hydration,
    /for \(const record of records\) \{[\s\S]*?if \(!databaseValues\.has\(record\.key\)\) \{[\s\S]*?databaseValues\.set\(record\.key, record\.value\);[\s\S]*?\}/,
    "the first row for a duplicate key should remain authoritative, matching Array.find",
  );
  assert.match(
    hydration,
    /databaseValues\.has\(key\) && databaseValues\.get\(key\) === value/,
  );
  assert.doesNotMatch(
    hydration,
    /records\.find\(/,
    "cached keys should not trigger repeated linear scans of database records",
  );
});
