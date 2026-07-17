import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/workspace/connections/sftp/SftpFilePane.tsx", import.meta.url),
  "utf8",
);

function loadProductionSorter() {
  const start = source.indexOf("function sortFileEntries");
  const end = source.indexOf("\ntype Crumb", start);
  assert.notEqual(start, -1, "sortFileEntries should exist");
  assert.notEqual(end, -1, "sortFileEntries should end before the Crumb model");

  const functionSource = source
    .slice(start, end)
    .replace(
      "function sortFileEntries(files: FileEntry[], sort: SortState)",
      "function sortFileEntries(files, sort)",
    );
  assert.doesNotMatch(functionSource, /FileEntry|SortState/, "the sorter should be executable after removing its parameter types");
  return Function(`"use strict"; ${functionSource}; return sortFileEntries;`)();
}

function referenceSort(files, sort) {
  return [...files].sort((left, right) => {
    if (left.kind === "folder" && right.kind !== "folder") {
      return -1;
    }
    if (left.kind !== "folder" && right.kind === "folder") {
      return 1;
    }
    const byName = left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
    const primary =
      sort.key === "size"
        ? (left.sizeBytes ?? -1) - (right.sizeBytes ?? -1)
        : sort.key === "date"
          ? (left.modifiedTimestamp ?? 0) - (right.modifiedTimestamp ?? 0)
          : byName;
    if (primary === 0) {
      return byName;
    }
    return sort.dir === "asc" ? primary : -primary;
  });
}

test("file-pane rows use one memoized selected-name membership index", () => {
  assert.match(
    source,
    /const selectedNameSet = useMemo\(\(\) => new Set\(selectedNames\), \[selectedNames\]\);/,
  );
  assert.equal(
    source.match(/selectedNameSet\.has\(file\.name\)/g)?.length,
    2,
    "both list and gallery rows should use constant-time membership checks",
  );
  assert.doesNotMatch(
    source,
    /selectedNames\.includes\(file\.name\)/,
    "render loops should not scan the selection array for every file",
  );
});

test("optimized size/date sorting is order-equivalent to the previous comparator", () => {
  const sortFileEntries = loadProductionSorter();
  const files = [
    { id: "folder-10", kind: "folder", name: "Folder 10", sizeBytes: undefined, modifiedTimestamp: undefined },
    { id: "file-2-large", kind: "file", name: "file 2", sizeBytes: 900, modifiedTimestamp: 30 },
    { id: "folder-2", kind: "folder", name: "folder 2", sizeBytes: 500, modifiedTimestamp: 50 },
    { id: "file-10", kind: "file", name: "File 10", sizeBytes: 20, modifiedTimestamp: 40 },
    { id: "alpha-new", kind: "file", name: "alpha", sizeBytes: 20, modifiedTimestamp: 80 },
    { id: "alpha-old", kind: "file", name: "Alpha", sizeBytes: 20, modifiedTimestamp: 10 },
    { id: "missing", kind: "file", name: "missing", sizeBytes: undefined, modifiedTimestamp: undefined },
    { id: "zero", kind: "file", name: "zero", sizeBytes: 0, modifiedTimestamp: 0 },
    { id: "same-a", kind: "file", name: "same", sizeBytes: 7, modifiedTimestamp: 7 },
    { id: "same-b", kind: "file", name: "same", sizeBytes: 7, modifiedTimestamp: 7 },
  ];

  for (const key of ["name", "size", "date"]) {
    for (const dir of ["asc", "desc"]) {
      const sort = { key, dir };
      assert.deepEqual(
        sortFileEntries(files, sort).map((file) => file.id),
        referenceSort(files, sort).map((file) => file.id),
        `${key} ${dir} should preserve folder grouping, direction, and name tie ordering`,
      );
    }
  }
});

test("size/date sorting compares names only when numeric values tie", () => {
  const sortFileEntries = loadProductionSorter();

  for (const key of ["size", "date"]) {
    let nameComparisons = 0;
    const name = (order) => ({
      localeCompare() {
        nameComparisons += 1;
        return order;
      },
    });
    const numericField = key === "size" ? "sizeBytes" : "modifiedTimestamp";

    sortFileEntries(
      [
        { kind: "file", name: name(-1), [numericField]: 1 },
        { kind: "file", name: name(1), [numericField]: 2 },
      ],
      { key, dir: "asc" },
    );
    assert.equal(nameComparisons, 0, `${key} non-ties should skip localeCompare`);

    sortFileEntries(
      [
        { kind: "file", name: name(-1), [numericField]: 1 },
        { kind: "file", name: name(1), [numericField]: 1 },
      ],
      { key, dir: "desc" },
    );
    assert.ok(nameComparisons > 0, `${key} ties should retain the name tiebreaker`);
  }
});
