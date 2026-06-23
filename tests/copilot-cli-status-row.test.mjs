import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

test("GitHub Copilot CLI status check button stays inline before status text", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/modules/settings/AiSettings.tsx"), "utf8");
  const css = fs.readFileSync(path.join(repoRoot, "src/modules/settings/settings.css"), "utf8");
  const controlStart = source.indexOf("function GitHubCopilotConnectionControl");
  assert.notEqual(controlStart, -1, "GitHub Copilot connection control should exist.");
  const statusBlockStart = source.indexOf(
    '<div className="settings-cli-backend-status settings-copilot-cli-status">',
    controlStart,
  );
  assert.notEqual(statusBlockStart, -1, "Copilot CLI status block should exist.");
  const statusBlock = source.slice(
    statusBlockStart,
    source.indexOf("{cliStatus && !cliStatus.installed", statusBlockStart),
  );

  assert.ok(
    statusBlock.indexOf('t("settings.aiCliRefreshStatus")') <
      statusBlock.indexOf("{cliStatusText}"),
    "Check status button should render before the Copilot CLI status text.",
  );
  assert.match(
    source.slice(controlStart, statusBlockStart),
    /const cliVersionText = formatCopilotCliVersion\(cliStatus\?\.version\);/,
    "Copilot CLI version display should strip update guidance before rendering.",
  );
  assert.match(
    css,
    /\.settings-copilot-cli-status\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;/s,
    "Copilot CLI status row should lay out the button and status text inline.",
  );
});
