#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const source = await readFile("src/modules/workspace/connections/terminal/quickCommandLibrary.ts", "utf8");
const dialogSource = await readFile("src/modules/workspace/connections/terminal/QuickCommandBar.tsx", "utf8");
const dialogCss = await readFile("src/app/ui/dialog/dialogs.css", "utf8");

for (const category of [
  "aiAgents",
  "developerWorkflow",
  "containersKubernetes",
  "linuxAdministration",
  "macosAdministration",
]) {
  assert.match(source, new RegExp(`categoryKey:\\s*"terminal\\.quickCommandLibrary\\.categories\\.${category}"`));
}

for (const subcategory of [
  "codingAgents",
  "autonomousAgents",
  "git",
  "packageManagersRuntimes",
  "docker",
  "dockerCompose",
  "kubectl",
  "servicesLogs",
  "packages",
  "softwareUpdate",
  "networking",
  "launchdPower",
  "preferences",
]) {
  assert.match(source, new RegExp(`terminal\\.quickCommandLibrary\\.subcategories\\.${subcategory}`));
}

assert.doesNotMatch(source, /systemAdministrator/);
assert.match(source, /entry\("ai-codex-mcp-context7"/);
assert.match(source, /entry\("macos-pmset-repeat-wake"/);
assert.match(source, /entry\("ai-claude-native-install", "aiAgents", "codingAgents", "aiClaudeNativeInstall", "curl -fsSL https:\/\/claude.ai\/install.sh \| bash", "Package", "purple"\)/);
assert.match(source, /entry\("dev-brew-docker", "developerWorkflow", "packageManagersRuntimes", "devBrewDocker", "brew install --cask docker-desktop", "Container", "blue"\)/);
assert.match(source, /entry\("linux-apt-install-docker", "linuxAdministration", "packages", "linuxAptInstallDocker", "sudo apt install docker-ce docker-compose-plugin", "Package", "blue"\)/);
assert.match(source, /entry\("container-docker-stop", "containersKubernetes", "docker", "containerDockerStop", "docker stop <container>", "XCircle", "red", true, false\)/);
assert.match(source, /entry\("container-kubectl-logs", "containersKubernetes", "kubectl", "containerKubectlLogs", "kubectl logs -f <pod>", "List", "indigo", false, false\)/);
assert.match(source, /entry\("macos-defaults-write", "macosAdministration", "preferences", "macosDefaultsWrite", "defaults write <domain> <key> <value>", "Settings", "amber", true, false\)/);
assert.match(dialogSource, /entry\.confirm \? "danger"/);
assert.match(dialogSource, /quickCommandsDangerous/);
assert.match(dialogSource, /onRunCommand\(commandFromLibrary\(entry, t\)\)/);
assert.match(dialogSource, /quickCommandsAddCommand/);
assert.match(dialogSource, /quickCommandsLibraryAction/);
assert.match(dialogSource, /@radix-ui\/react-tabs/);
assert.match(dialogSource, /RadixTabs\.Root/);
assert.match(dialogSource, /RadixTabs\.Trigger/);
assert.doesNotMatch(dialogSource, /quick-command-add-menu/);
assert.match(dialogSource, /height=\{640\}/);
assert.match(dialogCss, /\.kk-qc-lib-entry\.danger/);
assert.match(dialogCss, /kk-qc-lib-tab\[data-state="active"\]/);
