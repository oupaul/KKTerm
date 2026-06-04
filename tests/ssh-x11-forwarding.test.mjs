import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("managed X server enables SSH X11 forwarding before shell startup", async () => {
  const sshSource = await readFile(new URL("../src-tauri/src/ssh.rs", import.meta.url), "utf8");
  const sessionsSource = await readFile(
    new URL("../src-tauri/src/sessions.rs", import.meta.url),
    "utf8",
  );

  assert.match(sshSource, /pub x11_forwarding: Option<NativeSshX11Forwarding>/);
  assert.match(sshSource, /server_channel_open_x11/);
  assert.match(sshSource, /TcpStream::connect\(\("127\.0\.0\.1", x11_port\(display\)\)\)/);

  const requestOrder = sshSource.indexOf(".request_x11(");
  const shellOrder = sshSource.indexOf(".request_shell(");
  assert.ok(requestOrder > -1, "SSH terminal startup should request X11 forwarding");
  assert.ok(shellOrder > -1, "SSH terminal startup should request a shell");
  assert.ok(requestOrder < shellOrder, "X11 forwarding should be requested before shell startup");

  assert.match(sessionsSource, /NativeSshX11Forwarding/);
  assert.match(sessionsSource, /x11_forwarding:\s+managed_x_server_display\s+\.map/s);
});
