import assert from "node:assert/strict";
import test from "node:test";
import {
  DIGITS,
  PASSPHRASE_WORDS,
  SYMBOLS,
  UPPERCASE,
  generatePassphrase,
  generatePassword,
  passphraseEntropyBits,
  passwordEntropyBits,
  strengthTier,
} from "../src/modules/dashboard/widgets/builtin/password-generator/passwordGen";

const includesAny = (text: string, pool: string) =>
  Array.from(text).some((char) => pool.includes(char));

test("generatePassword honors length and includes every enabled class", () => {
  for (let i = 0; i < 25; i++) {
    const password = generatePassword({ length: 16, uppercase: true, digits: true, symbols: true });
    assert.equal(password.length, 16);
    assert.ok(includesAny(password, UPPERCASE));
    assert.ok(includesAny(password, DIGITS));
    assert.ok(includesAny(password, SYMBOLS));
  }
});

test("generatePassword excludes disabled classes", () => {
  for (let i = 0; i < 25; i++) {
    const password = generatePassword({ length: 24, uppercase: false, digits: false, symbols: false });
    assert.equal(password.length, 24);
    assert.ok(!includesAny(password, UPPERCASE));
    assert.ok(!includesAny(password, DIGITS));
    assert.ok(!includesAny(password, SYMBOLS));
  }
});

test("generatePassphrase joins words from the wordlist", () => {
  const phrase = generatePassphrase(5);
  const words = phrase.split("-");
  assert.equal(words.length, 5);
  for (const word of words) {
    assert.ok((PASSPHRASE_WORDS as readonly string[]).includes(word));
  }
});

test("entropy estimates and tiers are sane", () => {
  assert.ok(passwordEntropyBits({ length: 8, uppercase: false, digits: false, symbols: false }) < 50);
  assert.ok(passwordEntropyBits({ length: 20, uppercase: true, digits: true, symbols: true }) > 90);
  assert.equal(passphraseEntropyBits(5), Math.round(5 * Math.log2(PASSPHRASE_WORDS.length)));
  assert.equal(strengthTier(30), "weak");
  assert.equal(strengthTier(60), "fair");
  assert.equal(strengthTier(80), "strong");
  assert.equal(strengthTier(120), "excellent");
});
