import assert from "node:assert/strict";
import test from "node:test";
import {
  formatIPv4,
  parseIPv4,
  parseSubnetQuery,
  smallestCoveringCidr,
} from "../src/modules/dashboard/widgets/builtin/subnet-calculator/subnetMath";

test("parseIPv4 round-trips dotted quads", () => {
  assert.equal(parseIPv4("0.0.0.0"), 0);
  assert.equal(parseIPv4("255.255.255.255"), 0xffffffff);
  assert.equal(formatIPv4(parseIPv4("192.168.1.42")!), "192.168.1.42");
  assert.equal(parseIPv4("256.0.0.1"), null);
  assert.equal(parseIPv4("1.2.3"), null);
  assert.equal(parseIPv4("1.2.3.4.5"), null);
  assert.equal(parseIPv4("a.b.c.d"), null);
});

test("parseSubnetQuery handles a /24 CIDR", () => {
  const info = parseSubnetQuery("192.168.1.130/24");
  assert.ok(info);
  assert.equal(info.kind, "cidr");
  assert.equal(info.prefix, 24);
  assert.equal(info.network, "192.168.1.0");
  assert.equal(info.broadcast, "192.168.1.255");
  assert.equal(info.firstHost, "192.168.1.1");
  assert.equal(info.lastHost, "192.168.1.254");
  assert.equal(info.netmask, "255.255.255.0");
  assert.equal(info.wildcard, "0.0.0.255");
  assert.equal(info.usableHosts, 254);
});

test("parseSubnetQuery accepts dotted masks via slash or space", () => {
  const slash = parseSubnetQuery("10.0.0.0/255.255.240.0");
  const space = parseSubnetQuery("10.0.0.0 255.255.240.0");
  assert.ok(slash && space);
  assert.equal(slash.prefix, 20);
  assert.equal(space.prefix, 20);
  assert.equal(slash.usableHosts, 4094);
  // Non-contiguous masks are rejected.
  assert.equal(parseSubnetQuery("10.0.0.0/255.0.255.0"), null);
});

test("parseSubnetQuery handles /31, /32, and /0 edge prefixes", () => {
  const p31 = parseSubnetQuery("10.0.0.0/31");
  assert.ok(p31);
  assert.equal(p31.usableHosts, 2);
  assert.equal(p31.firstHost, "10.0.0.0");
  assert.equal(p31.lastHost, "10.0.0.1");

  const p32 = parseSubnetQuery("10.0.0.7/32");
  assert.ok(p32);
  assert.equal(p32.usableHosts, 1);
  assert.equal(p32.network, "10.0.0.7");
  assert.equal(p32.broadcast, "10.0.0.7");

  const p0 = parseSubnetQuery("1.2.3.4/0");
  assert.ok(p0);
  assert.equal(p0.network, "0.0.0.0");
  assert.equal(p0.broadcast, "255.255.255.255");
  assert.equal(p0.usableHosts, 2 ** 32 - 2);
});

test("parseSubnetQuery derives the smallest covering CIDR from a range", () => {
  const info = parseSubnetQuery("10.0.0.5 - 10.0.0.200");
  assert.ok(info);
  assert.equal(info.kind, "range");
  assert.equal(info.prefix, 24);
  assert.equal(info.network, "10.0.0.0");

  const exact = parseSubnetQuery("10.0.0.0-10.0.0.255");
  assert.ok(exact);
  assert.equal(exact.prefix, 24);

  const single = parseSubnetQuery("10.0.0.9-10.0.0.9");
  assert.ok(single);
  assert.equal(single.prefix, 32);
});

test("smallestCoveringCidr is order-independent", () => {
  const a = parseIPv4("172.16.3.9")!;
  const b = parseIPv4("172.16.0.1")!;
  assert.deepEqual(smallestCoveringCidr(a, b), smallestCoveringCidr(b, a));
  assert.equal(smallestCoveringCidr(a, b).prefix, 22);
});

test("parseSubnetQuery rejects incomplete or junk input", () => {
  assert.equal(parseSubnetQuery(""), null);
  assert.equal(parseSubnetQuery("192.168.1.0"), null);
  assert.equal(parseSubnetQuery("192.168.1.0/"), null);
  assert.equal(parseSubnetQuery("192.168.1.0/33"), null);
  assert.equal(parseSubnetQuery("hello/24"), null);
  assert.equal(parseSubnetQuery("10.0.0.1 -"), null);
});
