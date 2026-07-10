import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_QUICK_SELECT_MATCHES,
  findQuickSelectMatches,
  labelQuickSelectMatches,
  quickSelectLabels,
} from "../src/modules/workspace/connections/terminal/quickSelect";

test("finds URLs, IPs, hashes, UUIDs, and paths on the visible screen", () => {
  const lines = [
    "fetching https://example.com/pkg.tar.gz done",
    "listening on 192.168.1.20:8080",
    "commit 3f2a19b4c8d0e1f2a3b4c5d6e7f8091a2b3c4d5e (HEAD)",
    "request id 123e4567-e89b-12d3-a456-426614174000 failed",
    "wrote /var/log/kkterm/session.log and C:\\Temp\\out.txt",
  ];
  const texts = findQuickSelectMatches(lines).map((match) => match.text);
  assert.ok(texts.includes("https://example.com/pkg.tar.gz"));
  assert.ok(texts.includes("192.168.1.20:8080"));
  assert.ok(texts.includes("3f2a19b4c8d0e1f2a3b4c5d6e7f8091a2b3c4d5e"));
  assert.ok(texts.includes("123e4567-e89b-12d3-a456-426614174000"));
  assert.ok(texts.includes("/var/log/kkterm/session.log"));
  assert.ok(texts.includes("C:\\Temp\\out.txt"));
});

test("a URL claims its span so the IP inside it is not matched twice", () => {
  const matches = findQuickSelectMatches(["open http://10.0.0.1:9000/status now"]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].text, "http://10.0.0.1:9000/status");
});

test("matches are ordered bottom-up so recent output gets short labels first", () => {
  const matches = findQuickSelectMatches(["first 10.0.0.1", "second 10.0.0.2"]);
  assert.equal(matches[0].text, "10.0.0.2");
  assert.equal(matches[1].text, "10.0.0.1");
});

test("labels are unique two-letter prefixes-free codes", () => {
  const labels = quickSelectLabels(MAX_QUICK_SELECT_MATCHES);
  assert.equal(new Set(labels).size, MAX_QUICK_SELECT_MATCHES);
  for (const label of labels) {
    assert.match(label, /^[a-z]{2}$/);
  }
});

test("labelQuickSelectMatches pairs each match with a label", () => {
  const labeled = labelQuickSelectMatches(findQuickSelectMatches(["ping 10.0.0.1 and 10.0.0.2"]));
  assert.equal(labeled.length, 2);
  assert.notEqual(labeled[0].label, labeled[1].label);
});

test("plain prose produces no matches", () => {
  assert.equal(findQuickSelectMatches(["the quick brown fox jumps over the lazy dog"]).length, 0);
});
