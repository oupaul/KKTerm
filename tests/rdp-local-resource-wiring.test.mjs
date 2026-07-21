import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Windows RDP applies the saved selection through the ActiveX drive collection", async () => {
  const source = await read("src-tauri/src/rdp.rs");

  assert.match(source, /drive_collection_get/);
  assert.match(source, /RdpDriveSelection::Selected \{ drives \}/);
  assert.match(source, /redirection_state_put/);
  assert.match(source, /configure_drive_collection\(dispatch, &options\.drive_selection\)/);
  assert.match(source, /"ConnectToAdministerServer"[\s\S]*?options\.administrative_session/);
});

test("IronRDP advertises isolated shared folders and an administrative session", async () => {
  const [cargo, backend, canvas, connector] = await Promise.all([
    read("src-tauri/Cargo.toml"),
    read("src-tauri/src/rdp_client.rs"),
    read("src/modules/workspace/connections/remote-desktop/RdpCanvasView.tsx"),
    read("src-tauri/vendor/ironrdp-russh-061/crates/ironrdp-connector/src/connection.rs"),
  ]);

  assert.match(cargo, /"rdpdr"/);
  assert.match(cargo, /ironrdp-rdpdr-native = "0\.6"/);
  assert.match(backend, /validate_shared_local_folders/);
  assert.match(backend, /validate_rdp_remote_path/);
  assert.match(backend, /MultiRootNixRdpdrBackend/);
  assert.match(backend, /rdp_drive_request_device_id/);
  assert.match(backend, /with_drives\(Some\([\s\S]*?share\.device_id[\s\S]*?share\.name/);
  assert.match(backend, /Rdpsnd::new\(Box::new\(NoopRdpsndBackend\)\)/);
  assert.match(canvas, /sharedLocalFolders: rdpOptions\.redirectDrives[\s\S]*?rdpOptions\.sharedLocalFolders/);
  assert.match(canvas, /administrativeSession: rdpOptions\.administrativeSession/);
  assert.match(connector, /REDIRECTED_SESSION_FIELD_VALID/);
  assert.match(connector, /redirected_session_id: 0/);
});
