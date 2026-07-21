import assert from "node:assert/strict";
import test from "node:test";

import { nextConnectionDuplicateName } from "../src/modules/workspace/connections/duplicateConnection";

test("connection duplicate names use the next #N suffix", () => {
  const names = ["Bastion", "Bastion#2", "Bastion#4", "Other"];

  assert.equal(nextConnectionDuplicateName("Bastion", names), "Bastion#5");
  assert.equal(nextConnectionDuplicateName("Bastion#2", names), "Bastion#5");
  assert.equal(nextConnectionDuplicateName("Database", names), "Database#2");
});
