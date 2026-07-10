import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KUAIKUAI_FADE_DAYS,
  KuaiKuaiBag,
  kuaiKuaiGrayscale,
} from "../src/modules/itops/KuaiKuaiBag";

const NOW = new Date(2026, 6, 10); // 2026-07-10

test("kuaiKuaiGrayscale stays fresh far from the expiry date", () => {
  assert.equal(kuaiKuaiGrayscale(null, NOW), 0);
  assert.equal(kuaiKuaiGrayscale("", NOW), 0);
  assert.equal(kuaiKuaiGrayscale("someday", NOW), 0);
  assert.equal(kuaiKuaiGrayscale("2027-01-01", NOW), 0);
  // Exactly at the fade window's edge the colors are still untouched.
  assert.equal(kuaiKuaiGrayscale("2026-08-09", NOW), 0);
});

test("kuaiKuaiGrayscale ramps linearly over the fade window", () => {
  // Halfway through the window → half drained.
  assert.equal(kuaiKuaiGrayscale("2026-07-25", NOW), (KUAIKUAI_FADE_DAYS - 15) / KUAIKUAI_FADE_DAYS);
  // The day before expiry is almost fully drained but not yet monochrome.
  const eve = kuaiKuaiGrayscale("2026-07-11", NOW);
  assert.ok(eve > 0.9 && eve < 1, `expected near-1, got ${eve}`);
});

test("kuaiKuaiGrayscale is fully black and white on and after the expiry date", () => {
  assert.equal(kuaiKuaiGrayscale("2026-07-10", NOW), 1);
  assert.equal(kuaiKuaiGrayscale("2026-01-01", NOW), 1);
});

test("KuaiKuaiBag desaturates via a grayscale filter as expiry nears", () => {
  const fresh = renderToStaticMarkup(createElement(KuaiKuaiBag, { expiry: "2999-12-31" }));
  assert.doesNotMatch(fresh, /grayscale/);
  const expired = renderToStaticMarkup(createElement(KuaiKuaiBag, { expiry: "2000-01-01" }));
  assert.match(expired, /filter:grayscale\(100%\)/);
  assert.match(expired, /data-expired/);
});
