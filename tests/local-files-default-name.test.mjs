import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("File Explorer creation defaults to the selected folder basename when no name is typed", async () => {
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );
  const fieldsSource = await readFile(
    new URL("../src/modules/workspace/connections/connection-dialog/LocalFilesConnectionFields.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../src/modules/workspace/connections/sftp/sftp.css", import.meta.url),
    "utf8",
  );
  const connectionsManual = await readFile(
    new URL("../docs/manual/03-connections.md", import.meta.url),
    "utf8",
  );
  const localeDirectory = new URL("../src/i18n/locales/", import.meta.url);
  const localeFiles = (await readdir(localeDirectory)).filter((file) => file.endsWith(".json"));

  assert.match(sidebarSource, /function localFilesDefaultNameForDirectory\(/);
  assert.match(sidebarSource, /t\("connections\.homeDirectory"\)/);
  assert.match(sidebarSource, /const \[localFilesHomeDirectory, setLocalFilesHomeDirectory\] = useState\(""\);/);
  assert.match(sidebarSource, /invokeCommand\("list_local_places", undefined\)[\s\S]*setLocalFilesHomeDirectory\(places\.home\?\.path \?\? ""\)/);
  assert.match(
    sidebarSource,
    /connectionType === "localFiles"[\s\S]*\? requestedName \|\| localFilesDefaultNameForDirectory\(localStartupDirectory, t, localFilesHomeDirectory\)/,
    "submitting a File Explorer Connection without an explicit name should derive the name from the selected startup directory",
  );
  assert.match(fieldsSource, /nameValue: string;/);
  assert.match(fieldsSource, /onNameChange: \(value: string\) => void;/);
  assert.match(
    css,
    /\.sftp-toolbar\.workspace-toolbar[\s\S]*padding: 3px 6px 1px 14px;/,
    "the File Explorer/SFTP titlebar content should be visually nudged down without changing toolbar height",
  );
  assert.match(
    connectionsManual,
    /File Explorer Add\/Edit Connection uses `connections\.localFilesRootDirectory`[\s\S]*`connections\.homeDirectory`[\s\S]*folder name becomes the default Connection name/,
    "the shipped manual should document the File Explorer default naming rule",
  );
  for (const localeFile of localeFiles) {
    const locale = JSON.parse(await readFile(new URL(localeFile, localeDirectory), "utf8"));
    assert.equal(typeof locale.connections.homeDirectory, "string", `${localeFile} should localize connections.homeDirectory`);
    assert.notEqual(locale.connections.homeDirectory, locale.connections.localFiles, `${localeFile} should keep Home Directory distinct from File Explorer`);
  }
});

test("File Explorer toolbar titles use the saved Connection name instead of localhost", async () => {
  const utilsSource = await readFile(
    new URL("../src/modules/workspace/connections/utils.tsx", import.meta.url),
    "utf8",
  );
  const storeSource = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

  assert.match(
    utilsSource,
    /export function connectionToolbarTitle\(connection: Connection\)[\s\S]*?if \(connection\.type === "localFiles"\) \{[\s\S]*?return connection\.name;/,
    "shared toolbar titles should use the saved File Explorer Connection name",
  );
  assert.match(
    storeSource,
    /function toolbarTitleForConnection\(connection: Connection\)[\s\S]*?if \(connection\.type === "localFiles"\) \{[\s\S]*?return connection\.name;/,
    "workspace tabs should use the saved File Explorer Connection name",
  );
});

test("legacy blank-home File Explorer rows display as Home Directory", async () => {
  const sidebarSource = await readFile(
    new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sidebarSource, /function connectionTreeDisplayName\(connection: Connection, t: TFunction\)/);
  assert.match(
    sidebarSource,
    /connection\.type === "localFiles"[\s\S]*!connection\.localStartupDirectory\?\.trim\(\)[\s\S]*return t\("connections\.homeDirectory"\)/,
    "legacy default File Explorer rows pointing at home should display the localized Home Directory name",
  );
  assert.match(sidebarSource, /<strong>\{connectionTreeDisplayName\(connection, i18next\.t\)\}<\/strong>/);
});

test("macOS File Explorer locations dedupe duplicate visible drives", async () => {
  const backendSource = await readFile(
    new URL("../src-tauri/src/sftp.rs", import.meta.url),
    "utf8",
  );

  assert.match(backendSource, /let mut seen_visible_drives = std::collections::HashSet::new\(\);/);
  assert.match(
    backendSource,
    /let visible_key = \(label\.to_lowercase\(\), total_bytes, disk\.available_space\(\)\);[\s\S]*!seen_visible_drives\.insert\(visible_key\)/,
    "macOS drive listing should collapse duplicate APFS mount reports that share the same visible label and capacity",
  );
});
