import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceSource = await readFile(
  new URL("../src/modules/workspace/connections/remote-desktop/RemoteDesktopWorkspace.tsx", import.meta.url),
  "utf8",
);
const canvasSource = await readFile(
  new URL("../src/modules/workspace/connections/remote-desktop/RdpCanvasView.tsx", import.meta.url),
  "utf8",
);

test("IronRDP canvas sessions report lifecycle to the workspace controller", () => {
  assert.match(canvasSource, /onSessionConnected\?: \(sessionId: string\) => void;/);
  assert.match(canvasSource, /onSessionDisconnected\?: \(sessionId: string\) => void;/);
  assert.match(canvasSource, /onSessionConnected\?\.\(sessionId\);/);
  assert.match(canvasSource, /onSessionDisconnected\?\.\(sessionId\);/);
  assert.match(workspaceSource, /onSessionConnected=\{handleRdpCanvasConnected\}/);
  assert.match(workspaceSource, /onSessionDisconnected=\{handleRdpCanvasDisconnected\}/);
});

test("assistant remote-desktop tools use IronRDP client commands for canvas RDP", () => {
  assert.match(
    workspaceSource,
    /if \(useRdpCanvas\) \{\s*await sendRdpCanvasText\(requireRdpCanvasSessionId\(\), text, pressEnter\);/s,
  );
  assert.match(
    workspaceSource,
    /if \(useRdpCanvas\) \{\s*await sendRdpCanvasKeyPress\(requireRdpCanvasSessionId\(\), key\);/s,
  );
  assert.match(workspaceSource, /sendRdpCanvasMouseClick\(requireRdpCanvasSessionId\(\), x, y, button\)/);
  assert.match(workspaceSource, /invokeCommand\("send_rdp_client_text"/);
  assert.match(workspaceSource, /invokeCommand\("send_rdp_client_key_event"/);
  assert.match(workspaceSource, /invokeCommand\("send_rdp_client_pointer_event"/);
  assert.match(workspaceSource, /invokeCommand\("send_rdp_client_ctrl_alt_delete"/);
});

test("assistant composer direct-send registers an RDP text sender for canvas RDP", () => {
  assert.match(
    workspaceSource,
    /if \(!useRdpCanvas \|\| !paneId \|\| !isTauriRuntime\(\)\) \{\s*return;\s*\}/s,
  );
  assert.match(workspaceSource, /registerRdpTextSender\(paneId, sender\);/);
  assert.match(workspaceSource, /sendRdpCanvasText\(requireRdpCanvasSessionId\(\), text, pressEnter\)/);
});
