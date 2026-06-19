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
