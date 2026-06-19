import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dialogUrl = new URL(
  "../src/modules/workspace/connections/terminal/SshPortForwardingDialog.tsx",
  import.meta.url,
);
const cssUrl = new URL(
  "../src/modules/workspace/connections/terminal/terminal.css",
  import.meta.url,
);

test("SSH forwarding fields use unfiltered editable dropdowns for detected suggestions", async () => {
  const source = await readFile(dialogUrl, "utf8");

  assert.match(source, /invokeCommand\("network_interfaces", undefined\)/);
  assert.match(source, /invokeCommand\("list_local_tcp_listeners", undefined\)/);
  assert.match(source, /invokeCommand\("list_remote_network_addresses", \{[\s\S]*?sessionId,[\s\S]*?\}\)/);
  assert.match(source, /invokeCommand\("list_remote_loopback_ports", \{/);
  assert.doesNotMatch(source, /\.filter\(\(networkInterface\) => networkInterface\.isUp\)/);
  assert.match(source, /mode === "R" \? remoteInterfaceAddresses : localInterfaceAddresses/);
  assert.match(source, /mode === "L" && isLoopbackHost\(current\.destHost\).*remoteLoopbackPorts\.map\(String\)/s);
  assert.match(source, /localListenerPortOptions\(current\.destHost, localTcpListeners\)/);
  assert.match(source, /function EditableDropdownInput\(/);
  assert.match(source, /options\.map\(\(option\) =>/);
  assert.match(source, /<EditableDropdownInput[\s\S]*?options=\{bindAddressOptions\}/);
  assert.match(source, /<EditableDropdownInput[\s\S]*?options=\{destinationPortOptions\}/);
  assert.doesNotMatch(source, /<datalist\b|\blist=\{/);
});

test("Remote mode assigns the local destination and remote listener to the correct machines", async () => {
  const source = await readFile(dialogUrl, "utf8");

  assert.match(
    source,
    /mode === "R"[\s\S]*?t\("terminal\.forwardTo"\)[\s\S]*?value=\{current\.destHost\}[\s\S]*?value=\{current\.destPort\}/,
  );
  assert.match(
    source,
    /mode === "R"[\s\S]*?t\("terminal\.remoteListener"\)[\s\S]*?value=\{current\.bind\}[\s\S]*?value=\{current\.listenPort\}/,
  );
  assert.match(source, /mode === "R" \? `\$\{current\.destHost\}:\$\{current\.destPort\}` : `\$\{current\.bind\}:\$\{current\.listenPort\}`/);
  assert.match(source, /mode === "R" \? `\$\{current\.bind\}:\$\{current\.listenPort\}` : `\$\{current\.destHost\}:\$\{current\.destPort\}`/);
});

test("Remote forwarding defaults to a wildcard IPv4 listener", async () => {
  const source = await readFile(dialogUrl, "utf8");

  assert.match(source, /R:\s*\{ bind: "0\.0\.0\.0"/);
});

test("enabled Local forwarding bind text opens in the external browser", async () => {
  const source = await readFile(dialogUrl, "utf8");

  assert.match(source, /import \{[^}]*openExternalUrl[^}]*\} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/tauri"/);
  assert.match(source, /forwarding\.mode === "L" && forwarding\.enabled/);
  assert.match(source, /sshForwardBrowserUrl\(forwarding\.bind, forwarding\.listenPort\)/);
  assert.match(source, /className="sa-local sa-endpoint-link"/);
});

test("enabled reachable Remote listeners render on the right and open externally", async () => {
  const source = await readFile(dialogUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");

  assert.match(source, /sshForwardDisplayEndpoints\(forwarding\)/);
  assert.match(source, /sshRemoteForwardBrowserUrl\(forwarding\.bind, forwarding\.listenPort, connection\.host\)/);
  assert.match(source, /forwarding\.mode === "R" && forwarding\.enabled && remoteUrl/);
  assert.match(source, /className="sa-remote sa-endpoint-link"/);
  assert.match(css, /\.sa-endpoint-link/);
});

test("SSH forwarding dialog uses a top-right close button as its only dismiss action", async () => {
  const source = await readFile(dialogUrl, "utf8");

  assert.match(source, /<Sheet[\s\S]*?onClose=\{onClose\}/);
  assert.doesNotMatch(source, /cancel=\{<Btn onClick=\{onClose\}>/);
});

test("SSH forwarding inputs use the themed surface color", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(
    css,
    /\.sshf-pair \.kk-inp\s*\{[^}]*background:\s*var\(--surface\);[^}]*\}/,
  );
});

test("SSH forwarding Listening chips use the shared green status token", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(css, /\.sshf-listen-chip\s*\{[^}]*background:\s*var\(--green\);/s);
});

test("SSH forwarding dropdowns portal below the input outside dialog clipping", async () => {
  const source = await readFile(dialogUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");

  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /createPortal\([\s\S]*?document\.body/);
  assert.match(source, /anchorBounds\.bottom \+ gap/);
  assert.match(source, /window\.addEventListener\("scroll", positionMenu, true\)/);
  assert.match(
    css,
    /\.sshf-editable-dropdown-menu\s*\{[^}]*position:\s*fixed;[^}]*top:\s*0;[^}]*left:\s*0;[^}]*width:\s*300px;[^}]*max-height:\s*min\(240px, 40vh\);[^}]*overflow-y:\s*auto;/s,
  );
  assert.doesNotMatch(css, /bottom:\s*calc\(100% \+ 5px\)/);
  assert.match(
    css,
    /\.sshf-editable-dropdown-menu button\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*normal;/s,
  );
  assert.doesNotMatch(
    css,
    /\.sshf-editable-dropdown-menu button\s*\{[^}]*text-overflow:\s*ellipsis;/s,
  );
});

test("SSH forwarding port options include common protocol names", async () => {
  const source = await readFile(dialogUrl, "utf8");

  assert.match(source, /80:\s*"HTTP"/);
  assert.match(source, /443:\s*"HTTPS"/);
  assert.match(source, /optionLabel=\{formatPortOption\}/);
  assert.match(source, /`\$\{value\} \(\$\{protocol\}\)`/);
});

test("SSH forwarding rows persist an enabled switch before delete", async () => {
  const source = await readFile(dialogUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");

  assert.match(source, /Actions, Btn, DIcon, Field, Sheet, Switch, TextInput/);
  assert.match(source, /enabled:\s*true,/);
  assert.match(source, /async function handleToggleForwarding\(/);
  assert.match(source, /enabled:\s*nextEnabled/);
  assert.match(source, /await persist\(next\)/);
  assert.match(source, /nextEnabled[\s\S]*?startForward\(updatedForwarding\)/);
  assert.match(source, /close_ssh_port_forward/);
  assert.match(
    source,
    /<Switch[\s\S]*?on=\{forwarding\.enabled\}[\s\S]*?<button className="sa-del danger"/,
  );
  assert.match(source, /forwarding\.enabled \? t\("terminal\.active"\) : t\("terminal\.disabled"\)/);
  assert.match(
    css,
    /\.sa-row\s*\{[^}]*grid-template-columns:[^;]*38px 24px;/s,
  );
});
