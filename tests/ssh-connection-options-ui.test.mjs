import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/modules/workspace/connections/connection-dialog/SshConnectionFields.tsx", import.meta.url),
  "utf8",
);

const css = await readFile(
  new URL("../src/modules/workspace/connections/connections.css", import.meta.url),
  "utf8",
);

const fieldsSection = source.slice(
  source.indexOf("export function SshConnectionFields"),
  source.indexOf("export function SshConnectionOptions"),
);
const optionsSection = source.slice(source.indexOf("export function SshConnectionOptions"));

assert.doesNotMatch(
  fieldsSection,
  /name="useTmuxSessions"/,
  "per-Connection tmux management should live in the right-column options panel, not the primary SSH fields.",
);

assert.match(
  optionsSection,
  /name="useTmuxSessions"[\s\S]*defaultChecked=\{initialConnection\?\.useTmuxSessions \?\? sshSettings\.defaultUseTmuxSessions\}/,
  "per-Connection tmux management should default from Settings.",
);

assert.match(
  source,
  /const \[sshSocksProxyDraft, setSshSocksProxyDraft\] = useState/,
  "SSH SOCKS proxy input should track its draft value so ProxyJump can be disabled while it has content.",
);

assert.match(
  source,
  /const \[proxyJumpDraft, setProxyJumpDraft\] = useState/,
  "ProxyJump input should track its draft value so SOCKS proxy can be disabled while it has content.",
);

assert.match(
  optionsSection,
  /disabled=\{sshInheritsSettingsDefaults \|\| hasProxyJumpOverride\}[\s\S]*name="sshSocksProxy"/,
  "SOCKS proxy should be disabled while inheriting defaults or while ProxyJump has a value.",
);

assert.match(
  optionsSection,
  /disabled=\{hasSocksProxyOverride\}[\s\S]*name="proxyJump"/,
  "ProxyJump should be disabled while SOCKS proxy has a value.",
);

assert.match(
  css,
  /\.connection-option-fields\s*>\s*label\.connection-proxy-row\s*\{/,
  "proxy option rows should have a dedicated compact label/input layout.",
);
