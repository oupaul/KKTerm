import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/modules/settings/GeneralSettings.tsx", "utf8");

assert.match(
  source,
  /function explicitPortFromProxyValue\(value: string\)[\s\S]*authority\.startsWith\("\["\)[\s\S]*authority\.match\(\s*\/\^\\\[\[\^\\\]\]\+\\\]:\(\\d\+\)\$\/\s*\)/,
  "General proxy settings must extract explicit ports from raw bracketed IPv6 authorities.",
);

assert.match(
  source,
  /port:\s*explicitPortFromProxyValue\(value\)/,
  "Manual proxy editor must preserve explicit default ports such as :80 and :443 instead of using URL.port.",
);
