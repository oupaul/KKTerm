import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/modules/workspace/connections/connection-dialog/SshConnectionFields.tsx", import.meta.url),
  "utf8",
);

const sidebarSource = await readFile(
  new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url),
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
  /const \[useTmuxSessionsDraft, setUseTmuxSessionsDraft\] = useState\([\s\S]*initialConnection\?\.useTmuxSessions \?\? sshSettings\.defaultUseTmuxSessions[\s\S]*\)/,
  "per-Connection tmux management should track a draft value defaulted from Settings.",
);

const inheritDefaultsIndex = optionsSection.indexOf('name="sshSocksProxyInheritDefaults"');
const proxyJumpIndex = optionsSection.indexOf('name="proxyJump"');
const tmuxIndex = optionsSection.indexOf('name="useTmuxSessions"');
const compressionIndex = optionsSection.indexOf('name="sshCompression"');
assert.ok(
  inheritDefaultsIndex !== -1 && proxyJumpIndex !== -1 && compressionIndex !== -1 && tmuxIndex !== -1,
  "SSH option fields should include inherit defaults, ProxyJump, compression, and tmux controls.",
);
assert.ok(
  inheritDefaultsIndex < proxyJumpIndex && proxyJumpIndex < compressionIndex && compressionIndex < tmuxIndex,
  "SSH compression should appear below ProxyJump and above per-Connection tmux management.",
);

const keyPathIndex = fieldsSection.indexOf('name="keyPath"');
const keyPassphraseIndex = fieldsSection.indexOf('name="keyPassphrase"');
assert.ok(
  keyPathIndex !== -1 && keyPassphraseIndex > keyPathIndex,
  "key-file authentication should show an optional passphrase field below the key path.",
);

assert.match(
  sidebarSource,
  /kind: "connectionPassphrase"[\s\S]*ownerId: connection\.id[\s\S]*secret: keyPassphrase/,
  "the SSH key passphrase should be stored as a per-Connection secret.",
);

assert.match(
  sidebarSource,
  /request: \{ email, passphrase: keyGenerationPassphrase \|\| undefined \}/,
  "generated SSH keys should receive the optional passphrase from the generation dialog.",
);

assert.match(
  source,
  /const \[sshSocksProxyDraft, setSshSocksProxyDraft\] = useState/,
  "SSH SOCKS proxy input should track its draft value so ProxyJump can be disabled while it has content.",
);

assert.doesNotMatch(
  fieldsSection,
  /startupScriptPreview|ssh-startup-script-preview|ssh-startup-script-empty/,
  "SSH startup script should open in the editor without rendering an inline preview or empty hint underneath.",
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
  /const hasDisplayedSocksProxy = displayedSshSocksProxy\.trim\(\)\.length > 0;/,
  "SOCKS credential fields should track whether the displayed SOCKS server has a value.",
);

assert.match(
  optionsSection,
  /disabled=\{sshInheritsSettingsDefaults \|\| hasProxyJumpOverride \|\| !hasDisplayedSocksProxy\}[\s\S]*name="sshSocksProxyUsername"/,
  "SOCKS proxy username should only be enabled when the SOCKS server field has a value.",
);

assert.match(
  optionsSection,
  /disabled=\{sshInheritsSettingsDefaults \|\| hasProxyJumpOverride \|\| !hasDisplayedSocksProxy\}[\s\S]*name="sshSocksProxyPassword"/,
  "SOCKS proxy password should only be enabled when the SOCKS server field has a value.",
);

assert.match(
  optionsSection,
  /const displayedProxyJump = sshInheritsSettingsDefaults[\s\S]*sshSettings\.defaultProxyJump/,
  "ProxyJump should display the Settings default while Default Options is on.",
);

assert.match(
  optionsSection,
  /const displayedUseTmuxSessions = sshInheritsSettingsDefaults[\s\S]*sshSettings\.defaultUseTmuxSessions/,
  "tmux management should display the Settings default while Default Options is on.",
);

assert.match(
  optionsSection,
  /disabled=\{sshInheritsSettingsDefaults \|\| hasSocksProxyOverride\}[\s\S]*name="proxyJump"/,
  "ProxyJump should be disabled while inheriting defaults or while SOCKS proxy has a value.",
);

assert.match(
  optionsSection,
  /disabled=\{sshInheritsSettingsDefaults\}[\s\S]*name="useTmuxSessions"/,
  "tmux management should be disabled while inheriting defaults.",
);

assert.match(
  optionsSection,
  /<Switch[\s\S]*on=\{sshInheritsSettingsDefaults\}[\s\S]*onChange=\{onInheritsSettingsDefaultsChange\}[\s\S]*<input[\s\S]*name="sshSocksProxyInheritDefaults"[\s\S]*value=\{sshInheritsSettingsDefaults \? "on" : "off"\}/,
  "Default Options should use the shared dialog Switch while preserving its submitted form value.",
);

assert.match(
  optionsSection,
  /<Switch[\s\S]*on=\{displayedUseTmuxSessions\}[\s\S]*disabled=\{sshInheritsSettingsDefaults\}[\s\S]*onChange=\{setUseTmuxSessionsDraft\}[\s\S]*<input[\s\S]*name="useTmuxSessions"[\s\S]*value=\{displayedUseTmuxSessions \? "on" : "off"\}/,
  "tmux management should use the shared dialog Switch while preserving its submitted form value.",
);

assert.match(
  sidebarSource,
  /const sshUsesDefaultOptions = form\.get\("sshSocksProxyInheritDefaults"\) === "on";/,
  "SSH submit handling should treat the legacy inherit field as Default Options mode.",
);

assert.match(
  sidebarSource,
  /const proxyJump =[\s\S]*usesSshDefaults && sshUsesDefaultOptions[\s\S]*sshSettings\.defaultProxyJump/,
  "ProxyJump should be submitted from Settings defaults while Default Options is on.",
);

assert.match(
  sidebarSource,
  /const useTmuxSessions =[\s\S]*usesSshDefaults && sshUsesDefaultOptions[\s\S]*sshSettings\.defaultUseTmuxSessions/,
  "tmux management should be submitted from Settings defaults while Default Options is on.",
);

assert.match(
  sidebarSource,
  /proxyJump: usesSshDefaults \? proxyJump \|\| undefined : undefined/,
  "ProxyJump should only be saved for SSH Connections.",
);

assert.match(
  sidebarSource,
  /sshSocksProxy: usesSshDefaults \? sshSocksProxy \|\| undefined : undefined/,
  "SOCKS proxy should be saved with the displayed value, including Default Options mode.",
);

assert.match(
  css,
  /\.connection-option-fields\s*>\s*label\.connection-proxy-row\s*\{/,
  "proxy option rows should have a dedicated compact label/input layout.",
);

const startupScriptSectionRule = css.match(/\.ssh-startup-script-section\s*\{(?<body>[^}]*)\}/s);
assert.ok(startupScriptSectionRule, "startup script section should have a dedicated layout rule.");
assert.match(
  startupScriptSectionRule.groups.body,
  /border-top:\s*1px solid var\(--hairline\);/,
  "startup script section should have a subtle divider above it.",
);
