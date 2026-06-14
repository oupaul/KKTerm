import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: a dragged/docked or saved-layout SFTP browser used to reopen as an
// SSH terminal because hydration derived the Pane surface from connection.type
// (which is "ssh" for SFTP) instead of the stored Pane kind. The fix honors the
// stored kind first. See "SFTP vs SSH invariant" in docs/ARCHITECTURE.md.

test("layout hydration honors stored Pane kind for SFTP/file-browser Panes", async () => {
  const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

  // serializeLayout must persist the Pane kind for the round-trip to be possible.
  const layoutSource = await readFile(
    new URL("../src/modules/workspace/layout.ts", import.meta.url),
    "utf8",
  );
  assert.match(layoutSource, /kind: pane\.kind/, "serializeLayout should persist pane.kind");

  // The kind-first guard must appear inside buildPaneFromStoredLayoutPane and
  // BEFORE the connection.type === "url" derivation, so an ssh-typed SFTP
  // Connection is rebuilt as a file browser rather than a terminal.
  assert.match(
    storeSource,
    /function buildPaneFromStoredLayoutPane[\s\S]*?if \(storedPane\.kind === "sftp" \|\| storedPane\.kind === "localFiles"\)[\s\S]*?if \(connection\.type === "url"\)/,
    "buildPaneFromStoredLayoutPane must branch on storedPane.kind before connection.type",
  );

  // A legacy sftp-protocol FTP Connection that was stored un-normalized still
  // resolves through the SFTP browser transform.
  assert.match(
    storeSource,
    /storedPane\.kind === "sftp" && connection\.type === "ftp"\s*\?\s*sftpBrowserConnectionFromFtpConnection\(connection\)/,
  );
});

test("SFTP browsers carry an ssh-typed Connection, so kind is the only surface discriminator", async () => {
  const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

  // openSftpBrowser builds a kind:"sftp" Tab from an ssh Connection.
  assert.match(storeSource, /openSftpBrowser: \(connection\) => \{\s*if \(connection\.type !== "ssh"\)/);
  // The FTP->SFTP normalization yields an ssh-typed Connection.
  assert.match(
    storeSource,
    /function sftpBrowserConnectionFromFtpConnection\(connection: Connection\): Connection \{[\s\S]*?type: "ssh"/,
  );
});
