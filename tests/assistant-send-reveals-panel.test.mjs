import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Workspace Send to AI actions reveal the AI Assistant panel", async () => {
  const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const canvasSource = await readFile(
    new URL("../src/modules/workspace/WorkspaceCanvas.tsx", import.meta.url),
    "utf8",
  );
  const terminalSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const remoteDesktopSource = await readFile(
    new URL("../src/modules/workspace/connections/remote-desktop/RemoteDesktopWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const webviewSource = await readFile(
    new URL("../src/modules/workspace/connections/webview/WebViewWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    appSource,
    /<WorkspaceCanvas[\s\S]*?onOpenAssistant=\{openAssistantPanel\}/,
    "App should pass the assistant panel opener to the Workspace canvas",
  );
  assert.match(
    canvasSource,
    /export function WorkspaceCanvas\(\{[\s\S]*?onOpenAssistant[\s\S]*?\}/,
    "WorkspaceCanvas should accept the assistant panel opener",
  );
  assert.match(
    canvasSource,
    /<TerminalWorkspace[\s\S]*?onOpenAssistant=\{onOpenAssistant\}/,
    "terminal Tabs should receive the assistant panel opener",
  );
  assert.match(
    canvasSource,
    /<RemoteDesktopWorkspace[\s\S]*?onOpenAssistant=\{onOpenAssistant\}/,
    "remote desktop Tabs should receive the assistant panel opener",
  );
  assert.match(
    canvasSource,
    /<WebViewWorkspace[\s\S]*?onOpenAssistant=\{onOpenAssistant\}/,
    "URL Tabs should receive the assistant panel opener",
  );
  assert.match(
    terminalSource,
    /async function handleSendBufferToAssistant\(\) \{[\s\S]*?onOpenAssistant\(\);[\s\S]*?\}/,
    "terminal Send to AI should reveal the assistant panel after creating context",
  );
  assert.match(
    remoteDesktopSource,
    /const captureTargetScreenshotForAssistant = async \(\) => \{[\s\S]*?onOpenAssistant\(\);[\s\S]*?\}/,
    "remote desktop Send to AI should reveal the assistant panel after creating context",
  );
  assert.match(
    terminalSource,
    /<WebViewWorkspace[\s\S]*?onOpenAssistant=\{onOpenAssistant\}/,
    "embedded URL Panes should receive the assistant panel opener",
  );
  assert.match(
    webviewSource,
    /async function captureWebviewScreenshotForAssistant\(\) \{[\s\S]*?onOpenAssistant\(\);[\s\S]*?\}/,
    "URL Send to AI should reveal the assistant panel after creating context",
  );
});
