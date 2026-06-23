import assert from "node:assert/strict";
import test from "node:test";
import { assignLanes, maxLane } from "../src/modules/git/lane";
import type { GitCommit } from "../src/modules/git/gitTypes";

function commit(id: string, parents: string[]): GitCommit {
  return {
    id,
    shortId: id.slice(0, 7),
    parents,
    authorName: "Tester",
    authorEmail: "t@example.com",
    subject: id,
    body: "",
    isoDate: "",
    when: "",
    refs: [],
  };
}

test("assignLanes keeps linear history in a single lane", () => {
  const result = assignLanes([
    commit("a", ["b"]),
    commit("b", ["c"]),
    commit("c", []),
  ]);
  assert.deepEqual(result.map((c) => c.lane), [0, 0, 0]);
  assert.equal(maxLane(result), 0);
});

test("assignLanes routes a branch + merge onto separate lanes", () => {
  // m is a merge of a and b, both forked from base.
  const result = assignLanes([
    commit("m", ["a", "b"]),
    commit("a", ["base"]),
    commit("b", ["base"]),
    commit("base", []),
  ]);
  const lanes = Object.fromEntries(result.map((c) => [c.id, c.lane]));
  assert.equal(lanes.m, 0, "merge commit takes the first lane");
  assert.equal(lanes.a, 0, "first parent continues the merge lane");
  assert.equal(lanes.b, 1, "second parent opens its own lane");
  assert.equal(lanes.base, 0, "lanes converge back at the shared ancestor");
  assert.equal(maxLane(result), 1);
});

test("assignLanes does not reuse a lane reserved for a not-yet-seen parent", () => {
  // While a's parent (deep) is several rows down in lane 1, an unrelated commit
  // c must not be assigned lane 1 and cross that pending edge.
  const result = assignLanes([
    commit("m", ["a", "deep"]),
    commit("a", ["c"]),
    commit("c", ["deep"]),
    commit("deep", []),
  ]);
  const lanes = Object.fromEntries(result.map((c) => [c.id, c.lane]));
  // c continues a's lane (0); the reserved lane 1 stays held for `deep`.
  assert.equal(lanes.a, 0);
  assert.equal(lanes.c, 0);
  assert.notEqual(lanes.c, 1, "c must not land on the reserved merge-parent lane");
});
