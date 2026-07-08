import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertTechnicalProps(source, label) {
  assert.match(source, /technicalInputProps/, `${label} should use the shared technical input props`);
}

const helper = read("src/lib/inputBehavior.ts");
assert.match(helper, /autoCorrect:\s*"off"/, "technical inputs should disable OS autocorrect");
assert.match(helper, /autoCapitalize:\s*"off"/, "technical inputs should disable OS capitalization");
assert.match(helper, /spellCheck:\s*false/, "technical inputs should disable spellcheck");

const dialogPrimitives = read("src/app/ui/dialog/Sheet.tsx");
assertTechnicalProps(dialogPrimitives.match(/export function TextInput[\s\S]*?\n\}/)?.[0] ?? "", "dialog TextInput");
assertTechnicalProps(dialogPrimitives.match(/export function TextArea[\s\S]*?\n\}/)?.[0] ?? "", "dialog TextArea");

const sshFields = read("src/modules/workspace/connections/connection-dialog/SshConnectionFields.tsx");
assertTechnicalProps(sshFields.match(/name="host"[\s\S]*?\/>/)?.[0] ?? "", "SSH host field");
assertTechnicalProps(sshFields.match(/name="user"[\s\S]*?\/>/)?.[0] ?? "", "SSH user field");
assertTechnicalProps(sshFields.match(/name="keyPath"[\s\S]*?\/>/)?.[0] ?? "", "SSH key path field");

const passwordFields = read("src/modules/workspace/connections/connection-dialog/ConnectionPasswordFields.tsx");
assertTechnicalProps(passwordFields.match(/<input[\s\S]*?type="password"[\s\S]*?\/>/)?.[0] ?? "", "connection password field");

const connectionSidebar = read("src/modules/workspace/connections/ConnectionSidebar.tsx");
assert.match(
  connectionSidebar,
  /mode === "quick"[\s\S]*\{renderConnectionTypeFields\(\)\}/,
  "Quick Connect dialog should render the shared connection type fields",
);
assert.match(
  connectionSidebar.match(/case "ssh":[\s\S]*?<SshConnectionFields[\s\S]*?\/>/)?.[0] ?? "",
  /SshConnectionFields/,
  "Quick Connect SSH fields should reuse the shared SSH connection fields",
);

const quickCommands = read("src/modules/workspace/connections/terminal/QuickCommandBar.tsx");
assertTechnicalProps(quickCommands.match(/id=\{commandInputId\}[\s\S]*?\/>/)?.[0] ?? "", "Quick Command command field");
assertTechnicalProps(quickCommands.match(/id=\{`\$\{commandInputId\}-ai`\}[\s\S]*?\/>/)?.[0] ?? "", "Quick Command AI prompt field");

const subnet = read("src/modules/dashboard/widgets/builtin/subnet-calculator/SubnetCalculatorWidget.tsx");
assertTechnicalProps(subnet.match(/className="dw-subnet-input"[\s\S]*?\/>/)?.[0] ?? "", "subnet calculator input");

const dns = read("src/modules/dashboard/widgets/builtin/dns-lookup/DnsLookupWidget.tsx");
assertTechnicalProps(dns.match(/className="dw-dns-input"[\s\S]*?\/>/)?.[0] ?? "", "DNS lookup input");
