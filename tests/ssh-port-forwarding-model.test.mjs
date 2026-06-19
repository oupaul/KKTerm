import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      verbatimModuleSyntax: true,
    },
  });
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled.outputText)}`);
}

test("SSH forwarding bind conflicts follow address-family and wildcard rules", async () => {
  const { sshForwardBindConflict } = await importTypeScriptModule(
    new URL(
      "../src/modules/workspace/connections/terminal/sshPortForwardingModel.ts",
      import.meta.url,
    ),
  );
  const forwarding = (bind, listenPort, enabled = true, id = `${bind}-${listenPort}`) => ({
    id,
    mode: "L",
    enabled,
    bind,
    listenPort,
    destHost: "localhost",
    destPort: 3000,
  });

  assert.equal(
    sshForwardBindConflict(
      forwarding("127.0.0.1", 8080, true, "candidate"),
      [forwarding("127.0.0.1", 8080, true, "existing")],
    ),
    true,
  );
  assert.equal(sshForwardBindConflict(forwarding("localhost", 8080), [forwarding("127.0.0.1", 8080)]), true);
  assert.equal(sshForwardBindConflict(forwarding("127.0.0.1", 8080), [forwarding("0.0.0.0", 8080)]), true);
  assert.equal(sshForwardBindConflict(forwarding("::1", 8080), [forwarding("::", 8080)]), true);
  assert.equal(sshForwardBindConflict(forwarding("127.0.0.2", 8080), [forwarding("127.0.0.1", 8080)]), false);
  assert.equal(sshForwardBindConflict(forwarding("::1", 8080), [forwarding("0.0.0.0", 8080)]), false);
  assert.equal(sshForwardBindConflict(forwarding("127.0.0.1", 8081), [forwarding("127.0.0.1", 8080)]), false);
  assert.equal(sshForwardBindConflict(forwarding("127.0.0.1", 8080), [forwarding("127.0.0.1", 8080, false)]), false);
  assert.equal(
    sshForwardBindConflict(
      { ...forwarding("0.0.0.0", 8080, true, "remote"), mode: "R" },
      [forwarding("0.0.0.0", 8080, true, "local")],
    ),
    false,
  );
  assert.equal(
    sshForwardBindConflict(
      forwarding("127.0.0.1", 8080, true, "same"),
      [forwarding("127.0.0.1", 8080, true, "same")],
    ),
    false,
  );
});

test("Local forwarding browser URLs infer TLS and replace wildcard binds", async () => {
  const { sshForwardBrowserUrl } = await importTypeScriptModule(
    new URL(
      "../src/modules/workspace/connections/terminal/sshPortForwardingModel.ts",
      import.meta.url,
    ),
  );

  assert.equal(sshForwardBrowserUrl("127.0.0.1", 8080), "http://127.0.0.1:8080");
  assert.equal(sshForwardBrowserUrl("localhost", 443), "https://localhost:443");
  assert.equal(sshForwardBrowserUrl("0.0.0.0", 8443), "https://127.0.0.1:8443");
  assert.equal(sshForwardBrowserUrl("::", 3000), "http://[::1]:3000");
});

test("Remote destination ports match the selected local address and wildcard family", async () => {
  const { localListenerPortOptions } = await importTypeScriptModule(
    new URL(
      "../src/modules/workspace/connections/terminal/sshPortForwardingModel.ts",
      import.meta.url,
    ),
  );
  const listeners = [
    { address: "127.0.0.1", port: 1420 },
    { address: "0.0.0.0", port: 3000 },
    { address: "10.0.0.102", port: 4444 },
    { address: "::", port: 8443 },
    { address: "::1", port: 9000 },
  ];

  assert.deepEqual(localListenerPortOptions("localhost", listeners), ["1420", "3000"]);
  assert.deepEqual(localListenerPortOptions("10.0.0.102", listeners), ["3000", "4444"]);
  assert.deepEqual(localListenerPortOptions("::1", listeners), ["8443", "9000"]);
});

test("Remote rows put the local destination left and server listener right", async () => {
  const { sshForwardDisplayEndpoints } = await importTypeScriptModule(
    new URL(
      "../src/modules/workspace/connections/terminal/sshPortForwardingModel.ts",
      import.meta.url,
    ),
  );

  assert.deepEqual(sshForwardDisplayEndpoints({
    id: "remote",
    mode: "R",
    enabled: true,
    bind: "0.0.0.0",
    listenPort: 4444,
    destHost: "localhost",
    destPort: 1420,
  }), { left: "localhost:1420", right: "0.0.0.0:4444" });
});

test("Remote URLs reject loopback and replace wildcards with the SSH host", async () => {
  const { sshRemoteForwardBrowserUrl } = await importTypeScriptModule(
    new URL(
      "../src/modules/workspace/connections/terminal/sshPortForwardingModel.ts",
      import.meta.url,
    ),
  );

  assert.equal(sshRemoteForwardBrowserUrl("127.0.0.1", 8080, "pb602"), null);
  assert.equal(sshRemoteForwardBrowserUrl("::1", 8443, "pb602"), null);
  assert.equal(sshRemoteForwardBrowserUrl("0.0.0.0", 443, "pb602"), "https://pb602:443");
  assert.equal(sshRemoteForwardBrowserUrl("::", 8443, "fd63::42"), "https://[fd63::42]:8443");
  assert.equal(sshRemoteForwardBrowserUrl("10.0.0.42", 8080, "pb602"), "http://10.0.0.42:8080");
});

test("SSH forwarding starts through the Pane's live Session", async () => {
  const [workspaceSource, dialogSource, tauriSource, sessionsSource, sshSource] = await Promise.all([
    readFile(
      new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/modules/workspace/connections/terminal/SshPortForwardingDialog.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/src/sessions.rs", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/src/ssh.rs", import.meta.url), "utf8"),
  ]);

  assert.match(workspaceSource, /onOpenSshPortForwarding\(pane\.connection, pane\.id, sessionIdRef\.current\)/);
  assert.match(dialogSource, /remotePort:[\s\S]*\bsessionId,/);
  assert.match(tauriSource, /start_ssh_port_forward:[\s\S]*sessionId:\s*string/);
  const startForwardSource = sessionsSource.slice(
    sessionsSource.indexOf("pub fn start_ssh_port_forward"),
    sessionsSource.indexOf("pub fn close_ssh_port_forward"),
  );
  assert.match(startForwardSource, /TerminalTransport::NativeSsh\(session\) => session\.port_forward_handle\(\)/);
  assert.doesNotMatch(startForwardSource, /NativeSshConnectionRequest/);
  assert.match(sshSource, /channel_open_direct_tcpip/);
  assert.match(sshSource, /tcpip_forward/);
  assert.match(sshSource, /server_channel_open_forwarded_tcpip/);
  assert.match(sshSource, /run_live_ssh_dynamic_forward/);
  assert.doesNotMatch(startForwardSource, /Remote and dynamic forwards are saved but not yet supported/);
});
