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
});

test("IronRDP advertises one contained shared folder over RDPDR", async () => {
  const [cargo, backend, canvas] = await Promise.all([
    read("src-tauri/Cargo.toml"),
    read("src-tauri/src/rdp_client.rs"),
    read("src/modules/workspace/connections/remote-desktop/RdpCanvasView.tsx"),
  ]);

  assert.match(cargo, /"rdpdr"/);
  assert.match(cargo, /ironrdp-rdpdr-native = "0\.6"/);
  assert.match(backend, /validate_shared_local_folder/);
  assert.match(backend, /validate_rdp_remote_path/);
  assert.match(backend, /Rdpdr::new\([\s\S]*?\.with_drives\(Some\(vec!\[\(1, share_name\)\]\)\)/);
  assert.match(backend, /Rdpsnd::new\(Box::new\(NoopRdpsndBackend\)\)/);
  assert.match(canvas, /sharedLocalFolder: rdpOptions\.redirectDrives[\s\S]*?rdpOptions\.sharedLocalFolder/);
});
