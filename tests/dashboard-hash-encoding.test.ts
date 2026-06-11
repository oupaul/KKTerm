import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  bytesToHex,
} from "../src/modules/dashboard/widgets/builtin/hash-workbench/encoding";

test("base64 round-trips UTF-8 text", () => {
  const samples = ["hello", "héllo wörld", "日本語テキスト", "emoji 🚀✨", ""];
  for (const sample of samples) {
    if (!sample) continue;
    assert.equal(decodeBase64(encodeBase64(sample)), sample);
  }
  assert.equal(encodeBase64("hello"), "aGVsbG8=");
});

test("decodeBase64 rejects invalid input", () => {
  assert.equal(decodeBase64("not base64!!!"), null);
  // Valid base64 but invalid UTF-8 bytes.
  assert.equal(decodeBase64("/w=="), null);
});

test("url encoding round-trips and rejects bad escapes", () => {
  const sample = "a b/c?d=e&f=日本";
  assert.equal(decodeUrl(encodeUrl(sample)), sample);
  assert.equal(decodeUrl("%E0%A4%A"), null);
});

test("bytesToHex formats with zero padding", () => {
  assert.equal(bytesToHex(new Uint8Array([0, 1, 255, 16]).buffer), "0001ff10");
});
