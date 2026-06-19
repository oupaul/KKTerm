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
  assert.match(source, /invokeCommand\("list_remote_loopback_ports", \{/);
  assert.doesNotMatch(source, /\.filter\(\(networkInterface\) => networkInterface\.isUp\)/);
  assert.match(source, /\["127\.0\.0\.1", "0\.0\.0\.0", \.\.\.localInterfaceAddresses\]/);
  assert.match(source, /mode === "L" && isLoopbackHost\(current\.destHost\).*remoteLoopbackPorts\.map\(String\)/s);
  assert.match(source, /function EditableDropdownInput\(/);
  assert.match(source, /options\.map\(\(option\) =>/);
  assert.match(source, /<EditableDropdownInput[\s\S]*?options=\{bindAddressOptions\}/);
  assert.match(source, /<EditableDropdownInput[\s\S]*?options=\{destinationPortOptions\}/);
  assert.doesNotMatch(source, /<datalist\b|\blist=\{/);
});

test("Remote mode reverses headings without moving its field groups", async () => {
  const source = await readFile(dialogUrl, "utf8");

  assert.match(
    source,
    /mode === "R" \? t\("terminal\.forwardTo"\) : t\("terminal\.localListener"\)[\s\S]*?<Field label=\{t\("terminal\.bindAddress"\)\}>/,
  );
  assert.match(
    source,
    /mode === "R" \? t\("terminal\.remoteListener"\) : t\("terminal\.destination"\)[\s\S]*?<Field label=\{t\("terminal\.host"\)\}>/,
  );
});

test("SSH forwarding inputs use the themed surface color", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(
    css,
    /\.sshf-pair \.kk-inp\s*\{[^}]*background:\s*var\(--surface\);[^}]*\}/,
  );
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
