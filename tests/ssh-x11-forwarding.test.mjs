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

test("remote X11 forwarding rejection keeps SSH shell open and reports rejected status", async () => {
  const sshSource = await readFile(new URL("../src-tauri/src/ssh.rs", import.meta.url), "utf8");
  const sessionsSource = await readFile(
    new URL("../src-tauri/src/sessions.rs", import.meta.url),
    "utf8",
  );
  const tauriSource = await readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8");
  const terminalSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    sshSource,
    /pub enum NativeSshX11ForwardingStatus \{\s*Enabled,\s*Rejected,\s*\}/s,
    "native SSH startup should expose whether requested X11 forwarding was accepted or rejected",
  );
  assert.match(
    sshSource,
    /match channel\s+\.request_x11[\s\S]*?\.await\s*\{\s*Ok\(\(\)\) => NativeSshX11ForwardingStatus::Enabled,\s*Err\(error\) => \{/s,
    "X11 request failure should be handled locally instead of aborting shell startup",
  );
  assert.match(
    sshSource,
    /eprintln!\("SSH X11 forwarding request rejected: \{error\}"\);\s*NativeSshX11ForwardingStatus::Rejected/s,
    "X11 request rejection should be reported as rejected",
  );
  assert.match(
    sessionsSource,
    /let x11_forwarding_status = session\.x11_forwarding_status\(\);[\s\S]*?x11_forwarding_status,/s,
    "session startup result should carry the native SSH X11 forwarding status",
  );
  assert.match(
    tauriSource,
    /x11ForwardingStatus\?: "enabled" \| "rejected";/,
    "frontend command type should expose X11 forwarding status",
  );
  assert.match(
    terminalSource,
    /updateOpenTerminalPaneX11ForwardingStatus\(\s*tabId,\s*pane\.id,\s*result\.x11ForwardingStatus \?\? x11ForwardingStatus,\s*\)/s,
    "frontend should store rejected X11 status from startup result for the Pane toolbar",
  );
});

test("SSH tmux toolbar tag shows dim X11 forwarding state", async () => {
  const terminalSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const terminalStyles = await readFile(
    new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
    "utf8",
  );

  assert.match(
    terminalSource,
    /const x11ForwardingStatus = pane\.x11ForwardingStatus \?\? \(\s*pane\.connection\?\.type === "ssh" && sshSettings\.managedXServerEnabled \? "enabled" : "disabled"\s*\);/s,
    "the toolbar indicator should snapshot whether the SSH Session started with X11 forwarding enabled",
  );
  assert.match(
    terminalSource,
    /className=\{`tmux-x11-indicator \$\{x11ForwardingStatus\}`\}/,
    "the tmux tag should render a conditional X11 indicator before its label",
  );
  assert.match(
    terminalSource,
    /<span>tmux \{sessionId\}<\/span>/,
    "the X11 indicator should sit to the left of the tmux session label",
  );
  assert.match(
    terminalStyles,
    /\.tmux-x11-indicator\.disabled\s*\{[^}]*color:\s*#7f8a98;[^}]*opacity:\s*0\.45;/s,
    "disabled X11 forwarding should render as dim grey",
  );
  assert.match(
    terminalStyles,
    /\.tmux-x11-indicator\.enabled\s*\{[^}]*color:\s*#5ee787;[^}]*opacity:\s*0\.62;/s,
    "enabled X11 forwarding should render as a subtle dim green",
  );
  assert.match(
    terminalStyles,
    /\.tmux-x11-indicator\.rejected\s*\{[^}]*color:\s*#ff6b6b;[^}]*opacity:\s*0\.72;/s,
    "rejected X11 forwarding should render as dim red",
  );
});
