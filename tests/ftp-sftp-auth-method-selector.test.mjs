import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/modules/workspace/connections/connection-dialog/FtpConnectionFields.tsx", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /authMethod:\s*"keyFile" \| "password" \| "agent"/,
  "FTP fields should accept the shared SSH auth method for SFTP protocol Connections.",
);

assert.match(
  source,
  /ftpProtocol === "sftp" \? \([\s\S]*role="tablist"[\s\S]*aria-label=\{t\("connections\.auth"\)\}/,
  "SFTP protocol Connections should show the SSH-style auth method selector.",
);

for (const value of ["keyFile", "password", "agent"]) {
  assert.match(
    source,
    new RegExp(`role="tab"[\\s\\S]*onClick=\\{\\(\\) => onAuthMethodChange\\("${value}"\\)\\}`),
    `SFTP auth selector should include a tab button for ${value}.`,
  );
}

assert.match(
  source,
  /ftpProtocol === "sftp" && authMethod === "keyFile" \? \(/,
  "SFTP protocol Connections should show key file fields only when key auth is selected.",
);

assert.match(
  source,
  /ftpProtocol !== "sftp" \|\| authMethod === "password"/,
  "FTP and FTPS protocol Connections should remain password-only.",
);

const sidebarSource = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
  "utf8",
);

assert.match(
  sidebarSource,
  /const nextAuthMethod = nextProtocol === "sftp" \? authMethod : "password"/,
  "Switching FTP protocol away from SFTP should force password auth.",
);
