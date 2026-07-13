import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHostTreeRows,
  childHostsOf,
  eligibleParentHosts,
  hostDisplayName,
  parseHostnameList,
} from "../src/modules/itops/hostTree";
import type { SiteHost } from "../src/types";

function host(id: string, hostname: string, parentHostId: string | null = null): SiteHost {
  return {
    id,
    siteId: "s1",
    parentHostId,
    hostname,
    label: "",
    kind: "physical",
    connectionIds: [],
    scan: null,
    notes: "",
    sortOrder: 0,
  };
}

test("parseHostnameList preserves skipped entries for the backend import result", () => {
  const parsed = parseHostnameList(
    "web-01\n  web-02  \n\n# comment line\nWEB-01\nweb-03,web-04\n",
  );
  assert.deepEqual(parsed, ["web-01", "web-02", "", "WEB-01", "web-03", "web-04"]);
  assert.deepEqual(parseHostnameList("   \n# only comments\n"), []);
});

test("hostDisplayName prefers the label and falls back to the hostname", () => {
  assert.equal(hostDisplayName(host("h1", "web-01")), "web-01");
  assert.equal(hostDisplayName({ ...host("h1", "web-01"), label: " Web One " }), "Web One");
});

test("buildHostTreeRows nests children depth-first under their parents", () => {
  const rows = buildHostTreeRows([
    host("dev", "esx-01"),
    host("top", "standalone"),
    host("vm", "vm-01", "dev"),
    host("ct", "ct-01", "vm"),
  ]);
  assert.deepEqual(
    rows.map((row) => [row.host.id, row.depth]),
    [
      ["dev", 0],
      ["vm", 1],
      ["ct", 2],
      ["top", 0],
    ],
  );
  assert.deepEqual(
    childHostsOf(
      [host("dev", "esx-01"), host("vm", "vm-01", "dev"), host("ct", "ct-01", "vm")],
      "dev",
    ).map((child) => child.id),
    ["vm"],
  );
});

test("buildHostTreeRows surfaces orphans and cycle members instead of dropping them", () => {
  const rows = buildHostTreeRows([
    host("orphan", "orphan-01", "missing-parent"),
    // Bad data: a and b point at each other.
    host("a", "loop-a", "b"),
    host("b", "loop-b", "a"),
  ]);
  assert.deepEqual(
    rows.map((row) => row.host.id).sort(),
    ["a", "b", "orphan"],
  );
});

test("eligibleParentHosts excludes the host itself and its descendants", () => {
  const hosts = [
    host("dev", "esx-01"),
    host("vm", "vm-01", "dev"),
    host("ct", "ct-01", "vm"),
    host("other", "other-01"),
  ];
  assert.deepEqual(
    eligibleParentHosts(hosts, "dev").map((candidate) => candidate.id),
    ["other"],
  );
  assert.deepEqual(
    eligibleParentHosts(hosts, "").map((candidate) => candidate.id),
    ["dev", "vm", "ct", "other"],
  );
});
