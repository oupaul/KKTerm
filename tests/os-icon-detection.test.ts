import assert from "node:assert/strict";
import test from "node:test";
import {
  OS_ICON_ENTRIES,
  isKnownOsIconId,
  isOsIconRef,
  osIconIdForDetection,
  osIconIdFromRef,
  osIconRefForId,
} from "../src/lib/osIcons";

test("os icon refs round-trip and reject unknown ids", () => {
  assert.equal(osIconRefForId("ubuntu"), "os:ubuntu");
  assert.equal(osIconIdFromRef("os:ubuntu"), "ubuntu");
  assert.equal(isOsIconRef("os:debian"), true);
  assert.equal(osIconIdFromRef("os:not-a-real-distro"), null);
  assert.equal(osIconIdFromRef("material:folder-server"), null);
  assert.equal(osIconIdFromRef(null), null);
});

test("os-release ID maps to the matching distro logo", () => {
  assert.equal(osIconIdForDetection({ id: "ubuntu" }), "ubuntu");
  assert.equal(osIconIdForDetection({ id: "debian" }), "debian");
  assert.equal(osIconIdForDetection({ id: "rhel" }), "redhat");
  assert.equal(osIconIdForDetection({ id: "rocky" }), "rockylinux");
  assert.equal(osIconIdForDetection({ id: "almalinux" }), "almalinux");
  assert.equal(osIconIdForDetection({ id: "raspbian" }), "raspberrypi");
  assert.equal(osIconIdForDetection({ id: "opensuse-leap" }), "opensuse");
  assert.equal(osIconIdForDetection({ id: "amzn" }), "redhat");
});

test("ID_LIKE parents resolve when the exact id is unknown", () => {
  assert.equal(osIconIdForDetection({ id: "customdistro", idLike: "ubuntu debian" }), "ubuntu");
  assert.equal(osIconIdForDetection({ id: "myrhelclone", idLike: "rhel fedora" }), "redhat");
});

test("unknown linux distro falls back to the generic tux icon", () => {
  assert.equal(osIconIdForDetection({ id: "homegrown", kernel: "Linux" }), "linux");
  assert.equal(osIconIdForDetection({ id: "homegrown" }), "linux");
});

test("kernel name maps non-linux platforms", () => {
  assert.equal(osIconIdForDetection({ kernel: "Darwin" }), "apple");
  assert.equal(osIconIdForDetection({ kernel: "FreeBSD" }), "freebsd");
  assert.equal(osIconIdForDetection({ kernel: "OpenBSD" }), "openbsd");
  assert.equal(osIconIdForDetection({ kernel: "Linux" }), "linux");
  assert.equal(osIconIdForDetection({}), null);
});

test("every detection result resolves to a bundled icon entry", () => {
  const samples = [
    { id: "ubuntu" },
    { id: "rhel" },
    { id: "weird", idLike: "arch" },
    { id: "weird" },
    { kernel: "Darwin" },
  ];
  for (const sample of samples) {
    const iconId = osIconIdForDetection(sample);
    assert.ok(iconId && isKnownOsIconId(iconId), `expected known icon for ${JSON.stringify(sample)}`);
  }
});

test("every catalog entry id is a known icon", () => {
  for (const entry of OS_ICON_ENTRIES) {
    assert.ok(isKnownOsIconId(entry.id), `entry ${entry.id} not registered`);
  }
});
