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
      forwarding("127.0.0.1", 8080, true, "same"),
      [forwarding("127.0.0.1", 8080, true, "same")],
    ),
    false,
  );
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
});
