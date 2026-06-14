import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/modules/workspace/connections/connection-dialog/SshConnectionFields.tsx", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /role="tablist"[\s\S]*aria-label=\{t\("connections\.auth"\)\}/,
  "SSH auth method should render as an accessible tabbed selector.",
);

assert.match(
  source,
  /data-auth-method=\{authMethod\}/,
  "SSH auth selector should expose the selected method for the animated indicator.",
);

for (const value of ["keyFile", "password", "agent"]) {
  assert.match(
    source,
    new RegExp(`role="tab"[\\s\\S]*onClick=\\{\\(\\) => onAuthMethodChange\\("${value}"\\)\\}`),
    `SSH auth selector should include a tab button for ${value}.`,
  );
}

assert.match(
  source,
  /<input\s+name="authMethod"\s+type="hidden"\s+value=\{authMethod\}\s+\/>/,
  "SSH auth selector should keep submitting the selected authMethod value with the form.",
);

assert.doesNotMatch(
  source,
  /<select\s+name="authMethod"/,
  "SSH auth method should not be a dropdown select.",
);

assert.match(source, /LockKeyhole/, "Password auth should have a monochrome lucide icon.");
assert.match(source, /KeyRound/, "Key-file auth should have a monochrome lucide icon.");
assert.match(source, /Fingerprint/, "SSH-agent auth should have a monochrome lucide icon.");

const css = await readFile(
  new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
  "utf8",
);

assert.match(
  css,
  /\.connection-auth-fields \.auth-method-selector::before/,
  "SSH auth selector should use an animated selected-pill indicator.",
);

assert.match(
  css,
  /transition:\s*transform 0\.2s/,
  "SSH auth selector indicator should animate with a Mac-style quick slide.",
);

for (const value of ["keyFile", "password", "agent"]) {
  assert.match(
    css,
    new RegExp(`\\.auth-method-selector\\[data-auth-method="${value}"\\]::before`),
    `SSH auth selector should position the animated indicator for ${value}.`,
  );
}
