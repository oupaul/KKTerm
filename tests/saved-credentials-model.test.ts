import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultMergeTargetId,
  filterSavedCredentials,
  isLegacyConnectionPasswordRow,
  mergeEligibility,
  mergeTargetMustHaveSecret,
  sortSavedCredentials,
} from "../src/modules/settings/savedCredentialsModel";
import type {
  ConnectionPasswordCredentialEntry,
  StoredCredentialSummary,
} from "../src/types";

function entry(overrides: Partial<ConnectionPasswordCredentialEntry>): ConnectionPasswordCredentialEntry {
  return {
    id: "credential-1",
    connectionType: "ssh",
    username: "admin",
    label: "Credential",
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
    usageCount: 0,
    secretExists: true,
    ...overrides,
  };
}

test("legacy per-Connection password rows come only from the connections metadata source", () => {
  const legacy = {
    kind: "connectionPassword",
    metadataSource: "connections",
  } as StoredCredentialSummary;
  const shared = {
    kind: "connectionPassword",
    metadataSource: "connectionPasswordCredentials",
  } as StoredCredentialSummary;
  const url = { kind: "urlPassword", metadataSource: "connections" } as StoredCredentialSummary;

  assert.equal(isLegacyConnectionPasswordRow(legacy), true);
  assert.equal(isLegacyConnectionPasswordRow(shared), false);
  assert.equal(isLegacyConnectionPasswordRow(url), false);
});

test("saved credential search matches label and username case-insensitively", () => {
  const credentials = [
    entry({ id: "a", label: "Corp admin", username: "administrator" }),
    entry({ id: "b", label: "Backup", username: "backup-admin" }),
    entry({ id: "c", label: "Windows", connectionType: "rdp" }),
  ];

  assert.deepEqual(
    filterSavedCredentials(credentials, "CORP").map((credential) => credential.id),
    ["a"],
  );
  assert.deepEqual(
    filterSavedCredentials(credentials, "backup-admin").map((credential) => credential.id),
    ["b"],
  );
  assert.equal(filterSavedCredentials(credentials, "rdp").length, 0);
  assert.deepEqual(
    filterSavedCredentials(credentials, "administrator").map((credential) => credential.id),
    ["a"],
  );
  assert.equal(filterSavedCredentials(credentials, "  ").length, 3);
});

test("saved credentials sort by label with stable fallbacks", () => {
  const credentials = [
    entry({ id: "b", label: "beta" }),
    entry({ id: "a", label: "Alpha" }),
    entry({ id: "c", label: "Alpha", username: "zzz", createdAt: "2026-01-02 00:00:00" }),
  ];
  assert.deepEqual(
    sortSavedCredentials(credentials).map((credential) => credential.id),
    ["a", "c", "b"],
  );
});

test("merge target must keep a stored password when any selected credential has one", () => {
  const withSecret = entry({ id: "a" });
  const withoutSecret = entry({ id: "b", secretExists: false });

  assert.equal(mergeTargetMustHaveSecret([withSecret, withoutSecret]), true);
  assert.equal(
    mergeTargetMustHaveSecret([withoutSecret, entry({ id: "c", secretExists: false })]),
    false,
  );
  assert.equal(defaultMergeTargetId([withoutSecret, withSecret]), "a");
  assert.equal(
    defaultMergeTargetId([withoutSecret, entry({ id: "c", secretExists: false })]),
    "b",
  );
  assert.equal(defaultMergeTargetId([]), "");
});

test("merge requires two or more credentials regardless of their legacy origin type", () => {
  assert.deepEqual(mergeEligibility([entry({ id: "a" })]), { ok: false });
  assert.deepEqual(
    mergeEligibility([entry({ id: "a" }), entry({ id: "b" })]),
    { ok: true },
  );
  assert.deepEqual(
    mergeEligibility([entry({ id: "a" }), entry({ id: "b", connectionType: "rdp" })]),
    { ok: true },
  );
});
