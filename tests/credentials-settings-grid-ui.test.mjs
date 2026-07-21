import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const settingsSource = await readFile(
  new URL("../src/modules/settings/CredentialsSettings.tsx", import.meta.url),
  "utf8",
);
const settingsStyles = await readFile(
  new URL("../src/modules/settings/settings.css", import.meta.url),
  "utf8",
);

test("AI, email, SMTP, and widget credentials use the shared compact grid", () => {
  assert.match(settingsSource, /storedCredentialGroups\.map[\s\S]*?<CredentialGrid/);
  assert.match(settingsSource, /credentials=\{widgetCredentials\}/);
  assert.match(settingsSource, /className="settings-secret-credential-grid" role="grid"/);
  assert.match(settingsSource, /settings\.credentialColumnName/);
  assert.match(settingsSource, /settings\.credentialColumnDetails/);
  assert.match(settingsSource, /settings\.credentialColumnStatus/);
  assert.doesNotMatch(settingsSource, /function CredentialRow/);

  assert.match(settingsStyles, /\.settings-secret-credential-grid \{/);
  assert.match(settingsStyles, /\.settings-secret-credential-grid-header/);
  assert.match(settingsStyles, /\.settings-secret-credential-grid-row/);
  assert.match(
    settingsStyles,
    /grid-template-columns: minmax\(140px, 1fr\) minmax\(130px, 0\.9fr\) minmax\(115px, 0\.75fr\) 36px/,
  );
});
