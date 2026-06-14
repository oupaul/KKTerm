import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/modules/workspace/connections/connection-dialog/FtpConnectionFields.tsx", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /role="tablist"[\s\S]*aria-label=\{t\("connections\.ftpProtocol"\)\}/,
  "FTP protocol should render as an accessible segmented selector.",
);

assert.match(
  source,
  /data-ftp-protocol=\{ftpProtocol\}/,
  "FTP protocol selector should expose the selected protocol for the animated indicator.",
);

const protocolButtonOrder = [...source.matchAll(/onClick=\{\(\) => onFtpProtocolChange\("([^"]+)"\)\}/g)].map(
  (match) => match[1],
);
assert.deepEqual(
  protocolButtonOrder,
  ["sftp", "ftps", "ftp"],
  "FTP protocol selector should order protocols as SFTP, FTPS, then plain FTP.",
);

for (const value of ["sftp", "ftps", "ftp"]) {
  assert.match(
    source,
    new RegExp(`role="tab"[\\s\\S]*onClick=\\{\\(\\) => onFtpProtocolChange\\("${value}"\\)\\}`),
    `FTP protocol selector should include a tab button for ${value}.`,
  );
}

assert.match(
  source,
  /<input\s+name="ftpProtocol"\s+type="hidden"\s+value=\{ftpProtocol\}\s+\/>/,
  "FTP protocol selector should keep submitting the selected ftpProtocol value with the form.",
);

const sidebarSource = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
  "utf8",
);

assert.match(
  sidebarSource,
  /const \[ftpProtocol, setFtpProtocol\] = useState<"ftp" \| "ftps" \| "sftp">\(\s*initialConnection\?\.ftpOptions\?\.protocol \?\? "sftp",\s*\)/,
  "New FTP Connections should default the protocol selector to SFTP.",
);

assert.match(
  sidebarSource,
  /connectionType === "ftp"\s*\?\s*ftpPortForProtocolSelection\(initialConnection\?\.ftpOptions\?\.protocol \?\? "sftp", ""\)/,
  "New FTP Connections should default the port draft from the selected FTP protocol.",
);

assert.doesNotMatch(
  source,
  /<select\s+name="ftpProtocol"/,
  "FTP protocol should not be a dropdown select.",
);

const css = await readFile(
  new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
  "utf8",
);

assert.match(
  css,
  /\.connection-option-fields \.ftp-protocol-selector::before/,
  "FTP protocol selector should use the shared selected-pill treatment.",
);

assert.match(
  css,
  /\.ftp-protocol-selector button\s*\{[^}]*font-size:\s*11px;/s,
  "FTP protocol selector text should be compact enough to fit the option row.",
);
